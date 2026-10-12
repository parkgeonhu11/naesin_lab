"use client";
import { useEffect, useState } from "react";
import { isConfigured, sb } from "@/lib/supabase";
import type { BoardRow } from "@/lib/data";

export default function Top5({ myId }: { myId?: string }) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    const load = async () => {
      const { data } = await sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 5 });
      if (alive) setRows((data as BoardRow[]) ?? []);
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <section className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 className="h2" style={{ color: "var(--omr)" }}>TOP 5</h2>
        <span className="small muted">전체 누적 점수 · 20초마다 새로고침</span>
      </div>
      <ol className="p-list">
        {rows === null && <li className="p-empty">랭킹 불러오는 중…</li>}
        {rows?.length === 0 && <li className="p-empty">아직 아무도 점수가 없어. 첫 문제를 맞히면 1위!</li>}
        {rows?.map((r) => (
          <li key={r.user_id} className={`${r.rank === 1 ? "first" : ""} ${r.user_id === myId ? "mine" : ""}`}>
            <span className="p-rk">{r.rank}</span>
            <span className="p-nm">
              {r.nickname}
              {r.user_id === myId ? " (나)" : ""}
            </span>
            <span className="num muted">{r.points}점</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
