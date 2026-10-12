"use client";
import { useEffect, useState } from "react";
import NicknameCard from "@/components/NicknameCard";
import { SUBJECTS, type BoardRow, type Progress } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function MePage() {
  const { user, nickname, error, saveNickname } = useMe();
  const [stats, setStats] = useState<{ total: number; rank: number | null; week: number; solved: number; zero: number; bySub: Record<string, number> } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: all }, { data: week }, { data: prog }, { data: qs }] = await Promise.all([
        sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 500 }),
        sb().rpc("leaderboard", { p_subject: "all", p_period: "week", p_limit: 500 }),
        sb().rpc("my_progress"),
        sb().from("questions").select("id,subject").eq("status", "published"),
      ]);
      const mine = ((all as BoardRow[]) ?? []).find((r) => r.user_id === user.id);
      const wk = ((week as BoardRow[]) ?? []).find((r) => r.user_id === user.id);
      const subjOf: Record<string, string> = {};
      ((qs as { id: string; subject: string }[]) ?? []).forEach((q) => (subjOf[q.id] = q.subject));
      const bySub: Record<string, number> = {};
      let solved = 0, zero = 0;
      ((prog as Progress[]) ?? []).forEach((p) => {
        if (p.points == null) return;
        if (p.points > 0) solved++; else zero++;
        const s = subjOf[p.question_id];
        if (s) bySub[s] = (bySub[s] ?? 0) + p.points;
      });
      setStats({ total: mine?.points ?? 0, rank: mine?.rank ?? null, week: wk?.points ?? 0, solved, zero, bySub });
    })();
  }, [user]);

  return (
    <div className="stack">
      {error && <div className="notice">{error}</div>}
      <h1 className="h2" style={{ fontSize: 28 }}>내 기록</h1>
      <NicknameCard current={nickname} onSave={saveNickname} title={nickname ? `지금 닉네임: ${nickname}` : "닉네임을 정해 줘"} />
      <section className="card">
        <div className="mystat" style={{ marginTop: 0 }}>
          <div><b>{stats?.total ?? "–"}</b><small>누적 점수</small></div>
          <div><b>{stats?.rank ? `${stats.rank}위` : "–"}</b><small>전체 등수</small></div>
          <div><b>{stats?.week ?? "–"}</b><small>이번 주 점수</small></div>
          <div><b>{stats?.solved ?? "–"}</b><small>맞힌 문제</small></div>
          <div><b>{stats?.zero ?? "–"}</b><small>정답 보기로 넘긴 문제</small></div>
        </div>
      </section>
      <section className="card scroll">
        <table className="t">
          <thead><tr><th>과목</th><th>점수</th></tr></thead>
          <tbody>
            {SUBJECTS.map((s) => (
              <tr key={s.code}><td>{s.name}</td><td className="n">{stats?.bySub[s.code] ?? 0}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="notice">
        기록은 이 브라우저에 저장된 익명 계정에 묶여 있어. 브라우저 기록(쿠키·사이트 데이터)을 지우거나 다른 기기로 열면 새 계정으로 시작돼.
        같은 폰, 같은 브라우저로 들어오면 기록이 그대로 남아.
      </section>
    </div>
  );
}
