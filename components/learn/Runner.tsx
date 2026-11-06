"use client";
import { useEffect, useRef, useState } from "react";
import Rich, { RichLine } from "@/components/learn/Rich";
import { friendly } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { submitLearn, type Graded } from "@/lib/learn/useLearn";
import type { Item } from "@/lib/learn/types";

const CIRCLE = ["①", "②", "③", "④", "⑤"];
const HINT_WAIT = 10; // 다음 힌트까지 기다리는 초 (바로 풀이로 넘어가지 않게)

export type RunResult = { key: string; credited: boolean; hints: number; points: number };

function useTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => set((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [on]);
}

/**
 * 문제를 하나씩 풀게 한다. 힌트 1 → 2 → 3 (10초 간격) → 풀이 보기.
 * 힌트 3까지 보고 맞히면 '맞았지만 통과 계산에서는 빠짐', 풀이를 보면 오답 처리 + 복습 등록.
 */
export default function Runner({
  items, mode, onDone, label, compact = false, typeTitle,
}: {
  items: Item[];
  mode: "learn" | "review" | "practical";
  onDone: (r: RunResult[]) => void;
  label?: string;
  compact?: boolean;
  typeTitle?: (tag: string) => string | undefined;
}) {
  const { ensureGuest, refreshScore } = useMe();
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [hints, setHints] = useState(0);
  const [nextHintAt, setNextHintAt] = useState(0);
  const [res, setRes] = useState<Graded | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState<RunResult[]>([]);
  const [startAt] = useState(() => Date.now());
  const topRef = useRef<HTMLDivElement>(null);
  const item = items[idx];
  const waiting = nextHintAt > Date.now();
  useTick(waiting || mode === "practical");

  useEffect(() => {
    setChoice(null); setText(""); setHints(0); setNextHintAt(0); setRes(null); setErr(""); setRevealed(false);
  }, [idx]);

  if (!item) return null;

  const send = async (reveal = false) => {
    if (busy || res) return;
    if (!reveal && (item.qtype === "mc" ? choice === null : !text.trim())) return;
    setBusy(true);
    setErr("");
    try {
      await ensureGuest();
      const r = await submitLearn(item.key, item.qtype === "mc" ? choice : null, item.qtype === "short" ? text : null, reveal ? 4 : hints, mode);
      setRes(r);
      setRevealed(reveal);
      setResults((rs) => [...rs, { key: item.key, credited: r.credited, hints: reveal ? 4 : hints, points: r.points ?? 0 }]);
      if (r.points) refreshScore();
    } catch (e) {
      setErr(friendly(e));
    }
    setBusy(false);
  };
  const openHint = () => {
    if (hints >= 3 || waiting) return;
    setHints(hints + 1);
    setNextHintAt(Date.now() + HINT_WAIT * 1000);
  };
  const next = () => {
    if (idx + 1 >= items.length) { onDone(results); return; }
    setIdx(idx + 1);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const secs = Math.max(0, Math.ceil((nextHintAt - Date.now()) / 1000));
  const elapsed = Math.floor((Date.now() - startAt) / 1000);
  const stars = "●".repeat(item.diff) + "○".repeat(Math.max(0, 5 - item.diff));
  const tt = typeTitle?.(item.tag);

  return (
    <div className={`runner${compact ? " compact" : ""}`} ref={topRef}>
      <div className="runner-head">
        <span className="runner-count">{label ? `${label} · ` : ""}{idx + 1} / {items.length}</span>
        <div className="runner-bar" aria-hidden="true"><span style={{ width: `${(100 * (idx + (res ? 1 : 0))) / items.length}%` }} /></div>
        {mode === "practical" && <span className="runner-time num">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</span>}
      </div>
      <div className="runner-meta">
        {tt && <span className="badge subj">{tt}</span>}
        <span className="diff-stars" title={`난이도 ${item.diff}`}>{stars}</span>
      </div>

      <Rich text={item.body} className="runner-body" />

      {item.qtype === "mc" && item.choices && (
        <div className="runner-choices" role="radiogroup" aria-label="보기">
          {item.choices.map((c, i) => {
            const isAns = res && res.answer === i;
            const isMine = choice === i;
            const cls = res ? (isAns ? " right" : isMine ? " wrong" : " dim") : isMine ? " on" : "";
            return (
              <button key={i} type="button" role="radio" aria-checked={isMine} className={`rc${cls}`} disabled={!!res} onClick={() => setChoice(i)}>
                <span className="rc-n">{CIRCLE[i]}</span>
                <RichLine text={/\$/.test(c) || !/^-?\d+$/.test(c) ? c : `$${c}$`} />
              </button>
            );
          })}
        </div>
      )}
      {item.qtype === "short" && (
        <input className="input runner-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="답을 입력해" disabled={!!res}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }} inputMode="numeric" />
      )}

      {!res && (
        <>
          {hints > 0 && (
            <ol className="runner-hints">
              {item.hints.slice(0, hints).map((h, i) => (
                <li key={i}><small>힌트 {i + 1}</small><Rich text={h} /></li>
              ))}
            </ol>
          )}
          <div className="runner-actions">
            <button type="button" className="btn line" onClick={openHint} disabled={hints >= 3 || waiting}>
              {hints >= 3 ? "힌트 끝" : waiting ? `다음 힌트 ${secs}초` : `힌트 ${hints + 1} 보기`}
            </button>
            {hints >= 3 && <button type="button" className="btn line" disabled={busy} onClick={() => send(true)}>풀이 보기</button>}
            <button type="button" className="btn big grow" disabled={busy || (item.qtype === "mc" ? choice === null : !text.trim())} onClick={() => send()}>
              {busy ? "채점 중…" : "제출"}
            </button>
          </div>
          {hints === 3 && <p className="small faint" style={{ margin: 0 }}>힌트를 3개 다 보고 맞히면 맞은 걸로 보여 주지만, 단계 통과 계산에는 넣지 않아.</p>}
        </>
      )}
      {err && <div className="notice warn">{err}</div>}

      {res && (
        <div className={`runner-result ${res.correct ? "ok" : "no"}`}>
          <b className="runner-verdict">
            {res.correct ? (res.credited ? "맞았어!" : "맞았어! (힌트 3개를 써서 통과 계산에서는 빠져)") : revealed ? "풀이를 확인했어 (오답으로 기록하고 복습에 넣을게)" : "아깝다, 틀렸어"}
          </b>
          {(res.points ?? 0) > 0 && (
            <div className="earn">
              <span className="earn-pts">+{res.points}점</span>
              {(res.bonus ?? []).map((b) => <span key={b.label} className="earn-bonus">🎉 {b.label} +{b.points}</span>)}
            </div>
          )}
          {res.credited && !res.points && mode !== "review" && <div className="small faint">이미 점수를 받은 문제야. 문제마다 처음 맞힐 때만 점수가 들어가.</div>}
                    {!res.correct && res.answer_text && <div className="small">정답: <RichLine text={/\$/.test(res.answer_text) ? res.answer_text : `$${res.answer_text}$`} /></div>}
          <Rich text={res.explanation} className="runner-expl" />
          {res.review === "queued" && <p className="small review-note">이 유형은 <b>내일 복습</b>에 새 문제로 다시 나와. 1일 → 3일 → 7일 동안 맞히면 완전히 내 것!</p>}
          {res.review === "next" && <p className="small review-note">복습 성공! 다음 복습은 며칠 뒤에 다시 나와.</p>}
          {res.review === "mastered" && <p className="small review-note ok">이 유형은 완전히 익혔어!</p>}
          {res.review === "reset" && <p className="small review-note">괜찮아. 내일 다시 한 번 더 풀어 보자.</p>}
          {res.review === "back_to_concept" && <p className="small review-note">두 번 연속 막혔어. 이 유형의 개념 카드를 한 번 더 보고 오면 훨씬 쉬워.</p>}
          <button type="button" className="btn big" onClick={next}>{idx + 1 >= items.length ? "결과 보기" : "다음 문제"}</button>
        </div>
      )}
    </div>
  );
}
