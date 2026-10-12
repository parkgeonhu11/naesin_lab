"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DiffBadge, SubjBadge } from "@/components/Badges";
import NicknameCard from "@/components/NicknameCard";
import { diffOf, stateOf, subjectName, type Progress, type ProblemRow, type Question } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Verdict =
  | { kind: "ac"; points: number; answer: number; explanation: string; already?: boolean }
  | { kind: "wa"; picked: number }
  | { kind: "reveal"; answer: number; explanation: string };

export default function ProblemPage() {
  const { no } = useParams<{ no: string }>();
  const { user, nickname, error, ready, saveNickname, refreshScore } = useMe();
  const [q, setQ] = useState<Question | null | undefined>(undefined);
  const [info, setInfo] = useState<ProblemRow | null>(null);
  const [siblings, setSiblings] = useState<{ prev?: number; next?: number }>({});
  const [prog, setProg] = useState<Progress | undefined>();
  const [picked, setPicked] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadMine = useCallback(async (qid: string) => {
    const { data } = await sb().rpc("my_progress");
    setProg(((data as Progress[]) ?? []).find((p) => p.question_id === qid));
  }, []);

  const loadStats = useCallback(async () => {
    const { data } = await sb().rpc("problem_list");
    const list = (data as ProblemRow[]) ?? [];
    const i = list.findIndex((p) => String(p.no) === no);
    setInfo(i >= 0 ? list[i] : null);
    // 같은 과목 안에서 이전/다음 문제
    if (i >= 0) {
      const same = list.filter((p) => p.subject === list[i].subject);
      const j = same.findIndex((p) => p.no === list[i].no);
      setSiblings({ prev: same[j - 1]?.no, next: same[j + 1]?.no });
    }
  }, [no]);

  useEffect(() => {
    if (!user) return;
    setPicked(null);
    setVerdict(null);
    setErr("");
    (async () => {
      const { data } = await sb()
        .from("questions")
        .select("id,no,subject,unit,difficulty,body,choices,author,author_nick")
        .eq("no", Number(no))
        .eq("status", "published")
        .maybeSingle();
      setQ((data as Question) ?? null);
      if (data) await Promise.all([loadMine((data as Question).id), loadStats()]);
    })();
  }, [user, no, loadMine, loadStats]);

  async function submit() {
    if (!q || picked === null) return;
    setBusy(true);
    setErr("");
    const { data, error } = await sb().rpc("submit_answer", { p_question: q.id, p_choice: picked });
    setBusy(false);
    if (error) return setErr(friendly(error));
    const r = data as { correct: boolean; points: number; answer?: number; explanation?: string; already?: boolean };
    setVerdict(r.correct ? { kind: "ac", points: r.points, answer: r.answer ?? picked, explanation: r.explanation ?? "", already: r.already } : { kind: "wa", picked });
    await Promise.all([loadMine(q.id), loadStats(), refreshScore()]);
  }

  async function reveal() {
    if (!q) return;
    setBusy(true);
    const { data, error } = await sb().rpc("reveal_answer", { p_question: q.id });
    setBusy(false);
    if (error) return setErr(friendly(error));
    const r = data as { answer: number; explanation: string };
    setPicked(r.answer);
    setVerdict({ kind: "reveal", answer: r.answer, explanation: r.explanation });
    await loadMine(q.id);
  }

  if (error) return <div className="notice warn">{error}</div>;
  if (q === undefined) return <p className="muted">문제 불러오는 중…</p>;
  if (q === null)
    return (
      <div className="panel panel-body">
        <b>{no}번 문제를 찾을 수 없어.</b> <Link className="tbl link" href="/problems" style={{ color: "var(--brand)" }}>문제 목록으로</Link>
      </div>
    );

  const st = stateOf(prog);
  const done = st === "solved" || st === "revealed";
  const shownAnswer = verdict?.kind === "ac" || verdict?.kind === "reveal" ? verdict.answer : done ? prog?.answer ?? null : null;
  const d = diffOf(q.difficulty);
  const isOwn = user && q.author === user.id;

  return (
    <>
      {ready && user && !nickname && <NicknameCard current={nickname} onSave={saveNickname} />}
      <article className="panel">
        <div className="prob-head">
          <div className="crumb">
            <Link href="/problems">문제</Link> › <Link href={`/problems?subject=${q.subject}`}>{subjectName(q.subject)}</Link>
            {q.unit && <> › <Link href={`/problems?subject=${q.subject}&unit=${encodeURIComponent(q.unit)}`}>{q.unit}</Link></>}
          </div>
          <h1><span className="pno">{q.no}번</span>{q.unit || subjectName(q.subject)}</h1>
        </div>

        <div className="table-wrap">
          <table className="prob-info">
            <thead>
              <tr><th>과목</th><th>난이도</th><th>배점</th><th className="hide-m">제출</th><th className="hide-m">맞힌 사람</th><th>정답률</th><th className="hide-m">출제</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><SubjBadge code={q.subject} /></td>
                <td><DiffBadge level={q.difficulty} /></td>
                <td>{d.points}점</td>
                <td className="hide-m">{info?.submissions ?? 0}</td>
                <td className="hide-m">{info?.solvers ?? 0}</td>
                <td>{info?.submissions ? `${info.accuracy}%` : "–"}</td>
                <td className="hide-m">{q.author ? q.author_nick || "학생" : "내신랩"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="section">
          <h2>문제</h2>
          <p className="statement">{q.body}</p>
        </section>

        <section className="section">
          <h2>보기</h2>
          <ol className="choices">
            {q.choices.map((c, i) => {
              const cls = ["choice"];
              if (shownAnswer === i) cls.push("right");
              if (verdict?.kind === "wa" && verdict.picked === i) cls.push("wrong");
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={cls.join(" ")}
                    aria-pressed={picked === i}
                    disabled={shownAnswer !== null || busy}
                    onClick={() => {
                      setPicked(i);
                      if (verdict?.kind === "wa") setVerdict(null);
                    }}
                  >
                    <span className="cn">{i + 1}</span>
                    <span className="ct">{c}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {shownAnswer === null && (
          <div className="submit-bar">
            <button className="btn" type="button" disabled={picked === null || busy} onClick={submit}>
              {busy ? "채점 중…" : "제출"}
            </button>
            <button className="btn line" type="button" disabled={busy} onClick={reveal}>정답 보기 (0점)</button>
            <span className="small muted">
              {st === "tried" ? `한 번 틀렸어. 지금 맞히면 ${Math.floor(d.points / 2)}점` : `처음 맞히면 ${d.points}점`}
            </span>
          </div>
        )}

        {verdict?.kind === "ac" && (
          <div className="verdict">
            <span className="big res-ac">맞았습니다!!</span>{" "}
            <span className="muted">
              {verdict.already ? "이미 푼 문제라 점수는 그대로야." : verdict.points > 0 ? `+${verdict.points}점` : isOwn ? "내가 낸 문제라 점수는 없어." : ""}
            </span>
            {verdict.explanation && <p><b>해설</b> {verdict.explanation}</p>}
          </div>
        )}
        {verdict?.kind === "wa" && (
          <div className="verdict">
            <span className="big res-wa">틀렸습니다</span> <span className="muted">{verdict.picked + 1}번은 정답이 아니야. 다시 골라 봐.</span>
          </div>
        )}
        {verdict?.kind === "reveal" && (
          <div className="verdict">
            <span className="big res-rv">정답은 {verdict.answer + 1}번</span> <span className="muted">(0점 처리)</span>
            {verdict.explanation && <p><b>해설</b> {verdict.explanation}</p>}
          </div>
        )}
        {!verdict && done && (
          <div className="verdict">
            {st === "solved" ? <span className="res-ac">맞힌 문제야 ({prog?.points}점 받음)</span> : <span className="res-rv">정답을 확인한 문제야 (0점)</span>}
          </div>
        )}
        {err && <div className="verdict res-wa">{err}</div>}

        <div className="prob-foot">
          {siblings.prev ? <Link className="btn line" href={`/problem/${siblings.prev}`}>← {siblings.prev}번</Link> : <span />}
          <Link className="btn line" href={`/problems?subject=${q.subject}`}>목록</Link>
          {siblings.next ? <Link className="btn line" href={`/problem/${siblings.next}`}>{siblings.next}번 →</Link> : <span />}
        </div>
      </article>
    </>
  );
}
