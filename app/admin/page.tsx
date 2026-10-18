"use client";
import { useCallback, useEffect, useState } from "react";
import { DiffBadge, TypeBadge } from "@/components/Badges";
import AdminAccounts from "@/components/AdminAccounts";
import { AdminGrants, GrantPanel } from "@/components/AdminGrant";
import AdminFairplay from "@/components/AdminFairplay";
import AdminQna from "@/components/AdminQna";
import AdminReports from "@/components/AdminReports";
import CategoryManager from "@/components/CategoryManager";
import QuestionForm from "@/components/QuestionForm";
import { ago, DIFF, subjectName } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Pending = { id: string; subject: string; unit: string; topic: string; qtype: string; difficulty: number; body: string; choices: string[]; answer: number | null; answer_text: string | null; explanation: string; author_nick: string };
type Banned = { word: string; kind: string; active: boolean };
const KIND: Record<string, string> = { bad: "욕설·비속어", adult: "19금", hate: "비하·혐오", reserved: "사칭(관리자 등)", allow: "예외(허용)" };
type Stat = { user_id: string; nickname: string; total: number; week: number; solved: number; gave_up: number; submissions: number; correct_submissions: number; penalty: number; last_at: string | null };

export default function AdminPage() {
  const { user, ready, nickname } = useMe();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [armed, setArmed] = useState(false);
  const [armedUser, setArmedUser] = useState<string | null>(null);
  const [diffFix, setDiffFix] = useState<Record<string, number>>({});
  const [armedNick, setArmedNick] = useState<string | null>(null);
  const [banned, setBanned] = useState<Banned[]>([]);
  const [word, setWord] = useState("");
  const [kind, setKind] = useState("bad");
  const [wordMsg, setWordMsg] = useState("");
  const [qGrade, setQGrade] = useState(3);
  const [qSchool, setQSchool] = useState("seoyeon");
  const [schools, setSchools] = useState<{ id: string; name: string; students: number }[]>([]);
  useEffect(() => { sb().rpc("school_search", { p_q: "" }).then(({ data }) => setSchools((data as { id: string; name: string; students: number }[]) ?? [])); }, []);

  const emailUser = user && !user.is_anonymous && user.email;

  const loadAll = useCallback(async () => {
    const [{ data: p }, { data: s }, { data: b }] = await Promise.all([sb().rpc("admin_pending"), sb().rpc("admin_user_stats"), sb().rpc("admin_banned_words")]);
    setPending((p as Pending[]) ?? []);
    setStats((s as Stat[]) ?? []);
    setBanned((b as Banned[]) ?? []);
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

      <AdminReports />

      <AdminFairplay />
      <AdminQna />

      {user && <GrantPanel userId={user.id} nickname={`${nickname ?? "나"} (내 계정)`} />}
      <AdminGrants />

      <AdminAccounts />

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
        <div className="row small" style={{ alignItems: "center" }}>
          <span className="muted">대상</span>
          <div className="seg" role="radiogroup" aria-label="학년">
            {[1, 2, 3].map((n) => <button key={n} type="button" role="radio" aria-checked={qGrade === n} onClick={() => setQGrade(n)}>{n}학년</button>)}
          </div>
          <select id="q-school" className="input" style={{ width: "auto" }} value={qSchool} onChange={(e) => setQSchool(e.target.value)}>
            <option value="">모든 학교 공통</option>
            {schools.map((x) => <option key={x.id} value={x.id}>{x.name} 전용 ({x.students}명)</option>)}
          </select>
        </div>
        <QuestionForm
          maxDifficulty={5}
          showSource
          submitLabel="공개하기"
          onSubmit={async (q) => {
            const { data: qid, error } = await sb().rpc("admin_add_question", {
              p_subject: q.subject, p_unit: q.unit, p_topic: q.topic, p_qtype: q.qtype, p_difficulty: q.difficulty, p_body: q.body,
              p_choices: q.choices, p_answer: q.answer, p_answer_text: q.answerText, p_explanation: q.explanation, p_source: q.source,
            });
            if (error) throw error;
            const { error: e2 } = await sb().rpc("admin_set_question_scope", { p_question: qid, p_grade: qGrade, p_school: qSchool || null });
            if (e2) throw e2;
            return "공개했어.";
          }}
        />
      </section>

      <CategoryManager />

      <section className="panel">
        <div className="panel-head"><h2>참가자 현황 <span className="num muted">{stats.length}명</span></h2><span className="small faint">평균 정답률 = 맞은 제출 ÷ 전체 제출 · 초기화하면 풀이 점수·감점·제출 기록이 지워지고 닉네임과 제안 보너스는 남아</span></div>
        <div className="table-wrap"><table className="tbl">
          <thead><tr>
            <th>닉네임</th><th className="r">누적 점수</th><th className="r">이번 주</th><th className="r">맞힌 문제</th><th className="r">제출 횟수</th>
            <th className="r">평균 정답률</th><th className="r">감점</th><th className="r">정답 보기</th><th>마지막 제출</th><th className="c">별명</th><th className="c">이 사람만 초기화</th>
          </tr></thead>
          <tbody>
            {stats.length === 0 && <tr><td colSpan={11} className="empty-cell">아직 참가자가 없어.</td></tr>}
            {stats.map((s) => (
              <tr key={s.user_id}>
                <td>{s.nickname}</td>
                <td className="r n"><b>{s.total}</b></td>
                <td className="r n">{s.week}</td>
                <td className="r n">{s.solved}</td>
                <td className="r n">{s.submissions}</td>
                <td className="r n">{s.submissions ? `${Math.round((100 * s.correct_submissions) / s.submissions)}%` : "–"}</td>
                <td className="r n res-wa">{s.penalty ? `−${s.penalty}` : "0"}</td>
                <td className="r n">{s.gave_up}</td>
                <td className="small faint nowrap">{s.last_at ? ago(s.last_at) : "–"}</td>
                <td className="c">
                  <button
                    className={`btn ${armedNick === s.user_id ? "danger" : "line"}`}
                    style={{ padding: "3px 10px", fontSize: 12.5, minHeight: 0 }}
                    title="부적절한 별명이면 초기화해. 그 학생은 다음에 들어올 때 새 별명을 정해야 해."
                    onClick={async () => {
                      if (armedNick !== s.user_id) { setArmedNick(s.user_id); setTimeout(() => setArmedNick((u) => (u === s.user_id ? null : u)), 4000); return; }
                      setArmedNick(null);
                      const { error } = await sb().rpc("admin_reset_nickname", { p_user: s.user_id });
                      setMsg(error ? friendly(error) : `${s.nickname}의 별명을 초기화했어. 새 별명을 정할 때까지 '별명 변경 중'으로 보여.`);
                      loadAll();
                    }}
                  >
                    {armedNick === s.user_id ? "한 번 더" : "별명 초기화"}
                  </button>
                </td>
                <td className="c">
                  <button
                    className={`btn ${armedUser === s.user_id ? "danger" : "line"}`}
                    style={{ padding: "3px 10px", fontSize: 12.5, minHeight: 0 }}
                    onClick={async () => {
                      if (armedUser !== s.user_id) { setArmedUser(s.user_id); setTimeout(() => setArmedUser((u) => (u === s.user_id ? null : u)), 4000); return; }
                      setArmedUser(null);
                      const { error } = await sb().rpc("admin_reset_user", { p_user: s.user_id });
                      setMsg(error ? friendly(error) : `${s.nickname}의 기록을 초기화했어.`);
                      loadAll();
                    }}
                  >
                    {armedUser === s.user_id ? "한 번 더 누르면 초기화" : "초기화"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {msg && <p className="small muted" style={{ margin: 0, padding: "10px 16px" }}>{msg}</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>별명 금지어 <span className="num muted">{banned.filter((b) => b.active).length}개</span></h2>
          <span className="small faint">별명은 저장할 때 자동으로 검수돼. 띄어쓰기·숫자·기호를 섞어도(예: 시 1 발) 잡아. 학생에게는 목록이 안 보여.</span>
        </div>
        <form
          className="panel-body row"
          onSubmit={async (e) => {
            e.preventDefault();
            const { data, error } = await sb().rpc("admin_add_banned_word", { p_word: word, p_kind: kind });
            setWordMsg(error ? friendly(error) : `추가했어.${data ? ` 지금 쓰는 별명 중 ${data}개가 걸려서 바꾸게 했어.` : ""}`);
            if (!error) setWord("");
            loadAll();
          }}
        >
          <input className="input" style={{ flex: "1 1 180px" }} value={word} onChange={(e) => setWord(e.target.value)} placeholder="막을 단어" required />
          <select className="input" style={{ width: "auto" }} value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn">추가</button>
          {wordMsg && <span className="small muted" style={{ flexBasis: "100%" }}>{wordMsg}</span>}
        </form>
        <details className="panel-body" style={{ paddingTop: 0 }}>
          <summary className="small muted" style={{ cursor: "pointer" }}>목록 보기 (누르면 끄고 켤 수 있어)</summary>
          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            {banned.map((b) => (
              <button
                key={b.word}
                type="button"
                className="badge subj"
                style={{ border: 0, cursor: "pointer", textDecoration: b.active ? undefined : "line-through", opacity: b.active ? 1 : 0.5 }}
                title={`${KIND[b.kind] ?? b.kind} · ${b.active ? "누르면 끄기" : "누르면 켜기"}`}
                onClick={async () => { await sb().rpc("admin_set_banned_word", { p_word: b.word, p_active: !b.active }); loadAll(); }}
              >
                {b.word}
              </button>
            ))}
          </div>
        </details>
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
