"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subjectName } from "@/lib/data";
import { bonusOf, CIRC, figHtml, minsec, mmss, type MockEssay, type MockItem, type MockResult, type MockStart } from "@/lib/mock";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Phase = "intro" | "taking" | "submitting" | "result";
type Prev = { id: number; ranked: boolean; status: string; correct: number | null; total: number | null; elapsed: number | null; score: number | null; submitted_at: string | null };

/** 문제 한 개 (풀 때·결과 볼 때 같이 씀) */
function Item({ q, idx, picked, onPick, graded }: { q: MockItem; idx: number; picked: number | null; onPick?: (k: number) => void; graded: boolean }) {
  const ok = graded && picked === q.ans;
  return (
    <section className={`mock-q ${graded ? (ok ? "ok" : "bad") : ""}`} id={`q${q.no}`}>
      <div className="mock-q-head">
        <span className="qn">{idx + 1}.</span>
        <span className="mock-stem" dangerouslySetInnerHTML={{ __html: q.stem }} />
        <span className="faint small nowrap">[{q.pts}점]</span>
      </div>
      {q.fig && <div className="mock-fig" dangerouslySetInnerHTML={{ __html: figHtml(q.fig) }} />}
      {q.bogi && (
        <div className="mock-bogi">
          {q.bogi.map((b, i) => (b.startsWith("───") ? <hr key={i} /> : <p key={i} dangerouslySetInnerHTML={{ __html: b }} />))}
        </div>
      )}
      <div className={`mock-choices ${q.lay === "five" ? "five" : ""}`} role="group" aria-label={`${idx + 1}번 답 고르기`}>
        {q.choices.map((c, k) => (
          <button
            key={k}
            type="button"
            className={`choice ${graded && k === q.ans ? "right" : ""} ${graded && picked === k && k !== q.ans ? "wrong" : ""}`}
            aria-pressed={picked === k}
            disabled={graded || !onPick}
            onClick={() => onPick?.(k)}
          >
            <span className="cn">{k + 1}</span>
            <span className="ct" dangerouslySetInnerHTML={{ __html: c }} />
          </button>
        ))}
      </div>
      {graded && (
        <div className={`mock-expl ${ok ? "ok" : ""}`}>
          <b>정답 {CIRC[q.ans ?? 0]}</b>{picked === null ? " · 표시 안 함" : ok ? " · 맞았어" : ` · 내 답 ${CIRC[picked ?? 0]}`}
          <p>{q.expl}</p>
        </div>
      )}
    </section>
  );
}

function Essay({ e, idx }: { e: MockEssay; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mock-q">
      <div className="mock-q-head">
        <span className="qn">{idx + 1}.</span>
        <span className="mock-stem" dangerouslySetInnerHTML={{ __html: e.stem }} />
        <span className="faint small nowrap">[{e.pts}점]</span>
      </div>
      {e.fig && <div className="mock-fig" dangerouslySetInnerHTML={{ __html: figHtml(e.fig) }} />}
      {e.subs?.map((s, i) => <p key={i} className="mock-sub">{s}</p>)}
      <button type="button" className="btn line mini" onClick={() => setOpen((o) => !o)}>{open ? "모범 답안 숨기기" : "모범 답안 보기"}</button>
      {open && (
        <div className="mock-expl">
          <b>모범 답안</b>
          {e.model.split("\n").map((l, i) => <p key={i}>{l}</p>)}
          {e.rubric && <p className="small muted">채점 기준: {e.rubric}</p>}
        </div>
      )}
    </section>
  );
}

export default function MockExamPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAnon } = useMe();
  const [phase, setPhase] = useState<Phase>("intro");
  const [info, setInfo] = useState<{ title: string; subject: string; scope: string | null; time_limit: number; items: number; essays: number; takers: number } | null>(null);
  const [prev, setPrev] = useState<Prev[] | null>(null);
  const [start, setStart] = useState<MockStart | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<MockResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const offset = useRef(0); // 서버 시각 - 내 시각
  const dirty = useRef(false);
  const answersRef = useRef<(number | null)[]>([]);
  answersRef.current = answers;

  // 시험 정보 + 내 기록
  const loadInfo = useCallback(async () => {
    const [{ data: list }, { data: mine }] = await Promise.all([sb().rpc("mock_list"), user ? sb().rpc("mock_my_attempts", { p_exam: id }) : Promise.resolve({ data: [] })]);
    const e = ((list as (typeof info & { id: string })[]) ?? []).find((x) => x.id === id) ?? null;
    setInfo(e);
    setPrev((mine as Prev[]) ?? []);
    return (mine as Prev[]) ?? [];
  }, [id, user]);

  useEffect(() => {
    if (!user) return;
    loadInfo().then((mine) => {
      // 진행 중인 응시가 있으면 바로 이어서
      if (mine.some((m) => m.status === "running")) begin();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const running = prev?.find((m) => m.status === "running");
  const ranked = prev?.find((m) => m.ranked);

  async function begin() {
    setErr("");
    const { data, error } = await sb().rpc("mock_start", { p_exam: id });
    if (error) return setErr(friendly(error));
    const s = data as MockStart;
    offset.current = new Date(s.now).getTime() - Date.now();
    const saved = Array.from({ length: s.items.length }, (_, i) => (s.saved?.[i] ?? null) as number | null);
    setStart(s);
    setAnswers(saved);
    setConfirm(false);
    setPhase("taking");
    window.scrollTo({ top: 0 });
  }

  // 타이머 (서버 시계 기준)
  useEffect(() => {
    if (phase !== "taking" || !start) return;
    const dl = new Date(start.deadline).getTime();
    const tick = () => {
      const l = Math.max(0, Math.round((dl - (Date.now() + offset.current)) / 1000));
      setLeft(l);
      if (l <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, start]);

  // 답 중간 저장 (3초마다 바뀐 게 있으면)
  useEffect(() => {
    if (phase !== "taking" || !start) return;
    const t = setInterval(() => {
      if (!dirty.current) return;
      dirty.current = false;
      sb().rpc("mock_save", { p_attempt: start.attempt, p_answers: answersRef.current }).then(() => {}, () => {});
    }, 3000);
    const leave = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", leave);
    return () => { clearInterval(t); window.removeEventListener("beforeunload", leave); };
  }, [phase, start]);

  const pick = (i: number, k: number) => {
    setAnswers((a) => { const n = [...a]; n[i] = n[i] === k ? null : k; return n; });
    dirty.current = true;
  };

  const submitting = useRef(false);
  async function submit(auto = false) {
    if (!start || submitting.current) return;
    const blank = answersRef.current.filter((a) => a === null).length;
    if (!auto && blank > 0 && !confirm) { setConfirm(true); return; }
    submitting.current = true;
    setPhase("submitting");
    const { data, error } = await sb().rpc("mock_submit", { p_attempt: start.attempt, p_answers: answersRef.current });
    submitting.current = false;
    if (error) { setErr(friendly(error)); setPhase("taking"); return; }
    setResult(data as MockResult);
    setPhase("result");
    loadInfo();
    window.scrollTo({ top: 0 });
  }

  async function openResult(attempt: number) {
    const { data, error } = await sb().rpc("mock_result", { p_attempt: attempt });
    if (error) return setErr(friendly(error));
    setResult(data as MockResult);
    setPhase("result");
    window.scrollTo({ top: 0 });
  }

  const answered = useMemo(() => answers.filter((a) => a !== null).length, [answers]);

  if (!user) return <p className="muted">불러오는 중…</p>;

  // ---------- 결과 ----------
  if (phase === "result" && result) {
    const r = result;
    const limit = info?.time_limit ?? 1500;
    return (
      <>
        <div className="page-title">
          <h1>{info?.title ?? "시험 결과"}</h1>
          <span className="muted small">{r.ranked ? "랭킹 응시" : "연습 응시"}{r.auto ? " · 시간 초과로 자동 제출" : ""}</span>
        </div>
        <section className="panel stat-row">
          <div className="stat"><small>맞힌 문항</small><div className="score-big">{r.correct}<small> / {r.total}</small></div></div>
          <div className="stat"><small>배점 기준</small><div className="score-big">{r.pts_earned}<small> / {r.pts_total}점</small></div></div>
          <div className="stat"><small>푼 시간</small><b>{minsec(r.elapsed)}</b></div>
          <div className="stat"><small>랭킹 점수</small><div className="score-big">{r.score}</div><span className="small faint">{r.correct}×100 + 보너스 {bonusOf(limit, r.elapsed, r.correct, r.total)}</span></div>
          {r.ranked && <div className="stat"><small>이 시험 순위</small><div className="score-big">{r.rank}<small> / {r.takers}명</small></div></div>}
        </section>
        <div className="row">
          <Link className="btn" href={`/mock/${id}/rank`}>이 시험 랭킹 보기</Link>
          <button type="button" className="btn line" onClick={() => { setPhase("intro"); setResult(null); }}>시험 소개로</button>
          <Link className="btn line" href="/mock">다른 예상 시험</Link>
        </div>
        <section className="panel">
          <div className="panel-head"><h2>선택형 풀이</h2><span className="small faint">정답과 해설을 확인해. 다시 풀기는 연습으로 기록돼.</span></div>
          {r.items.map((q, i) => <Item key={q.no} q={q} idx={i} picked={r.answers?.[i] ?? null} graded />)}
        </section>
        {r.essays.length > 0 && (
          <section className="panel">
            <div className="panel-head"><h2>서술형 (연습)</h2><span className="small faint">랭킹에는 안 들어가. 직접 써 보고 모범 답안과 비교해 봐.</span></div>
            {r.essays.map((e, i) => <Essay key={e.no} e={e} idx={i} />)}
          </section>
        )}
      </>
    );
  }

  // ---------- 풀기 ----------
  if ((phase === "taking" || phase === "submitting") && start) {
    const urgent = left <= 120;
    return (
      <>
        <div className="page-title">
          <h1>{start.title}</h1>
          <span className="muted small">{start.ranked ? "랭킹 응시 · 첫 번째 시도야, 집중!" : "연습 응시 · 랭킹에는 안 들어가"}</span>
        </div>
        <section className="panel">
          {start.items.map((q, i) => <Item key={q.no} q={q} idx={i} picked={answers[i] ?? null} onPick={(k) => pick(i, k)} graded={false} />)}
        </section>
        {err && <p className="small res-wa">{err}</p>}
        <div className={`exam-bar mock-bar ${urgent ? "urgent" : ""}`}>
          <span className="mock-timer num" aria-live={urgent ? "assertive" : "off"}>{mmss(left)}</span>
          <span className="num"><b>{answered}</b> / {start.items.length} 답함</span>
          <span className="grow" />
          {phase === "submitting" ? (
            <span className="muted">채점 중…</span>
          ) : (
            <button type="button" className={`btn ${confirm ? "danger" : ""}`} onClick={() => submit(false)}>
              {confirm ? `${start.items.length - answered}문항 비었어. 그래도 제출` : "제출하고 채점"}
            </button>
          )}
        </div>
      </>
    );
  }

  // ---------- 소개 ----------
  return (
    <>
      <div className="page-title">
        <h1>{info?.title ?? "예상 시험"}</h1>
        {info && <span className="muted small">{subjectName(info.subject)} · {info.scope}</span>}
      </div>
      <section className="panel panel-body mock-intro">
        <div className="mock-intro-grid">
          <div><small>문항</small><b>선택형 {info?.items ?? "-"}</b>{info?.essays ? <span className="small muted"> + 서술형 {info.essays}(연습)</span> : null}</div>
          <div><small>제한 시간</small><b>{info ? minsec(info.time_limit) : "-"}</b></div>
          <div><small>응시</small><b>{info?.takers ?? 0}명</b></div>
        </div>
        <ul className="mock-rules small">
          <li><b>시작</b>을 누르는 순간부터 시간이 흘러. 다른 화면으로 가거나 앱을 닫아도 멈추지 않아.</li>
          <li>시간이 다 되면 그때까지 고른 답으로 자동 제출돼.</li>
          <li>랭킹에는 <b>첫 번째 응시</b>만 들어가. 그 뒤로는 연습이야.</li>
          <li>랭킹 점수 = 맞은 개수 × 100 + 시간 보너스(남은 시간 ÷ 15초 × 정답률, 최대 100).</li>
          {isAnon && <li className="res-wa">게스트 계정이야. 이 브라우저를 잃어버리면 기록도 사라져.</li>}
        </ul>
        {err && <p className="small res-wa" style={{ margin: 0 }}>{err}</p>}
        <div className="row">
          {running ? (
            <button type="button" className="btn big" onClick={begin}>이어서 풀기 (시간 흐르는 중!)</button>
          ) : (
            <button type="button" className={`btn big ${ranked ? "line" : ""}`} onClick={begin}>{ranked ? "연습으로 다시 풀기" : "시험 시작"}</button>
          )}
          <Link className="btn line" href={`/mock/${id}/rank`}>랭킹 보기</Link>
          <Link className="btn line" href="/mock">목록</Link>
        </div>
      </section>
      {prev && prev.filter((p) => p.status === "done").length > 0 && (
        <section className="panel">
          <div className="panel-head"><h2>내 응시 기록</h2></div>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>언제</th><th>구분</th><th className="r">맞힘</th><th className="r">시간</th><th className="r">점수</th><th /></tr></thead>
            <tbody>
              {prev.filter((p) => p.status === "done").map((p) => (
                <tr key={p.id}>
                  <td className="small">{p.submitted_at ? new Date(p.submitted_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                  <td className="small">{p.ranked ? <b>랭킹</b> : "연습"}</td>
                  <td className="r n">{p.correct}/{p.total}</td>
                  <td className="r n">{minsec(p.elapsed ?? 0)}</td>
                  <td className="r n"><b>{p.score}</b></td>
                  <td className="r"><button type="button" className="btn line mini" onClick={() => openResult(p.id)}>풀이 보기</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
