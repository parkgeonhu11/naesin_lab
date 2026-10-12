"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ResultText, SubjBadge } from "@/components/Badges";
import { ago, type Submission } from "@/lib/data";
import { isConfigured, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function StatusPage() {
  const { user } = useMe();
  const [onlyMe, setOnlyMe] = useState(false);
  const [rows, setRows] = useState<Submission[] | null>(null);

  useEffect(() => {
    if (!isConfigured || (onlyMe && !user)) return;
    let alive = true;
    const load = async () => {
      const { data } = await sb().rpc("recent_submissions", { p_limit: 100, p_only_me: onlyMe });
      if (alive) setRows((data as Submission[]) ?? []);
    };
    setRows(null);
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [onlyMe, user]);

  return (
    <>
      <div className="page-title">
        <h1>채점 현황</h1>
        <span className="muted small">최근 제출 100개 · 15초마다 새로고침 · 고른 답은 공개되지 않아</span>
      </div>
      <section className="panel">
        <div className="tabs">
          <button aria-pressed={!onlyMe} onClick={() => setOnlyMe(false)}>전체</button>
          <button aria-pressed={onlyMe} onClick={() => setOnlyMe(true)}>내 제출</button>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="c hide-m">제출 번호</th><th>닉네임</th><th className="c">문제</th><th className="hide-m">제목</th><th className="hide-m">과목</th><th>결과</th><th className="r">제출 시간</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={7} className="empty-cell">불러오는 중…</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={7} className="empty-cell">아직 제출이 없어.</td></tr>}
              {rows?.map((s) => (
                <tr key={s.id} className={s.is_me ? "mine" : ""}>
                  <td className="c n faint hide-m">{s.id}</td>
                  <td>{s.nickname}</td>
                  <td className="c n"><Link className="link" href={`/problem/${s.problem_no}`}>{s.problem_no}</Link></td>
                  <td className="title-cell hide-m" style={{ maxWidth: 260 }}>{s.title}</td>
                  <td className="hide-m"><SubjBadge code={s.subject} /></td>
                  <td className="nowrap"><ResultText correct={s.is_correct} /></td>
                  <td className="r small faint" title={new Date(s.created_at).toLocaleString("ko-KR")}>{ago(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
