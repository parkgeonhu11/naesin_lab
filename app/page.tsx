"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import NicknameCard from "@/components/NicknameCard";
import { ResultText } from "@/components/Badges";
import { ago, SUBJECTS, type BoardRow, type ProblemRow, type Submission } from "@/lib/data";
import { isConfigured, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { useRowLink } from "@/lib/useRowLink";

export default function Home() {
  const { user, nickname, error, ready, saveNickname } = useMe();
  const rowLink = useRowLink();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [top, setTop] = useState<BoardRow[] | null>(null);
  const [recent, setRecent] = useState<Submission[] | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    const load = async () => {
      const [{ data: probs }, { data: board }, { data: subs }] = await Promise.all([
        sb().rpc("problem_list"),
        sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 5 }),
        sb().rpc("recent_submissions", { p_limit: 8, p_only_me: false }),
      ]);
      if (!alive) return;
      const c: Record<string, number> = {};
      ((probs as ProblemRow[]) ?? []).forEach((p) => (c[p.subject] = (c[p.subject] ?? 0) + 1));
      setCounts(c);
      setTotal(((probs as ProblemRow[]) ?? []).length);
      setTop((board as BoardRow[]) ?? []);
      setRecent((subs as Submission[]) ?? []);
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user]);

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      {ready && user && !nickname && <NicknameCard current={nickname} onSave={saveNickname} />}

      <div className="home-grid">
        <div style={{ display: "grid", gap: 20 }}>
          <section className="panel intro">
            <h1>단원별로 풀고, 틀린 건 다시, 랭킹까지</h1>
            <p>회원가입 없이 바로 시작해. 과목 → 대단원 → 세부 유형별로 문제를 고르거나, 범위를 정해 시험지를 만들어 풀 수 있어. 틀린 문제는 오답 노트에 모여.</p>
            <div className="row">
              <Link href="/problems" className="btn">문제 풀러 가기</Link>
              <Link href="/exam" className="btn line">시험지 만들기</Link>
              <Link href="/review" className="btn line">오답 노트</Link>
              <span className="small faint">{total ? `전체 ${total}문제` : "아직 문제가 없어. 문제가 올라오면 여기서 바로 풀 수 있어."}</span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>과목별 문제</h2>
              <Link href="/problems" className="more">전체 보기</Link>
            </div>
            <div className="subj-grid">
              {SUBJECTS.map((s) => (
                <Link key={s.code} href={`/problems?subject=${s.code}`} className="subj-cell">
                  <b>{s.name}</b>
                  <span>{counts[s.code] ?? 0}문제</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>최근 채점</h2>
              <Link href="/status" className="more">채점 현황</Link>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>닉네임</th><th>문제</th><th>결과</th><th className="r">시간</th></tr>
                </thead>
                <tbody>
                  {recent === null && <tr><td colSpan={4} className="empty-cell">불러오는 중…</td></tr>}
                  {recent?.length === 0 && <tr><td colSpan={4} className="empty-cell">아직 제출이 없어. 첫 번째로 풀어 봐!</td></tr>}
                  {recent?.map((s) => (
                    <tr key={s.id} {...rowLink(`/problem/${s.problem_no}`, s.is_me ? "mine" : "")}>
                      <td>{s.nickname}</td>
                      <td><Link className="link" href={`/problem/${s.problem_no}`}>{s.problem_no}</Link></td>
                      <td><ResultText correct={s.is_correct} /></td>
                      <td className="r faint small">{ago(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <section className="panel">
            <div className="panel-head">
              <h2>TOP 5</h2>
              <Link href="/ranking" className="more">전체 랭킹</Link>
            </div>
            <table className="tbl">
              <thead><tr><th className="c">순위</th><th>닉네임</th><th className="r">점수</th></tr></thead>
              <tbody>
                {top === null && <tr><td colSpan={3} className="empty-cell">불러오는 중…</td></tr>}
                {top?.length === 0 && <tr><td colSpan={3} className="empty-cell">첫 문제를 맞히면 1위!</td></tr>}
                {top?.map((r) => (
                  <tr key={r.user_id} className={r.user_id === user?.id ? "mine" : ""}>
                    <td className="c n"><b>{r.rank}</b></td>
                    <td>{r.nickname}{r.user_id === user?.id ? " (나)" : ""}</td>
                    <td className="r n">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>이용 방법</h2></div>
            <div className="panel-body">
              <ol className="howto">
                <li><b>문제</b>에서 과목 → 단원 → 유형을 골라 풀거나, <b>시험지</b>로 한 번에 풀어.</li>
                <li>객관식은 보기를, 단답형은 답을 써서 <b>제출</b>. 바로 채점돼.</li>
                <li>틀린 문제는 <b>오답 노트</b>에, 약한 유형은 <b>내 정보</b>에 보여.</li>
                <li>처음 맞히면 <b>만점</b>, 틀린 뒤 맞히면 <b>절반</b>.</li>
                <li>점수: 매우 쉬움 5 · 쉬움 10 · 보통 20 · 어려움 35 · 최상위 50</li>
                <li>직접 만든 문제를 <b>제안</b>해서 승인되면 +5점.</li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
