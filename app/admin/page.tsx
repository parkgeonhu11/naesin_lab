"use client";
import { useCallback, useEffect, useState } from "react";
import { DiffBadge, TypeBadge } from "@/components/Badges";
import CategoryManager from "@/components/CategoryManager";
import QuestionForm from "@/components/QuestionForm";
import { DIFF, subjectName } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Pending = { id: string; subject: string; unit: string; topic: string; qtype: string; difficulty: number; body: string; choices: string[]; answer: number | null; answer_text: string | null; explanation: string; author_nick: string };
type Stat = { user_id: string; nickname: string; total: number; week: number; answered: number; correct: number; gave_up: number; wrong_tries: number };

export default function AdminPage() {
  const { user, ready } = useMe();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [armed, setArmed] = useState(false);
  const [diffFix, setDiffFix] = useState<Record<string, number>>({});

  const emailUser = user && !user.is_anonymous && user.email;

  const loadAll = useCallback(async () => {
    const [{ data: p }, { data: s }] = await Promise.all([sb().rpc("admin_pending"), sb().rpc("admin_stats")]);
    setPending((p as Pending[]) ?? []);
    setStats((s as Stat[]) ?? []);
  }, []);

  useEffect(() => {
    if (!emailUser) { setIsAdmin(false); return; }
    sb().rpc("is_admin").then(({ data }) => {
      setIsAdmin(!!data);
      if (data) loadAll();
    });
  }, [emailUser, loadAll]);

  if (!ready) return <p className="muted">불러오는 중…</p>;

  if (!emailUser) {
    return (
      <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
        <div className="page-title"><h1>관리자 로그인</h1></div>
        <p className="muted small" style={{ margin: 0 }}>
          관리자 이메일을 입력하면 로그인 링크가 메일로 와. 메일의 링크를 이 기기에서 누르면 관리자 화면이 열려.
          이 브라우저에서 풀던 학생용 익명 기록은 로그인하면 이 기기에서 더 이상 이어지지 않으니, 관리용 브라우저를 따로 쓰는 걸 추천해.
        </p>
        <form
          className="panel panel-body row"
          onSubmit={async (e) => {
            e.preventDefault();
            setMsg("메일 보내는 중…");
            const { error } = await sb().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${location.origin}/admin` } });
            setMsg(error ? friendly(error) : "메일을 보냈어. 받은편지함(또는 스팸함)을 확인해 줘.");
          }}
        >
          <input id="adminEmail" className="input" style={{ flex: "1 1 220px" }} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" />
          <button className="btn">로그인 링크 받기</button>
          {msg && <span className="small muted" style={{ flexBasis: "100%" }}>{msg}</span>}
        </form>
      </div>
    );
  }

  if (isAdmin === null) return <p className="muted">권한 확인 중…</p>;
  if (!isAdmin) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div className="notice warn">{user?.email} 계정은 관리자로 등록돼 있지 않아. 설치 안내서 3단계(관리자 이메일 등록)를 확인해 줘.</div>
        <button className="btn line" onClick={() => sb().auth.signOut().then(() => location.assign("/"))}>로그아웃</button>
      </div>
    );
  }

  return (
    <>
      <div className="page-title">
        <h1>관리자</h1>
        <span className="small muted">{user?.email}</span>
        <button className="btn line" style={{ marginLeft: "auto" }} onClick={() => sb().auth.signOut().then(() => location.assign("/"))}>로그아웃</button>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>검토 대기 문제 <span className="num muted">{pending.length}</span></h2></div>
        <div className="panel-body" style={{ display: "grid", gap: 10 }}>
        {pending.length === 0 && <p className="muted small" style={{ margin: 0 }}>검토할 문제가 없어.</p>}
        {pending.map((q) => (
          <article key={q.id} className="panel panel-body" style={{ background: "var(--head)" }}>
            <div className="row small muted" style={{ gap: 6, marginBottom: 6 }}>
              <span className="badge subj">{subjectName(q.subject)}</span>
              <TypeBadge type={q.qtype} />
              <DiffBadge level={q.difficulty} />
              <span>{[q.unit, q.topic].filter(Boolean).join(" › ")}</span>
              <span>{q.author_nick || "익명"} 제안</span>
            </div>
            <p className="statement" style={{ fontSize: 15, marginBottom: 8 }}>{q.body}</p>
            {q.qtype === "short" ? (
              <p style={{ margin: "0 0 8px" }}>정답: <span className="answer-box">{q.answer_text}</span> <span className="small faint">(| 로 나눈 답은 모두 정답 처리)</span></p>
            ) : (
              <ol style={{ margin: "0 0 8px", paddingLeft: 20 }}>
                {q.choices.map((c, i) => (
                  <li key={i} style={i === q.answer ? { color: "var(--ac)", fontWeight: 700 } : undefined}>{c}{i === q.answer ? " ← 정답" : ""}</li>
                ))}
              </ol>
            )}
            {q.explanation && <p className="small muted" style={{ marginTop: 0 }}>해설: {q.explanation}</p>}
            <div className="row">
              <label className="small muted" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>난이도
                <select className="input" style={{ width: "auto" }} value={diffFix[q.id] ?? q.difficulty} onChange={(e) => setDiffFix({ ...diffFix, [q.id]: +e.target.value })}>
                  {DIFF.map((d) => <option key={d.level} value={d.level}>{d.label} · {d.points}점</option>)}
                </select>
              </label>
              <button className="btn" onClick={async () => { const { error } = await sb().rpc("admin_review", { p_question: q.id, p_approve: true, p_difficulty: diffFix[q.id] ?? q.difficulty }); if (error) setMsg(friendly(error)); loadAll(); }}>승인 (+5점 지급)</button>
              <button className="btn line" onClick={async () => { const { error } = await sb().rpc("admin_review", { p_question: q.id, p_approve: false, p_difficulty: null }); if (error) setMsg(friendly(error)); loadAll(); }}>반려</button>
            </div>
          </article>
        ))}
        {msg && <p className="small res-wa">{msg}</p>}
        </div>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>문제 직접 추가 (바로 공개)</h2>
        <QuestionForm
          maxDifficulty={5}
          showSource
          submitLabel="공개하기"
          onSubmit={async (q) => {
            const { error } = await sb().rpc("admin_add_question", {
              p_subject: q.subject, p_unit: q.unit, p_topic: q.topic, p_qtype: q.qtype, p_difficulty: q.difficulty, p_body: q.body,
              p_choices: q.choices, p_answer: q.answer, p_answer_text: q.answerText, p_explanation: q.explanation, p_source: q.source,
            });
            if (error) throw error;
            return "공개했어.";
          }}
        />
      </section>

      <CategoryManager />

      <section className="panel">
        <div className="panel-head"><h2>참가자 현황 <span className="num muted">{stats.length}명</span></h2></div>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>닉네임</th><th>누적</th><th>이번 주</th><th>푼 문제</th><th>맞힘</th><th>정답 보기</th><th>오답 시도</th></tr></thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.user_id}>
                <td>{s.nickname}</td><td className="n">{s.total}</td><td className="n">{s.week}</td><td className="n">{s.answered}</td>
                <td className="n">{s.correct}</td><td className="n">{s.gave_up}</td><td className="n">{s.wrong_tries}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section className="panel panel-body row">
        <button
          className={`btn ${armed ? "danger" : "line"}`}
          onClick={async () => {
            if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
            setArmed(false);
            const { error } = await sb().rpc("admin_reset_all");
            setMsg(error ? friendly(error) : "전체 초기화했어.");
            loadAll();
          }}
        >
          {armed ? "정말 초기화하려면 한 번 더 누르기" : "전체 랭킹 초기화"}
        </button>
        <span className="small muted">모든 풀이 기록과 문제 점수를 지워. 닉네임과 문제 제안 보너스는 남아.</span>
      </section>
    </>
  );
}
