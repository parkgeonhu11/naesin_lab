"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import SchoolCard from "@/components/SchoolCard";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

/**
 * 처음 온 사람용 튜토리얼 (게임 튜토리얼처럼 1분짜리)
 *  1. 환영  2. 학교·학년 고르기  3. 화면 둘러보기(메뉴를 하나씩 비춰 줌)  4. 첫 문제 같이 풀기  → '첫걸음' 배지
 * 진행 상태는 이 브라우저(localStorage)에 저장하고, 끝내면 계정에도 기록한다(finish_tutorial).
 */
const KEY = "nl-tour-v1";
const START_EVENT = "nl-tour-start";
const SKIP_PATHS = ["/login", "/admin", "/privacy", "/terms", "/account-delete"];
/** 이미 이만큼 푼 사람은 자동으로 튜토리얼을 띄우지 않는다 (내 정보에서 다시 볼 수 있음) */
const AUTO_MAX_SOLVED = 3;

type Step = "welcome" | "school" | "tour" | "problem" | "done";
type Saved = { step: Step; stop: number; no?: number | null; done?: boolean };
type Graded = { correct?: boolean; points?: number; penalty?: number; already?: boolean; reveal?: boolean };

const STEPS: Step[] = ["welcome", "school", "tour", "problem", "done"];
const STEP_NAME: Record<Step, string> = { welcome: "시작", school: "학교·학년", tour: "화면 둘러보기", problem: "첫 문제", done: "끝" };

const STOPS: { sel: string; fallback?: string; title: string; text: string }[] = [
  { sel: '.side-nav a[href="/problems"], .tabbar a[href="/problems"]', title: "문제", text: "과목·단원별 문제가 전부 여기 있어. 맞히면 난이도에 따라 5~20점을 받아." },
  { sel: '.side-nav a[href="/exam"], .tabbar a[href="/exam"]', title: "시험지", text: "범위를 고르면 실제 시험처럼 여러 문제를 한 번에 풀 수 있어." },
  { sel: '.side-nav a[href="/review"], .tabbar a[href="/review"]', title: "오답 노트", text: "틀린 문제만 모아서 다시 풀 수 있어. 시험 전에 여기부터 보면 좋아." },
  { sel: '.side-nav a[href="/ranking"], .tabbar a[href="/ranking"]', title: "랭킹", text: "모은 점수로 전체·우리 학교 순위를 볼 수 있어. 참여는 자유야." },
  { sel: '.side-nav a[href="/mock"]', fallback: ".menu-btn", title: "예상 시험", text: "시간을 재고 보는 모의 시험이야. 휴대폰에서는 오른쪽 위 메뉴(☰) 안에 있어." },
  { sel: ".side .me-card, .top-me", title: "내 정보", text: "내 점수·레벨·약점 단원을 보는 곳이야. 학교·학년도 여기서 바꿀 수 있어." },
];

function load(): Saved | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
function save(s: Saved | null) {
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch {}
}

/** 내 정보 화면의 '튜토리얼 다시 보기' 버튼에서 부른다 */
export function startTutorial() {
  save({ step: "welcome", stop: 0 });
  window.dispatchEvent(new Event(START_EVENT));
}

/** 화면에 실제로 보이는 첫 번째 요소 */
function visible(sel: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

function Progress({ step }: { step: Step }) {
  const i = STEPS.indexOf(step);
  return (
    <div className="tour-progress" aria-label={`튜토리얼 ${Math.min(i + 1, 4)} / 4 단계`}>
      {STEPS.slice(0, 4).map((s, k) => <span key={s} className={k < i ? "on" : k === i ? "now" : ""} title={STEP_NAME[s]} />)}
      <small>{Math.min(i + 1, 4)} / 4 · {STEP_NAME[step]}</small>
    </div>
  );
}

export default function Tutorial() {
  const path = usePathname();
  const router = useRouter();
  const { ready, user, isAnon, nickname, school, grade } = useMe();
  const [st, setSt] = useState<Saved | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [mini, setMini] = useState(false);

  const go = useCallback((next: Saved | null) => { setSt(next); save(next); }, []);

  // 처음 켤 때: 저장된 진행 상태 이어가기, 없으면 계정 상태를 보고 자동 시작
  useEffect(() => {
    if (!ready || !user || !nickname) return;
    const saved = load();
    if (saved?.done) return;
    if (saved) { setSt(saved); return; }
    let off = false;
    sb().rpc("my_tutorial").then(({ data }) => {
      if (off) return;
      const t = (data ?? {}) as { done?: boolean; solved?: number };
      if (t.done) save({ step: "done", stop: 0, done: true });
      else if ((t.solved ?? 0) < AUTO_MAX_SOLVED) go({ step: "welcome", stop: 0 });
    }, () => {});
    return () => { off = true; };
  }, [ready, user, nickname, go]);

  // '다시 보기'
  useEffect(() => {
    const on = () => { setGraded(null); setMsg(""); setSt(load()); };
    window.addEventListener(START_EVENT, on);
    return () => window.removeEventListener(START_EVENT, on);
  }, []);

  // 첫 문제 채점 결과 듣기
  useEffect(() => {
    if (st?.step !== "problem") return;
    const on = (e: Event) => setGraded((e as CustomEvent<Graded>).detail);
    window.addEventListener("nl-graded", on);
    return () => window.removeEventListener("nl-graded", on);
  }, [st?.step]);

  // 첫 문제 안내 카드가 문제(제출 버튼)를 가리지 않게 아래 여백을 준다
  const docked = st?.step === "problem" && !st.done;
  useEffect(() => {
    document.body.classList.toggle("tour-docked", docked && !mini);
    return () => document.body.classList.remove("tour-docked");
  }, [docked, mini]);

  // 둘러보기: 비출 메뉴 위치 따라가기
  const stop = st?.step === "tour" ? STOPS[st.stop] : null;
  useLayoutEffect(() => {
    if (!stop) { setRect(null); return; }
    const find = () => {
      const el = visible(stop.sel) ?? (stop.fallback ? visible(stop.fallback) : null);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    find();
    const t = setTimeout(find, 250);
    window.addEventListener("resize", find);
    window.addEventListener("scroll", find, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", find); window.removeEventListener("scroll", find, true); };
  }, [stop, path]);

  if (!st || st.done || SKIP_PATHS.some((p) => path.startsWith(p))) return null;

  const finish = async (completed: boolean) => {
    if (user) await sb().rpc("finish_tutorial", { p_completed: completed }).then(() => {}, () => {});
  };
  const skip = async () => {
    go({ step: "done", stop: 0, done: true });
    await finish(false);
  };
  const toProblem = async () => {
    setBusy(true);
    setMsg("");
    const { data, error } = await sb().rpc("tutorial_problem");
    setBusy(false);
    if (error) { setMsg(friendly(error)); return; }
    const no = (data as number | null) ?? null;
    setGraded(null);
    if (!no) { go({ step: "done", stop: 0 }); await finish(true); return; }
    go({ step: "problem", stop: 0, no });
    router.push(`/problem/${no}`);
  };
  const toDone = async () => {
    go({ step: "done", stop: 0 });
    await finish(true);
  };
  const skipBtn = <button type="button" className="tour-skip" onClick={skip}>건너뛰기</button>;

  // ---------- 1. 환영 ----------
  if (st.step === "welcome") {
    return (
      <div className="tour-bg" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="tour-card center">
          <Progress step="welcome" />
          <div className="tour-hero" aria-hidden="true">👋</div>
          <h2 id="tour-title">내신랩에 온 걸 환영해!</h2>
          <p>학교 시험 대비 문제를 풀고, 점수를 모아서 친구들과 랭킹을 겨루는 곳이야. <b>1분</b>이면 사용법을 다 알 수 있어.</p>
          <ul className="tour-list">
            <li>학교·학년 고르기</li>
            <li>어디에 뭐가 있는지 둘러보기</li>
            <li>쉬운 문제 하나 같이 풀어 보기</li>
          </ul>
          <div className="tour-actions">
            {skipBtn}
            <button type="button" className="btn big" onClick={() => go({ step: "school", stop: 0 })}>튜토리얼 시작</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 2. 학교·학년 ----------
  if (st.step === "school") {
    const set = !!school && !!grade;
    return (
      <div className="tour-bg" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="tour-card wide">
          <Progress step="school" />
          <h2 id="tour-title">어느 학교 몇 학년이야?</h2>
          <p>내 학년 문제를 먼저 보여 주고, 우리 학교 랭킹도 따로 볼 수 있어. 모르는 사람에게 보이는 건 학교 이름과 학년뿐이야.</p>
          <SchoolCard title={set ? "저장됐어. 바꾸려면 다시 골라" : "학교와 학년을 골라 줘"} compact />
          <div className="tour-actions">
            <button type="button" className="tour-skip" onClick={() => go({ step: "tour", stop: 0 })}>나중에 할게</button>
            <button type="button" className="btn big" disabled={!set} onClick={() => go({ step: "tour", stop: 0 })}>다음</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 3. 화면 둘러보기 ----------
  if (st.step === "tour" && stop) {
    const pad = 6;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    const cardW = Math.min(320, vw - 32);
    let tipStyle: React.CSSProperties = { left: (vw - cardW) / 2, top: vh / 2 - 100, width: cardW };
    if (rect) {
      const below = rect.bottom + 14 + 190 < vh;
      const sideRoom = rect.right + 16 + cardW < vw && rect.left < vw / 3;
      if (sideRoom) tipStyle = { left: rect.right + 16, top: Math.max(16, Math.min(rect.top - 10, vh - 220)), width: cardW };
      else tipStyle = {
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - cardW / 2, vw - cardW - 16)),
        ...(below ? { top: rect.bottom + 14 } : { bottom: vh - rect.top + 14 }),
        width: cardW,
      };
    }
    const last = st.stop === STOPS.length - 1;
    return (
      <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="tour-block" />
        {rect
          ? <div className="tour-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
          : <div className="tour-dim" />}
        <div className="tour-card tip" style={tipStyle}>
          <Progress step="tour" />
          <h2 id="tour-title">{stop.title} <small className="faint">{st.stop + 1}/{STOPS.length}</small></h2>
          <p>{stop.text}</p>
          <div className="tour-actions">
            {st.stop > 0
              ? <button type="button" className="tour-skip" onClick={() => go({ ...st, stop: st.stop - 1 })}>이전</button>
              : skipBtn}
            {last
              ? <button type="button" className="btn" disabled={busy} onClick={toProblem}>{busy ? "문제 찾는 중…" : "첫 문제 풀러 가기"}</button>
              : <button type="button" className="btn" onClick={() => go({ ...st, stop: st.stop + 1 })}>다음</button>}
          </div>
          {msg && <div className="small no">{msg}</div>}
        </div>
      </div>
    );
  }

  // ---------- 4. 첫 문제 같이 풀기 (화면 아래 안내 카드, 문제는 그대로 풀 수 있음) ----------
  if (st.step === "problem") {
    const here = st.no != null && path === `/problem/${st.no}`;
    const ok = graded?.correct;
    const finished = ok || graded?.reveal || graded?.already;
    return (
      <aside className={`tour-dock${mini ? " mini" : ""}`} aria-live="polite" aria-label="튜토리얼 안내">
        <div className="tour-dock-head">
          <Progress step="problem" />
          <button type="button" className="tour-skip" onClick={() => setMini(!mini)} aria-expanded={!mini}>{mini ? "안내 펼치기" : "접기"}</button>
        </div>
        {!mini && <>
        {!here && !finished && (
          <>
            <b>첫 문제가 기다리고 있어</b>
            <div className="tour-actions">
              {skipBtn}
              {st.no != null && <Link className="btn" href={`/problem/${st.no}`}>문제로 돌아가기</Link>}
            </div>
          </>
        )}
        {here && !graded && (
          <>
            <b>쉬운 문제 하나 같이 풀어 보자</b>
            <ul className="tour-list small">
              <li>보기를 고르고 <b>제출</b>을 눌러. 이 문제는 <b>기초</b>라서 맞히면 <b>+5점</b>이야.</li>
              <li>틀려도 괜찮아. <b>첫 오답은 감점이 없고</b>, 두 번째 오답부터 배점의 25%가 깎여.</li>
              <li>한 번이라도 틀린 뒤 맞히면 점수는 절반이야.</li>
              <li>정말 모르겠으면 <b>정답 보기</b>로 넘어가도 돼 (0점).</li>
            </ul>
            <div className="tour-actions">{skipBtn}</div>
          </>
        )}
        {graded && !finished && (
          <>
            <b>아깝다! {graded.penalty ? `${graded.penalty}점 깎였어.` : "첫 오답이라 감점은 없어."}</b>
            <div className="small muted">다른 보기를 골라서 다시 제출해 봐. 모르겠으면 정답 보기를 눌러도 돼.</div>
            <div className="tour-actions">{skipBtn}</div>
          </>
        )}
        {finished && (
          <>
            <b>{ok ? (graded?.points ? `맞았어! +${graded.points}점 받았어` : "맞았어!") : graded?.reveal ? "정답을 확인했어. 이렇게 넘기면 0점이야" : "이미 끝낸 문제였어"}</b>
            <div className="small muted">아래 해설까지 읽으면 완벽해. 이렇게 하나씩 풀면서 점수를 모으면 돼.</div>
            <div className="tour-actions">
              <button type="button" className="btn" onClick={toDone}>튜토리얼 마치기</button>
            </div>
          </>
        )}
        </>}
      </aside>
    );
  }

  // ---------- 끝: 첫걸음 배지 ----------
  if (st.step === "done") {
    const close = () => go({ step: "done", stop: 0, done: true });
    return (
      <div className="tour-bg" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="tour-card center">
          <div className="first-step-badge big" aria-hidden="true">첫걸음</div>
          <h2 id="tour-title">튜토리얼 끝! 첫걸음 배지를 받았어</h2>
          <p>배지는 내 정보에서 볼 수 있어. 사용법이 헷갈리면 내 정보 맨 아래에서 튜토리얼을 다시 볼 수 있어.</p>
          {user && isAnon ? (
            <>
              <p className="small muted">지금은 게스트라 기록이 이 브라우저에만 저장돼. 로그인하면 기록을 그대로 옮겨서 어느 기기에서든 이어 할 수 있어.</p>
              <div className="tour-actions">
                <button type="button" className="tour-skip" onClick={close}>게스트로 계속하기</button>
                <Link className="btn" href="/login" onClick={close}>로그인하고 기록 지키기</Link>
              </div>
            </>
          ) : (
            <div className="tour-actions">
              <button type="button" className="tour-skip" onClick={close}>닫기</button>
              <Link className="btn" href="/problems" onClick={close}>문제 풀러 가기</Link>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

/** 내 정보 화면: 첫걸음 배지 + 튜토리얼 다시 보기 */
export function TutorialCard() {
  const { user } = useMe();
  const [badge, setBadge] = useState(false);
  useEffect(() => {
    if (!user) return;
    sb().rpc("my_tutorial").then(({ data }) => setBadge(!!(data as { badge?: boolean } | null)?.badge), () => {});
  }, [user]);
  return (
    <section className="panel panel-body tour-me">
      {badge ? <span className="first-step-badge" title="튜토리얼을 끝까지 마쳤어">첫걸음</span> : null}
      <div className="grow">
        <b>{badge ? "첫걸음 배지를 갖고 있어" : "사용법이 헷갈려?"}</b>
        <div className="small muted">{badge ? "튜토리얼을 끝까지 마친 사람이 받는 배지야." : "1분짜리 튜토리얼을 끝까지 하면 첫걸음 배지를 받아."}</div>
      </div>
      <button type="button" className="btn line" onClick={() => { startTutorial(); window.scrollTo({ top: 0 }); }}>튜토리얼 다시 보기</button>
    </section>
  );
}
