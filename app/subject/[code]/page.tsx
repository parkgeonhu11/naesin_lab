"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import NicknameCard from "@/components/NicknameCard";
import { diffOf, subjectName, SUBJECTS, type Progress, type Question } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Result =
  | { kind: "ok"; points: number; answer: number; explanation: string; already?: boolean }
  | { kind: "bad"; picked: number }
  | { kind: "reveal"; answer: number; explanation: string };

export default function SubjectPage() {
  const { code } = useParams<{ code: string }>();
  const { user, nickname, error, ready, saveNickname } = useMe();
  const [qs, setQs] = useState<Question[] | null>(null);
  const [prog, setProg] = useState<Record<string, Progress>>({});
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadProgress = useCallback(async () => {
    const { data } = await sb().rpc("my_progress");
    const m: Record<string, Progress> = {};
    ((data as Progress[]) ?? []).forEach((p) => (m[p.question_id] = p));
    setProg(m);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await sb()
        .from("questions")
        .select("id,subject,unit,difficulty,body,choices,author,author_nick,sort")
        .eq("subject", code)
        .eq("status", "published")
        .order("sort")
        .order("created_at");
      if (error) setErr(friendly(error));
      setQs((data as Question[]) ?? []);
      await loadProgress();
    })();
  }, [user, code, loadProgress]);

  const q = qs?.[idx];
  const p = q ? prog[q.id] : undefined;
  const solved = p?.points !== null && p?.points !== undefined;
  const subjPts = useMemo(
    () => (qs ?? []).reduce((s, x) => s + (prog[x.id]?.points ?? 0), 0),
    [qs, prog],
  );
  const doneCount = (qs ?? []).filter((x) => prog[x.id]?.points != null).length;

  const go = (i: number) => {
    setIdx(i);
    setPicked(null);
    setResult(null);
    setErr("");
  };

  async function submit() {
    if (!q || picked === null) return;
    setBusy(true);
    setErr("");
    const { data, error } = await sb().rpc("submit_answer", { p_question: q.id, p_choice: picked });
    setBusy(false);
    if (error) return setErr(friendly(error));
    const r = data as { correct: boolean; points: number; answer?: number; explanation?: string; already?: boolean };
    if (r.correct) setResult({ kind: "ok", points: r.points, answer: r.answer ?? picked, explanation: r.explanation ?? "", already: r.already });
    else setResult({ kind: "bad", picked });
    await loadProgress();
  }

  async function reveal() {
    if (!q) return;
    setBusy(true);
    const { data, error } = await sb().rpc("reveal_answer", { p_question: q.id });
    setBusy(false);
    if (error) return setErr(friendly(error));
    const r = data as { answer: number; explanation: string };
    setPicked(r.answer);
    setResult({ kind: "reveal", answer: r.answer, explanation: r.explanation });
    await loadProgress();
  }

  const answerShown = result?.kind === "ok" || result?.kind === "reveal" ? result.answer : solved ? p?.answer ?? null : null;
  const isOwn = q && user && q.author === user.id;
  const pts = q ? diffOf(q.difficulty).points : 0;

  return (
    <div className="stack">
      {error && <div className="notice">{error}</div>}
      <nav className="tabs" aria-label="과목">
        {SUBJECTS.map((s) => (
          <Link key={s.code} href={`/subject/${s.code}`} className="tab" aria-pressed={s.code === code} style={{ textDecoration: "none" }}>
            {s.name}
          </Link>
        ))}
      </nav>
      {ready && user && !nickname && <NicknameCard current={nickname} onSave={saveNickname} />}

      <section className="sheet" aria-live="polite">
        <div className="sheet-head">
          <span className="eyebrow">{q?.unit || subjectName(code)}</span>
          <span className="prog">
            <b className="num">{doneCount}</b> / {qs?.length ?? 0} 해결 · <b className="num">{subjPts}</b>점
          </span>
        </div>
        <div className="nums">
          {(qs ?? []).map((x, i) => {
            const pr = prog[x.id];
            const cls = ["cell"];
            if (pr?.points != null) cls.push(pr.points > 0 ? "done" : "zero");
            else if (pr?.tried) cls.push("tried");
            if (i === idx) cls.push("cur");
            return (
              <button key={x.id} type="button" className={cls.join(" ")} onClick={() => go(i)} aria-label={`${i + 1}번 문제`}>
                {i + 1}
              </button>
            );
          })}
        </div>

        {qs === null && <div className="q muted">문제 불러오는 중…</div>}
        {qs?.length === 0 && (
          <div className="q muted">
            아직 이 과목 문제가 없어. <Link href="/suggest">문제를 제안</Link>해서 첫 문제를 만들어 줘.
          </div>
        )}
        {q && (
          <>
            <div className="q">
              <div className="q-meta">
                <span className="q-no">{idx + 1}</span>
                <span className="chip pts">{pts}점</span>
                <span className="chip">{diffOf(q.difficulty).label}</span>
                {q.author && <span className="chip">{q.author_nick || "친구"} 출제</span>}
                {p?.tried && !solved && <span className="chip" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>재도전 · 절반 점수</span>}
              </div>
              <p className="q-text">{q.body}</p>
              <div className="choices">
                {q.choices.map((c, i) => {
                  const cls = ["ch"];
                  if (answerShown === i) cls.push("right");
                  if (result?.kind === "bad" && result.picked === i) cls.push("wrong");
                  return (
                    <button
                      key={i}
                      type="button"
                      className={cls.join(" ")}
                      aria-pressed={picked === i}
                      disabled={answerShown !== null || busy}
                      onClick={() => {
                        setPicked(i);
                        if (result?.kind === "bad") setResult(null);
                      }}
                    >
                      <span className="bub">{i + 1}</span>
                      <span className="txt">{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {result?.kind === "ok" && (
              <div className="result ok">
                <b>{result.already ? "이미 푼 문제야." : result.points > 0 ? `정답! +${result.points}점` : isOwn ? "내가 낸 문제라 점수는 없어." : "정답!"}</b>
                {result.explanation && <p>{result.explanation}</p>}
              </div>
            )}
            {result?.kind === "reveal" && (
              <div className="result ok">
                <b>정답은 {result.answer + 1}번 (0점 처리)</b>
                {result.explanation && <p>{result.explanation}</p>}
              </div>
            )}
            {result?.kind === "bad" && (
              <div className="result bad">
                <b>{result.picked + 1}번은 정답이 아니야.</b>
                <p>다시 골라 봐. 이제 맞히면 {Math.floor(pts / 2)}점이야.</p>
              </div>
            )}
            {!result && solved && (
              <div className="result ok">
                <b>푼 문제야 ({p?.points}점 받음)</b>
              </div>
            )}
            {err && <div className="result bad"><b>{err}</b></div>}

            <div className="actions">
              {answerShown === null && (
                <>
                  <button className="btn" type="button" disabled={picked === null || busy} onClick={submit}>
                    {busy ? "채점 중…" : "제출"}
                  </button>
                  <button className="btn ghost" type="button" disabled={busy} onClick={reveal}>정답 보기 (0점)</button>
                </>
              )}
              <button className="btn ghost" type="button" disabled={!qs || idx >= qs.length - 1} onClick={() => go(idx + 1)}>
                다음 문제 →
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
