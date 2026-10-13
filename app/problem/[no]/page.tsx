"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GuardedText, isGuarded } from "@/components/Guarded";
import AnswerInput, { emptyAnswer, hasAnswer, type AnswerValue } from "@/components/AnswerInput";
import { DiffBadge, SubjBadge, TypeBadge } from "@/components/Badges";
import Figure from "@/components/Figure";
import ReportButton from "@/components/ReportButton";
import { diffOf, loadProblemRows, nextPenalty, stateOf, subjectName, type GradeResult, type Progress, type ProblemRow, type Question } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { useTrace } from "@/lib/useTrace";

type Verdict =
  | { kind: "ac"; points: number; lost: number; answer: number | null; answerText: string | null; explanation: string; already?: boolean }
  | { kind: "wa"; picked: number | null; text: string; penalty: number; repeat: boolean; nextPenalty: number }
  | { kind: "reveal"; answer: number | null; answerText: string | null; explanation: string };

const QCOLS = "id,no,subject,unit,topic,qtype,difficulty,body,choices,figure,source,author,author_nick";

/** 맞혔을 때 잠깐 터지는 축하 효과 (움직임 줄이기 설정이면 안 보임) */
function Burst() {
  const colors = ["#2f5be8", "#ffbf2e", "#12965a", "#e5484d", "#7c5cf0", "#0e93a6"];
  return (
    <div className="burst" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <i key={i} style={{ ["--a" as string]: `${i * 20}deg`, ["--d" as string]: `${60 + (i % 3) * 22}px`, background: colors[i % colors.length] }} />
      ))}
    </div>
  );
}

const buzz = (p: number | number[]) => {
  try { navigator.vibrate?.(p); } catch {}
};

export default function ProblemPage() {
  const { no } = useParams<{ no: string }>();
  const router = useRouter();
  const { user, refreshScore, refreshStatus } = useMe();
  const [q, setQ] = useState<Question | null | undefined>(undefined);
  const [info, setInfo] = useState<ProblemRow | null>(null);
  const [unitList, setUnitList] = useState<ProblemRow[]>([]);
  const [progAll, setProgAll] = useState<Record<string, Progress>>({});
  const [val, setVal] = useState<AnswerValue>(emptyAnswer);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [burst, setBurst] = useState(0);
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);
  const trace = useTrace(q?.id, q?.id ?? null);

  const loadMine = useCallback(async () => {
    const { data } = await sb().rpc("my_progress");
    const m: Record<string, Progress> = {};
    ((data as Progress[]) ?? []).forEach((p) => (m[p.question_id] = p));
    setProgAll(m);
  }, []);

  const loadStats = useCallback(async () => {
    const list = await loadProblemRows(sb());
    const me = list.find((p) => String(p.no) === no) ?? null;
    setInfo(me);
    setUnitList(me ? list.filter((p) => p.subject === me.subject && p.unit === me.unit) : []);
  }, [no]);

  useEffect(() => {
    if (!user) return;
    setVal(emptyAnswer);
    setVerdict(null);
    setErr("");
    (async () => {
      const { data, error } = await sb().from("questions").select(QCOLS).eq("no", Number(no)).eq("status", "published").maybeSingle();
      if (error) return setErr(friendly(error));
      setQ((data as Question) ?? null);
      // 문제를 처음 연 시각을 서버에 남김 (너무 빨리 맞힌 답 확인용)
      if (data) sb().rpc("open_questions", { p_ids: [(data as Question).id] }).then(() => {}, () => {});
      if (data) await Promise.all([loadMine(), loadStats()]);
    })();
  }, [user, no, loadMine, loadStats]);

  const prog = q ? progAll[q.id] : undefined;
  const st = stateOf(prog);
  const done = st === "solved" || st === "revealed";
  const shown =
    verdict?.kind === "ac" || verdict?.kind === "reveal"
      ? { choice: verdict.answer, text: verdict.answerText }
      : done
        ? { choice: prog?.answer ?? null, text: prog?.answer_text ?? null }
        : null;
  const locked = shown !== null || busy;
  const idx = unitList.findIndex((p) => String(p.no) === no);
  const prev = idx > 0 ? unitList[idx - 1].no : undefined;
  const next = idx >= 0 && idx < unitList.length - 1 ? unitList[idx + 1].no : undefined;

  async function submit() {
    if (!q || !hasAnswer(q, val) || busy || shown) return;
    setBusy(true);
    setErr("");
    const { data, error } = await sb().rpc("submit_answer", {
      p_question: q.id,
      p_choice: q.qtype === "mc" ? val.choice : null,
      p_text: q.qtype === "short" ? val.text : null,
    });
    setBusy(false);
    if (error) return setErr(friendly(error));
    const r = data as GradeResult;
    trace.submit(!!r.correct, q.qtype === "mc" ? (val.choice ?? -1) + 1 : val.text.slice(0, 20));
    if (r.correct) {
      setVerdict({ kind: "ac", points: r.points, lost: r.lost ?? 0, answer: r.answer ?? null, answerText: r.answer_text ?? null, explanation: r.explanation ?? "", already: r.already });
      if (!r.already && r.points > 0) setBurst((b) => b + 1);
      buzz(30);
    } else {
      setVerdict({ kind: "wa", picked: val.choice, text: val.text, penalty: r.penalty ?? 0, repeat: !!r.repeat, nextPenalty: r.next_penalty ?? 0 });
      buzz([20, 60, 20]);
    }
    await Promise.all([loadMine(), loadStats(), refreshScore(), refreshStatus()]);
  }

  async function reveal() {
    if (!q) return;
    setBusy(true);
    const { data, error } = await sb().rpc("reveal_answer", { p_question: q.id });
    setBusy(false);
    if (error) return setErr(friendly(error));
    const r = data as GradeResult;
    trace.reveal();
    if (q.qtype === "mc") setVal({ ...val, choice: r.answer ?? null });
    setVerdict({ kind: "reveal", answer: r.answer ?? null, answerText: r.answer_text ?? null, explanation: r.explanation ?? "" });
    await loadMine();
  }

  // 키보드: 1~9 보기 고르기, Enter 제출, ←/→ 이전·다음 문제
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if (!q || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (q.qtype === "mc" && /^[1-9]$/.test(e.key) && !locked) {
      const i = Number(e.key) - 1;
      if (i < q.choices.length) {
        if (val.choice !== i) trace.pick(i + 1);
        setVal({ ...val, choice: i });
        if (verdict?.kind === "wa") setVerdict(null);
        e.preventDefault();
      }
    } else if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") {
      if (hasAnswer(q, val) && !locked) { e.preventDefault(); submit(); }
    } else if (e.key === "ArrowLeft" && prev) {
      router.push(`/problem/${prev}`);
    } else if (e.key === "ArrowRight" && next) {
      router.push(`/problem/${next}`);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // 휴대폰: 문제를 옆으로 밀어서 이전·다음 문제
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, ok: !(e.target as HTMLElement).closest(".table-wrap, input, textarea") };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s?.ok) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 50) return;
    if (dx < 0 && next) router.push(`/problem/${next}`);
    if (dx > 0 && prev) router.push(`/problem/${prev}`);
  };

  if (err && q === undefined) return <div className="notice warn">{err} <button className="btn line" onClick={() => location.reload()}>다시 시도</button></div>;
  if (q === undefined) return <p className="muted">문제 불러오는 중…</p>;
  if (q === null)
    return (
      <div className="panel panel-body">
        <b>{no}번 문제를 찾을 수 없어.</b> <Link href="/problems" style={{ color: "var(--brand)" }}>문제 목록으로</Link>
      </div>
    );

  const explanation = verdict && verdict.kind !== "wa" ? verdict.explanation : done ? prog?.explanation ?? "" : "";
  const d = diffOf(q.difficulty);
  const isOwn = user && q.author === user.id;
  const pen = nextPenalty(d.points, prog?.wrong ?? 0);
  const hint =
    st === "tried"
      ? `${prog?.wrong}번 틀렸어. 지금 맞히면 ${Math.floor(d.points / 2)}점${pen ? ` · 또 틀리면 −${pen}점` : ""}`
      : `처음 맞히면 ${d.points}점 · 첫 오답은 감점 없음`;

  const actions = shown === null && (
    <>
      <button className="btn big" type="button" disabled={!hasAnswer(q, val) || busy} onClick={submit}>
        {busy ? "채점 중…" : "제출"}
      </button>
      <button className="btn line" type="button" disabled={busy} onClick={reveal}>정답 보기 (0점)</button>
    </>
  );

  return (
    <>
      <div className="solve">
        <article className="panel solve-main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {burst > 0 && <Burst key={burst} />}
          <div className="prob-head">
            <div className="crumb">
              <Link href="/problems">문제</Link> › <Link href={`/problems?subject=${q.subject}`}>{subjectName(q.subject)}</Link>
              {q.unit && <> › <Link href={`/problems?subject=${q.subject}&unit=${encodeURIComponent(q.unit)}`}>{q.unit}</Link></>}
              {q.topic && <> › <Link href={`/problems?subject=${q.subject}&unit=${encodeURIComponent(q.unit)}&topic=${encodeURIComponent(q.topic)}`}>{q.topic}</Link></>}
            </div>
            <h1><span className="pno">{q.no}번</span>{q.topic || q.unit || subjectName(q.subject)}</h1>
            <div className="prob-tags">
              <SubjBadge code={q.subject} /> <TypeBadge type={q.qtype} /> <DiffBadge level={q.difficulty} />
              <span className="small muted">배점 {d.points}점 · 정답률 {info?.submissions ? `${info.accuracy}%` : "–"}</span>
              <span className="people-chip" title="이 문제를 풀어 본 사람 중 맞힌 사람">
                <b>{info?.solved_people ?? 0}</b>명 맞힘 <span className="faint">/ {info?.tried ?? 0}명 풀어 봄</span>
              </span>
              {idx >= 0 && <span className="small faint">{idx + 1} / {unitList.length}</span>}
              <ReportButton questionId={q.id} no={q.no} className="push-right" />
            </div>
          </div>

          <section className="section">
            <h2>문제</h2>
            <GuardedText className="statement" text={q.body} seed={q.id} on={isGuarded(q)} />
            <Figure spec={q.figure} />
          </section>

          <section className="section">
            <h2>{q.qtype === "short" ? "답안" : "보기"}</h2>
            <AnswerInput
              q={q}
              guard={isGuarded(q) ? q.id : undefined}
              value={val}
              onChange={(v) => {
                if (q.qtype === "mc" && v.choice !== val.choice && v.choice !== null) trace.pick(v.choice + 1);
                setVal(v);
                if (verdict?.kind === "wa") setVerdict(null);
              }}
              disabled={locked}
              revealChoice={shown?.choice}
              revealText={shown?.text}
              wrongPick={verdict?.kind === "wa" ? verdict.picked : null}
              onEnter={submit}
            />
          </section>

          {verdict?.kind === "ac" && (
            <div className="verdict ok">
              <span className="big res-ac">맞았습니다!!</span>{" "}
              <span className="muted">
                {verdict.already ? "이미 푼 문제라 점수는 그대로야." : verdict.points > 0 ? `+${verdict.points}점${verdict.lost ? ` (오답 감점 −${verdict.lost}점 · 이 문제 합계 ${verdict.points - verdict.lost > 0 ? "+" : ""}${verdict.points - verdict.lost}점)` : ""}` : isOwn ? "내가 낸 문제라 점수는 없어." : ""}
              </span>
            </div>
          )}
          {verdict?.kind === "wa" && (
            <div className="verdict no">
              <span className="big res-wa">틀렸습니다</span>{" "}
              <span className="muted">
                {q.qtype === "short" ? `'${verdict.text}'은(는) 정답이 아니야.` : `${(verdict.picked ?? 0) + 1}번은 정답이 아니야.`}{" "}
                {verdict.repeat ? "아까 낸 답이라 감점은 없어." : verdict.penalty > 0 ? <b className="res-wa">−{verdict.penalty}점</b> : "첫 오답이라 감점은 없어."}
                {verdict.nextPenalty > 0 && !verdict.repeat ? ` 또 틀리면 −${verdict.nextPenalty}점.` : ""}
              </span>
            </div>
          )}
          {verdict?.kind === "reveal" && (
            <div className="verdict"><span className="big res-rv">정답을 확인했어</span> <span className="muted">(0점 처리)</span></div>
          )}
          {!verdict && done && (
            <div className="verdict">
              {st === "solved" ? <span className="res-ac">맞힌 문제야 ({prog?.points}점 받음)</span> : <span className="res-rv">정답을 확인한 문제야 (0점)</span>}
            </div>
          )}
          {explanation && (
            <details className="section explain" open>
              <summary><h2>해설</h2></summary>
              <p className="statement" style={{ fontSize: 15.5 }}>{explanation}</p>
            </details>
          )}
          {err && <div className="verdict res-wa">{err}</div>}

          <div className="prob-foot">
            {prev ? <Link className="btn line" href={`/problem/${prev}`}>← {prev}번</Link> : <span />}
            <Link className="btn line" href={`/problems?subject=${q.subject}&unit=${encodeURIComponent(q.unit)}`}>목록</Link>
            {next ? <Link className="btn line" href={`/problem/${next}`}>{next}번 →</Link> : <span />}
          </div>
        </article>

        {/* PC: 오른쪽에 고정되는 답안 제출판 · 휴대폰: 아래로 내려감 */}
        <aside className="solve-side">
          <section className="panel side-card">
            <div className="side-score">
              {verdict?.kind === "ac" && !verdict.already ? (
                <><small>받은 점수</small><b className="res-ac">+{verdict.points}<em>점</em></b></>
              ) : done ? (
                <><small>받은 점수</small><b>{prog?.points ?? 0}<em>점</em></b></>
              ) : (
                <><small>이 문제 배점</small><b>{d.points}<em>점</em></b></>
              )}
            </div>
            {shown === null ? <p className="small muted" style={{ margin: 0 }}>{hint}</p> : null}
            <div className="side-actions">{actions}</div>
            {shown === null && <p className="kbd-hint">키보드 <kbd>1</kbd>~<kbd>5</kbd> 보기 선택 · <kbd>Enter</kbd> 제출 · <kbd>←</kbd><kbd>→</kbd> 이동</p>}
            {shown !== null && next && <Link className="btn" href={`/problem/${next}`}>다음 문제 ({next}번)</Link>}
          </section>

          {unitList.length > 1 && (
            <section className="panel side-card">
              <div className="side-title">
                <b>{q.unit}</b>
                <span className="small faint">{unitList.filter((p) => stateOf(progAll[p.id]) === "solved").length} / {unitList.length} 맞힘</span>
              </div>
              <div className="omr">
                {unitList.map((p) => {
                  const s = stateOf(progAll[p.id]);
                  return (
                    <Link key={p.no} href={`/problem/${p.no}`} className={`omr-cell ${s} ${String(p.no) === no ? "now" : ""}`} aria-current={String(p.no) === no ? "page" : undefined} title={`${p.no}번`}>
                      {p.no % 1000}
                    </Link>
                  );
                })}
              </div>
              <div className="omr-legend small faint">
                <span><i className="dot solved" />맞힘</span><span><i className="dot tried" />틀림</span><span><i className="dot revealed" />정답 봄</span>
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* 휴대폰: 엄지로 누르기 쉬운 아래 고정 제출 바 */}
      <div className="m-actions">
        {prev ? <Link className="btn line" href={`/problem/${prev}`} aria-label="이전 문제">←</Link> : <span className="btn line" aria-hidden="true" style={{ visibility: "hidden" }}>←</span>}
        {shown === null ? (
          <button className="btn grow" type="button" disabled={!hasAnswer(q, val) || busy} onClick={submit}>
            {busy ? "채점 중…" : hasAnswer(q, val) ? "제출" : q.qtype === "mc" ? "보기를 골라 줘" : "답을 입력해 줘"}
          </button>
        ) : next ? (
          <Link className="btn grow" href={`/problem/${next}`}>다음 문제</Link>
        ) : (
          <Link className="btn grow" href={`/problems?subject=${q.subject}&unit=${encodeURIComponent(q.unit)}`}>목록으로</Link>
        )}
        {next ? <Link className="btn line" href={`/problem/${next}`} aria-label="다음 문제">→</Link> : <span className="btn line" aria-hidden="true" style={{ visibility: "hidden" }}>→</span>}
      </div>
    </>
  );
}
