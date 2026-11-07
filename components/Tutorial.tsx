"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import SchoolCard from "@/components/SchoolCard";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { IS_PREVIEW } from "@/lib/supabase";

/**
 * 처음 온 사람용 튜토리얼 (게임 튜토리얼처럼 1분짜리)
 *  1. 환영  2. 학교·학년 고르기  3. 화면 둘러보기(메뉴를 하나씩 비춰 줌)  4. 첫 문제 같이 풀기  → '첫걸음' 배지
 * 진행 상태는 이 브라우저(localStorage)에 저장하고, 끝내면 계정에도 기록한다(finish_tutorial).
 * 휴대폰에서는 화면 아래에서 올라오는 짧은 카드로, 글자 수를 줄여서 보여 준다.
 */
const KEY = "nl-tour-v1";
const START_EVENT = "nl-tour-start";
const SKIP_PATHS = ["/login", "/admin", "/privacy", "/terms", "/account-delete"];
/** 이미 이만큼 푼 사람은 자동으로 튜토리얼을 띄우지 않는다 (내 정보에서 다시 볼 수 있음) */
const AUTO_MAX_SOLVED = 3;
const MOBILE = "(max-width: 1000px)";

type Step = "welcome" | "school" | "tour" | "problem" | "done";
type Saved = { step: Step; stop: number; no?: number | null; done?: boolean };
type Graded = { correct?: boolean; points?: number; penalty?: number; already?: boolean; reveal?: boolean };
type Stop = { sel: string; title: string; text: string };

const STEPS: Step[] = ["welcome", "school", "tour", "problem"];

/** 컴퓨터: 왼쪽 메뉴를 하나씩 */
const PC_STOPS: Stop[] = [
  { sel: '.side-nav a.side-main[href="/"]', title: "홈", text: "오늘 할 것만 모아 둔 곳이야. 5문제면 오늘 분량 끝." },
  { sel: '.side-nav a[href="/learn"]', title: "공부", text: "개념 카드부터 차근차근 배우는 곳이야." },
  { sel: '.side-sub a[href="/problems"]', title: "문제", text: "과목·단원별 문제가 여기 다 있어. 맞히면 5~20점." },
  { sel: '.side-sub a[href="/review"]', title: "오답 노트", text: "틀린 문제만 모아서 다시 풀어." },
  { sel: '.side-nav a.side-main[href="/ranking"]', title: "랭킹", text: "이번 주 점수로 순위를 겨뤄. 매주 월요일에 새로 시작해." },
  { sel: ".side .me-card", title: "내 정보", text: "점수와 약한 단원을 봐." },
];
/** 휴대폰: 아래 탭 위주로 */
const M_STOPS: Stop[] = [
  { sel: '.tabbar a[href="/"]', title: "홈", text: "오늘 할 것만 모아 둔 곳이야." },
  { sel: '.tabbar a[href="/learn"]', title: "공부", text: "개념부터 차근차근 배우는 곳이야." },
  { sel: '.tabbar a[href="/problems"]', title: "시험 대비", text: "문제·시험지·오답 노트가 여기 다 있어." },
  { sel: '.tabbar a[href="/ranking"]', title: "랭킹", text: "이번 주 점수로 순위를 겨뤄." },
  { sel: ".menu-btn", title: "전체 메뉴", text: "내 정보와 설정은 여기 있어." },
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

function useMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = matchMedia(MOBILE);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

/** 진행 막대 (4칸) */
function Dots({ step }: { step: Step }) {
  const i = STEPS.indexOf(step);
  return (
    <div className="tour-progress" aria-label={`튜토리얼 ${i + 1} / 4 단계`}>
      {STEPS.map((s, k) => <span key={s} className={k < i ? "on" : k === i ? "now" : ""} />)}
    </div>
  );
}

export default function Tutorial() {
  const path = usePathname();
  const router = useRouter();
  const mobile = useMobile();
  const { ready, user, isAnon, nickname, school, grade } = useMe();
  const [st, setSt] = useState<Saved | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(false);

  const go = useCallback((next: Saved | null) => { setSt(next); save(next); }, []);
  const STOPS = (mobile ? M_STOPS : PC_STOPS).filter((x) => IS_PREVIEW || !x.sel.includes("/learn"));

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
    const on = () => { setGraded(null); setMsg(""); setRules(false); setSt(load()); };
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
    document.body.classList.toggle("tour-docked", docked);
    return () => document.body.classList.remove("tour-docked");
  }, [docked]);

  // 둘러보기: 비출 메뉴 위치 따라가기 (휴대폰↔컴퓨터 전환으로 칸 수가 줄면 마지막 칸으로)
  const stopIdx = st?.step === "tour" ? Math.min(st.stop, STOPS.length - 1) : -1;
  const stop = stopIdx >= 0 ? STOPS[stopIdx] : null;
  useLayoutEffect(() => {
    if (!stop) { setRect(null); return; }
    const find = () => {
      const el = visible(stop.sel);
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
    setRules(false);
    if (!no) { go({ step: "done", stop: 0 }); await finish(true); return; }
    go({ step: "problem", stop: 0, no });
    router.push(`/problem/${no}`);
  };
  const toDone = async () => {
    go({ step: "done", stop: 0 });
    await finish(true);
  };
  const skipBtn = <button type="button" className="tour-skip" onClick={skip}>건너뛰기</button>;
  /** 휴대폰은 아래에서 올라오는 카드, 컴퓨터는 가운데 카드 */
  const modal = (children: React.ReactNode, extra = "") => (
    <div className={`tour-bg${mobile ? " sheet" : ""}`} role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className={`tour-card ${extra}`}>{children}</div>
    </div>
  );

  // ---------- 1. 환영 ----------
  if (st.step === "welcome") {
    return modal(
      <>
        <Dots step="welcome" />
        <h2 id="tour-title">내신랩에 온 걸 환영해!</h2>
        {mobile
          ? <p>문제 풀고 점수 모으는 곳이야. <b>1분</b>만 같이 둘러보자.</p>
          : <>
              <p>학교 시험 대비 문제를 풀고, 점수를 모아서 친구들과 랭킹을 겨루는 곳이야. <b>1분</b>이면 사용법을 다 알 수 있어.</p>
              <ul className="tour-list">
                <li>학교·학년 고르기</li>
                <li>어디에 뭐가 있는지 둘러보기</li>
                <li>쉬운 문제 하나 같이 풀어 보기</li>
              </ul>
            </>}
        <div className="tour-actions">
          {skipBtn}
          <button type="button" className="btn big" onClick={() => go({ step: "school", stop: 0 })}>시작하기</button>
        </div>
      </>,
      "center",
    );
  }

  // ---------- 2. 학교·학년 ----------
  if (st.step === "school") {
    const set = !!school && !!grade;
    return modal(
      <>
        <Dots step="school" />
        <h2 id="tour-title">어느 학교 몇 학년이야?</h2>
        {!mobile && <p>내 학년 문제를 먼저 보여 주고, 우리 학교 랭킹도 볼 수 있어. 다른 사람에게는 학교 이름과 학년만 보여.</p>}
        <SchoolCard title="" compact />
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={() => go({ step: "tour", stop: 0 })}>나중에</button>
          <button type="button" className="btn big" disabled={!set} onClick={() => go({ step: "tour", stop: 0 })}>다음</button>
        </div>
      </>,
      mobile ? "" : "wide",
    );
  }

  // ---------- 3. 화면 둘러보기 ----------
  if (st.step === "tour" && stop) {
    const last = stopIdx === STOPS.length - 1;
    const pad = mobile ? 3 : 6;
    let tipStyle: React.CSSProperties | undefined;
    if (!mobile) {
      const vw = window.innerWidth, vh = window.innerHeight, cardW = 300;
      tipStyle = rect
        ? { left: rect.right + 16, top: Math.max(16, Math.min(rect.top - 10, vh - 200)), width: cardW }
        : { left: (vw - cardW) / 2, top: vh / 2 - 90, width: cardW };
    } else if (rect && rect.top < window.innerHeight / 2) {
      // 위쪽(메뉴 버튼)을 비출 때는 카드를 그 아래에
      tipStyle = { top: rect.bottom + 12, bottom: "auto" };
    }
    const nav = (
      <div className="tour-actions">
        {stopIdx > 0
          ? <button type="button" className="tour-skip" onClick={() => go({ ...st, stop: stopIdx - 1 })}>이전</button>
          : skipBtn}
        {last
          ? <button type="button" className="btn" disabled={busy} onClick={toProblem}>{busy ? "찾는 중…" : "첫 문제 풀기"}</button>
          : <button type="button" className="btn" onClick={() => go({ ...st, stop: stopIdx + 1 })}>다음</button>}
      </div>
    );
    return (
      <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="tour-block" />
        {rect
          ? <div className="tour-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
          : <div className="tour-dim" />}
        <div className={`tour-card tip${mobile ? " m" : ""}`} style={tipStyle}>
          <div className="tour-tip-head">
            <Dots step="tour" />
            <small className="faint">{stopIdx + 1}/{STOPS.length}</small>
          </div>
          <h2 id="tour-title">{stop.title}</h2>
          <p>{stop.text}</p>
          {nav}
          {msg && <div className="small no">{msg}</div>}
        </div>
      </div>
    );
  }

  // ---------- 4. 첫 문제 같이 풀기 (화면 아래 작은 안내, 문제는 그대로 풀 수 있음) ----------
  if (st.step === "problem") {
    const here = st.no != null && path === `/problem/${st.no}`;
    const ok = graded?.correct;
    const finished = ok || graded?.reveal || graded?.already;
    let line: React.ReactNode;
    let action: React.ReactNode = skipBtn;
    if (!here && !finished) {
      line = "첫 문제가 기다리고 있어";
      action = <>{skipBtn}{st.no != null && <Link className="btn" href={`/problem/${st.no}`}>문제로</Link>}</>;
    } else if (finished) {
      line = ok ? (graded?.points ? <>맞았어! <b>+{graded.points}점</b></> : "맞았어!") : graded?.reveal ? "정답 보기는 0점이야" : "이미 푼 문제였어";
      action = <button type="button" className="btn" onClick={toDone}>마치기</button>;
    } else if (graded) {
      line = graded.penalty ? <>아깝다! <b>{graded.penalty}점</b> 깎였어. 다시 골라 봐</> : "아깝다! 첫 오답은 감점 없어. 다시 골라 봐";
    } else {
      line = <>보기를 고르고 <b>제출</b>! 맞히면 <b>+5점</b></>;
    }
    return (
      <aside className="tour-dock" aria-live="polite" aria-label="튜토리얼 안내">
        <div className="tour-dock-row">
          <Dots step="problem" />
          {here && !finished && (
            <button type="button" className="tour-skip" onClick={() => setRules(!rules)} aria-expanded={rules}>{rules ? "규칙 닫기" : "점수 규칙"}</button>
          )}
        </div>
        <div className="tour-dock-line">{line}</div>
        {rules && here && !finished && (
          <ul className="tour-list small">
            <li>첫 오답은 감점 없음, 두 번째부터 배점의 25% 감점</li>
            <li>한 번 틀린 뒤 맞히면 점수 절반</li>
            <li>정답 보기 = 0점</li>
          </ul>
        )}
        <div className="tour-actions">{action}</div>
        {finished && <div className="small muted">해설까지 읽으면 완벽해.</div>}
      </aside>
    );
  }

  // ---------- 끝: 첫걸음 배지 ----------
  if (st.step === "done") {
    const close = () => go({ step: "done", stop: 0, done: true });
    return modal(
      <>
        <div className="first-step-badge big" aria-hidden="true">첫걸음</div>
        <h2 id="tour-title">첫걸음 배지를 받았어!</h2>
        <p className={mobile ? "small muted" : ""}>
          {user && isAnon
            ? "지금은 게스트라 이 기기에만 기록돼. 로그인하면 어디서든 이어져."
            : "튜토리얼은 내 정보에서 다시 볼 수 있어."}
        </p>
        {user && isAnon ? (
          <div className="tour-actions">
            <button type="button" className="tour-skip" onClick={close}>게스트로 계속</button>
            <Link className="btn" href="/login" onClick={close}>로그인하기</Link>
          </div>
        ) : (
          <div className="tour-actions">
            <button type="button" className="tour-skip" onClick={close}>닫기</button>
            <Link className="btn" href="/problems" onClick={close}>문제 풀러 가기</Link>
          </div>
        )}
      </>,
      "center",
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
