"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AnswerInput, { emptyAnswer, hasAnswer, type AnswerValue } from "@/components/AnswerInput";
import { DiffBadge, TypeBadge } from "@/components/Badges";
import { DIFF, diffOf, QTYPES, shuffle, stateOf, SUBJECTS, subjectName, type GradeResult, type Question } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { buildTree, useProblems } from "@/lib/useProblems";

type Phase = "setup" | "taking" | "grading" | "result";
type Graded = { q: Question; val: AnswerValue; result: GradeResult | null; skipped: boolean };

const QCOLS = "id,no,subject,unit,topic,qtype,difficulty,body,choices,source,author,author_nick";
const COUNTS = [5, 10, 15, 20, 30];

export default function Exam() {
  const params = useSearchParams();
  const { user, refreshScore } = useMe();
  const { rows, prog } = useProblems();
  const tree = useMemo(() => buildTree(rows ?? []), [rows]);

  // ---------- 1단계: 시험지 설정 ----------
  const [subject, setSubject] = useState(params.get("subject") ?? "ma");
  const [units, setUnits] = useState<string[]>(params.get("unit") ? [params.get("unit")!] : []);
  const [topics, setTopics] = useState<string[]>(params.get("topic") ? [params.get("topic")!] : []);
  const [diffs, setDiffs] = useState<number[]>([]);
  const [type, setType] = useState("");
  const [count, setCount] = useState(10);
  const [skipSolved, setSkipSolved] = useState(true);
  const fixedNos = params.get("nos"); // 오답 노트에서 넘어온 문제 번호들

  // 과목을 바꾸면 단원 선택 초기화
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setUnits([]);
    setTopics([]);
  }, [subject]);

  const pool = useMemo(() => {
    if (!rows) return [];
    if (fixedNos) {
      const set = new Set(fixedNos.split(",").map(Number));
      return rows.filter((r) => set.has(r.no));
    }
    return rows.filter((r) => {
      if (r.subject !== subject) return false;
      if (units.length && !units.includes(r.unit)) return false;
      if (topics.length && !topics.includes(r.topic)) return false;
      if (diffs.length && !diffs.includes(r.difficulty)) return false;
      if (type && r.qtype !== type) return false;
      const st = stateOf(prog[r.id]);
      if (skipSolved && (st === "solved" || st === "revealed")) return false;
      return true;
    });
  }, [rows, prog, subject, units, topics, diffs, type, skipSolved, fixedNos]);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const topicChoices = useMemo(() => {
    const out: string[] = [];
    Object.entries(tree[subject]?.units ?? {}).forEach(([u, uv]) => {
      if (units.length && !units.includes(u)) return;
      Object.keys(uv.topics).forEach((t) => out.push(t));
    });
    return out;
  }, [tree, subject, units]);

  // ---------- 2단계: 풀기 ----------
  const [phase, setPhase] = useState<Phase>("setup");
  const [paper, setPaper] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (phase !== "taking") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  async function makePaper() {
    setErr("");
    const picked = fixedNos ? pool : shuffle(pool).slice(0, count);
    if (!picked.length) return setErr("조건에 맞는 문제가 없어. 범위를 넓혀 줘.");
    const { data, error } = await sb().from("questions").select(QCOLS).in("id", picked.map((p) => p.id));
    if (error) return setErr(friendly(error));
    // 시험지는 대단원 → 난이도 순서로 정렬 (쉬운 문제부터)
    const qs = ((data as Question[]) ?? []).sort((a, b) => a.unit.localeCompare(b.unit) || a.difficulty - b.difficulty || a.no - b.no);
    setPaper(qs);
    setAnswers({});
    setStartedAt(Date.now());
    setNow(Date.now());
    setConfirmSubmit(false);
    setPhase("taking");
    window.scrollTo({ top: 0 });
  }

  // ---------- 3단계: 채점 ----------
  const [graded, setGraded] = useState<Graded[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const answeredCount = paper.filter((q) => hasAnswer(q, answers[q.id] ?? emptyAnswer)).length;

  async function gradeAll() {
    if (answeredCount < paper.length && !confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }
    setElapsed(Date.now() - startedAt);
    setPhase("grading");
    const out: Graded[] = [];
    for (let i = 0; i < paper.length; i++) {
      const q = paper[i];
      const val = answers[q.id] ?? emptyAnswer;
      setProgress(i);
      if (!hasAnswer(q, val)) {
        out.push({ q, val, result: null, skipped: true });
        continue;
      }
      const { data, error } = await sb().rpc("submit_answer", {
        p_question: q.id,
        p_choice: q.qtype === "mc" ? val.choice : null,
        p_text: q.qtype === "short" ? val.text : null,
      });
      out.push({ q, val, result: error ? null : (data as GradeResult), skipped: false });
    }
    setGraded(out);
    await refreshScore();
    setPhase("result");
    window.scrollTo({ top: 0 });
  }

  const correct = graded.filter((g) => g.result?.correct).length;
  const earned = graded.reduce((s, g) => s + (g.result?.correct ? g.result.points : 0), 0);
  const wrongNos = graded.filter((g) => !g.result?.correct).map((g) => g.q.no);
  const mmss = (ms: number) => `${Math.floor(ms / 60000)}분 ${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}초`;

  // ---------- 화면 ----------
  if (phase === "result") {
    return (
      <>
        <div className="page-title"><h1>시험 결과</h1><span className="muted small">{subjectName(paper[0]?.subject ?? subject)} · {paper.length}문항 · {mmss(elapsed)}</span></div>
        <section className="panel stat-row">
          <div className="stat"><small>맞힌 문항</small><div className="score-big">{correct}<small> / {paper.length}</small></div></div>
          <div className="stat"><small>100점 환산</small><div className="score-big">{Math.round((100 * correct) / Math.max(1, paper.length))}<small>점</small></div></div>
          <div className="stat"><small>랭킹 점수</small><div className="score-big">+{earned}</div></div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>문항별 결과</h2>
            <span className="small faint">틀린 문제는 정답을 숨겨 뒀어. 다시 풀어서 맞히면 절반 점수를 받아.</span>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th className="c">번호</th><th>유형</th><th>결과</th><th className="hide-m">내 답</th><th className="r">점수</th><th className="c">다시</th></tr></thead>
              <tbody>
                {graded.map((g) => (
                  <tr key={g.q.id}>
                    <td className="c n"><Link className="link" href={`/problem/${g.q.no}`}>{g.q.no}</Link></td>
                    <td className="unit-cell">{g.q.topic}</td>
                    <td className="nowrap">
                      {g.skipped ? <span className="res-rv">답 안 함</span> : g.result?.correct ? <span className="res-ac">맞았습니다!!</span> : <span className="res-wa">틀렸습니다</span>}
                    </td>
                    <td className="hide-m small muted">{g.skipped ? "–" : g.q.qtype === "short" ? g.val.text : `${(g.val.choice ?? 0) + 1}번`}</td>
                    <td className="r n">{g.result?.correct ? (g.result.already ? "이미 푼 문제" : `+${g.result.points}`) : "0"}</td>
                    <td className="c">{!g.result?.correct && <Link className="link small" href={`/problem/${g.q.no}`}>풀기</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="row">
          {wrongNos.length > 0 && (
            <Link className="btn" href={`/exam?nos=${wrongNos.join(",")}`} onClick={() => setPhase("setup")}>틀린 {wrongNos.length}문항 다시 시험 보기</Link>
          )}
          <button className="btn line" onClick={() => setPhase("setup")}>새 시험지 만들기</button>
          <Link className="btn line" href="/review">오답 노트</Link>
        </div>
      </>
    );
  }

  if (phase === "taking" || phase === "grading") {
    return (
      <>
        <div className="page-title">
          <h1>{fixedNos ? "오답 다시 풀기" : `${subjectName(subject)} 시험지`}</h1>
          <span className="muted small">{paper.length}문항 · 제출하면 한 번에 채점돼</span>
        </div>
        <section className="panel">
          {paper.map((q, i) => (
            <div key={q.id} className="exam-q">
              <div className="exam-q-head">
                <span className="qn">{i + 1}.</span>
                <span>{q.topic}</span>
                <TypeBadge type={q.qtype} />
                <DiffBadge level={q.difficulty} />
                <span className="faint">{diffOf(q.difficulty).points}점 · {q.no}번</span>
              </div>
              <p className="statement" style={{ marginBottom: 12 }}>{q.body}</p>
              <AnswerInput
                q={q}
                idPrefix={`q${i}`}
                value={answers[q.id] ?? emptyAnswer}
                onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                disabled={phase === "grading"}
              />
            </div>
          ))}
        </section>
        <div className="exam-bar">
          <span className="num"><b>{answeredCount}</b> / {paper.length} 답함</span>
          <span className="faint num">{mmss(now - startedAt)}</span>
          <span className="grow" />
          {phase === "grading" ? (
            <span className="muted">채점 중… {progress + 1}/{paper.length}</span>
          ) : (
            <>
              <button className="btn line" onClick={() => setPhase("setup")}>그만두기</button>
              <button className={`btn ${confirmSubmit ? "danger" : ""}`} onClick={gradeAll}>
                {confirmSubmit ? `${paper.length - answeredCount}문항 비었어. 그래도 제출` : "제출하고 채점"}
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  // setup
  return (
    <>
      <div className="page-title">
        <h1>시험지 만들기</h1>
        <span className="muted small">범위와 난이도를 고르면 모의고사처럼 한 번에 풀고 채점해.</span>
      </div>
      {!user && <div className="notice">불러오는 중…</div>}

      {fixedNos ? (
        <section className="panel panel-body exam-setup">
          <div><b>오답 다시 풀기</b> · {pool.length}문항 ({fixedNos.split(",").join(", ")}번)</div>
          <div className="row">
            <button className="btn" disabled={!pool.length} onClick={makePaper}>시험 시작</button>
            <Link className="btn line" href="/exam">범위 직접 고르기</Link>
          </div>
          {err && <span className="res-wa small">{err}</span>}
        </section>
      ) : (
        <section className="panel panel-body exam-setup">
          <div className="opt-group">
            <b>과목</b>
            <div className="checks" role="radiogroup">
              {SUBJECTS.map((s) => (
                <label key={s.code}>
                  <input type="radio" name="exam-subject" checked={subject === s.code} onChange={() => setSubject(s.code)} />
                  {s.name} <span className="faint small">{tree[s.code]?.count ?? 0}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="opt-group">
            <b>대단원 <span className="faint small">(안 고르면 전체)</span></b>
            <div className="checks">
              {Object.entries(tree[subject]?.units ?? {}).map(([u, uv]) => (
                <label key={u}>
                  <input type="checkbox" checked={units.includes(u)} onChange={() => { setUnits(toggle(units, u)); setTopics([]); }} />
                  {u} <span className="faint small">{uv.count}</span>
                </label>
              ))}
              {!Object.keys(tree[subject]?.units ?? {}).length && <span className="faint small">아직 문제가 없어.</span>}
            </div>
          </div>
          {topicChoices.length > 0 && (
            <div className="opt-group">
              <b>세부 유형 <span className="faint small">(안 고르면 전체)</span></b>
              <div className="checks">
                {topicChoices.map((t) => (
                  <label key={t}><input type="checkbox" checked={topics.includes(t)} onChange={() => setTopics(toggle(topics, t))} />{t}</label>
                ))}
              </div>
            </div>
          )}
          <div className="opt-group">
            <b>난이도 <span className="faint small">(안 고르면 전체)</span></b>
            <div className="checks">
              {DIFF.map((d) => (
                <label key={d.level}><input type="checkbox" checked={diffs.includes(d.level)} onChange={() => setDiffs(toggle(diffs, d.level))} />{d.label}</label>
              ))}
            </div>
          </div>
          <div className="row" style={{ gap: 20 }}>
            <div className="opt-group">
              <b>형식</b>
              <div className="checks">
                <label><input type="radio" name="exam-type" checked={type === ""} onChange={() => setType("")} />전체</label>
                {QTYPES.map((t) => (
                  <label key={t.code}><input type="radio" name="exam-type" checked={type === t.code} onChange={() => setType(t.code)} />{t.label}</label>
                ))}
              </div>
            </div>
            <div className="opt-group">
              <b>문항 수</b>
              <div className="checks">
                {COUNTS.map((c) => (
                  <label key={c}><input type="radio" name="exam-count" checked={count === c} onChange={() => setCount(c)} />{c}</label>
                ))}
              </div>
            </div>
          </div>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={skipSolved} onChange={(e) => setSkipSolved(e.target.checked)} /> 이미 맞힌 문제는 빼기
          </label>
          <div className="row">
            <button className="btn" disabled={!pool.length} onClick={makePaper}>
              시험지 만들기 ({Math.min(count, pool.length)}문항)
            </button>
            <span className="small muted">조건에 맞는 문제 {pool.length}개 중에서 무작위로 골라.</span>
          </div>
          {err && <span className="res-wa small">{err}</span>}
        </section>
      )}
    </>
  );
}
