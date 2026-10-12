"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AnswerInput, { emptyAnswer, hasAnswer, type AnswerValue } from "@/components/AnswerInput";
import { DiffBadge, SubjBadge, TypeBadge } from "@/components/Badges";
import NicknameCard from "@/components/NicknameCard";
import { diffOf, stateOf, subjectName, type GradeResult, type Progress, type ProblemRow, type Question } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Verdict =
  | { kind: "ac"; points: number; answer: number | null; answerText: string | null; explanation: string; already?: boolean }
  | { kind: "wa"; picked: number | null; text: string }
  | { kind: "reveal"; answer: number | null; answerText: string | null; explanation: string };

const QCOLS = "id,no,subject,unit,topic,qtype,difficulty,body,choices,source,author,author_nick";

export default function ProblemPage() {
  const { no } = useParams<{ no: string }>();
  const { user, nickname, error, ready, saveNickname, refreshScore } = useMe();
  const [q, setQ] = useState<Question | null | undefined>(undefined);
  const [info, setInfo] = useState<ProblemRow | null>(null);
  const [siblings, setSiblings] = useState<{ prev?: number; next?: number }>({});
  const [prog, setProg] = useState<Progress | undefined>();
  const [val, setVal] = useState<AnswerValue>(emptyAnswer);
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
    // 같은 대단원 안에서 이전/다음 문제
    if (i >= 0) {
      const same = list.filter((p) => p.subject === list[i].subject && p.unit === list[i].unit);
      const j = same.findIndex((p) => p.no === list[i].no);
      setSiblings({ prev: same[j - 1]?.no, next: same[j + 1]?.no });
    }
  }, [no]);

  useEffect(() => {
    if (!user) return;
    setVal(emptyAnswer);
    setVerdict(null);
    setErr("");
    (async () => {
      const { data } = await sb().from("questions").select(QCOLS).eq("no", Number(no)).eq("status", "published").maybeSingle();
      setQ((data as Question) ?? null);
      if (data) await Promise.all([loadMine((data as Question).id), loadStats()]);
    })();
  }, [user, no, loadMine, loadStats]);

  async function submit() {
    if (!q || !hasAnswer(q, val) || busy) return;
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
    setVerdict(
      r.correct
        ? { kind: "ac", points: r.points, answer: r.answer ?? null, answerText: r.answer_text ?? null, explanation: r.explanation ?? "", already: r.already }
        : { kind: "wa", picked: val.choice, text: val.text },
    );
    await Promise.all([loadMine(q.id), loadStats(), refreshScore()]);
  }

  async function reveal() {
    if (!q) return;
    setBusy(true);
    const { data, error } = await sb().rpc("reveal_answer", { p_question: q.id });
    setBusy(false);
    if (error) return setErr(friendly(error));
    const r = data as GradeResult;
    if (q.qtype === "mc") setVal({ ...val, choice: r.answer ?? null });
    setVerdict({ kind: "reveal", answer: r.answer ?? null, answerText: r.answer_text ?? null, explanation: r.explanation ?? "" });
    await loadMine(q.id);
  }

  if (error) return <div className="notice warn">{error}</div>;
  if (q === undefined) return <p className="muted">문제 불러오는 중…</p>;
  if (q === null)
    return (
      <div className="panel panel-body">
        <b>{no}번 문제를 찾을 수 없어.</b> <Link href="/problems" style={{ color: "var(--brand)" }}>문제 목록으로</Link>
      </div>
    );

  const st = stateOf(prog);
  const done = st === "solved" || st === "revealed";
  const shown =
    verdict?.kind === "ac" || verdict?.kind === "reveal"
      ? { choice: verdict.answer, text: verdict.answerText }
      : done
        ? { choice: prog?.answer ?? null, text: prog?.answer_text ?? null }
        : null;
  const explanation = verdict && verdict.kind !== "wa" ? verdict.explanation : done ? prog?.explanation ?? "" : "";
  const d = diffOf(q.difficulty);
  const isOwn = user && q.author === user.id;
  const locked = shown !== null || busy;

  return (
    <>
      {ready && user && !nickname && <NicknameCard current={nickname} onSave={saveNickname} />}
      <article className="panel">
        <div className="prob-head">
          <div className="crumb">
            <Link href="/problems">문제</Link> › <Link href={`/problems?subject=${q.subject}`}>{subjectName(q.subject)}</Link>
            {q.unit && <> › <Link href={`/problems?subject=${q.subject}&unit=${encodeURIComponent(q.unit)}`}>{q.unit}</Link></>}
            {q.topic && <> › <Link href={`/problems?subject=${q.subject}&unit=${encodeURIComponent(q.unit)}&topic=${encodeURIComponent(q.topic)}`}>{q.topic}</Link></>}
          </div>
          <h1><span className="pno">{q.no}번</span>{q.topic || q.unit || subjectName(q.subject)}</h1>
        </div>

        <div className="table-wrap">
          <table className="prob-info">
            <thead>
              <tr><th>과목</th><th>형식</th><th>난이도</th><th>배점</th><th className="hide-m">제출</th><th className="hide-m">맞힌 사람</th><th>정답률</th><th className="hide-m">출처</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><SubjBadge code={q.subject} /></td>
                <td><TypeBadge type={q.qtype} /></td>
                <td><DiffBadge level={q.difficulty} /></td>
                <td>{d.points}점</td>
                <td className="hide-m">{info?.submissions ?? 0}</td>
                <td className="hide-m">{info?.solvers ?? 0}</td>
                <td>{info?.submissions ? `${info.accuracy}%` : "–"}</td>
                <td className="hide-m small">{q.author ? `${q.author_nick || "학생"} 제안` : q.source || "내신랩"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="section">
          <h2>문제</h2>
          <p className="statement">{q.body}</p>
        </section>

        <section className="section">
          <h2>{q.qtype === "short" ? "답안" : "보기"}</h2>
          <AnswerInput
            q={q}
            value={val}
            onChange={(v) => {
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

        {shown === null && (
          <div className="submit-bar">
            <button className="btn" type="button" disabled={!hasAnswer(q, val) || busy} onClick={submit}>
              {busy ? "채점 중…" : "제출"}
            </button>
            <button className="btn line" type="button" disabled={busy} onClick={reveal}>정답 보기 (0점)</button>
            <span className="small muted">
              {st === "tried" ? `${prog?.wrong}번 틀렸어. 지금 맞히면 ${Math.floor(d.points / 2)}점` : `처음 맞히면 ${d.points}점`}
            </span>
          </div>
        )}

        {verdict?.kind === "ac" && (
          <div className="verdict">
            <span className="big res-ac">맞았습니다!!</span>{" "}
            <span className="muted">
              {verdict.already ? "이미 푼 문제라 점수는 그대로야." : verdict.points > 0 ? `+${verdict.points}점` : isOwn ? "내가 낸 문제라 점수는 없어." : ""}
            </span>
          </div>
        )}
        {verdict?.kind === "wa" && (
          <div className="verdict">
            <span className="big res-wa">틀렸습니다</span>{" "}
            <span className="muted">
              {q.qtype === "short" ? `'${verdict.text}'은(는) 정답이 아니야.` : `${(verdict.picked ?? 0) + 1}번은 정답이 아니야.`} 다시 해 봐.
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
          <section className="section">
            <h2>해설</h2>
            <p className="statement" style={{ fontSize: 15 }}>{explanation}</p>
          </section>
        )}
        {err && <div className="verdict res-wa">{err}</div>}

        <div className="prob-foot">
          {siblings.prev ? <Link className="btn line" href={`/problem/${siblings.prev}`}>← {siblings.prev}번</Link> : <span />}
          <Link className="btn line" href={`/problems?subject=${q.subject}&unit=${encodeURIComponent(q.unit)}`}>목록</Link>
          {siblings.next ? <Link className="btn line" href={`/problem/${siblings.next}`}>{siblings.next}번 →</Link> : <span />}
        </div>
      </article>
    </>
  );
}
