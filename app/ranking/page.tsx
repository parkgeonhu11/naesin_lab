"use client";
import { useEffect, useState } from "react";
import { SUBJECTS, type BoardRow } from "@/lib/data";
import { isConfigured, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function RankingPage() {
  const { user } = useMe();
  const [scope, setScope] = useState("all");
  const [period, setPeriod] = useState<"all" | "week">("all");
  const [rows, setRows] = useState<BoardRow[] | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    const load = async () => {
      const { data } = await sb().rpc("leaderboard", { p_subject: scope, p_period: period, p_limit: 200 });
      if (alive) setRows((data as BoardRow[]) ?? []);
    };
    setRows(null);
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [scope, period]);

  return (
    <div className="stack">
      <div className="row">
        <h1 className="h2" style={{ fontSize: 28 }}>랭킹</h1>
        <span className="small muted">주간 랭킹은 매주 월요일 0시(한국 시간)에 새로 시작해. 누적 점수는 그대로야.</span>
      </div>
      <div className="tabs">
        <button className="tab" aria-pressed={period === "all"} onClick={() => setPeriod("all")}>누적</button>
        <button className="tab" aria-pressed={period === "week"} onClick={() => setPeriod("week")}>이번 주</button>
      </div>
      <div className="tabs">
        {[{ code: "all", name: "전체" }, ...SUBJECTS].map((s) => (
          <button key={s.code} className="tab" aria-pressed={scope === s.code} onClick={() => setScope(s.code)}>
            {s.name}
          </button>
        ))}
      </div>
      <section className="card scroll">
        <table className="t">
          <thead>
            <tr><th>순위</th><th>닉네임</th><th>점수</th><th>맞힌 문제</th></tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={4} className="muted">불러오는 중…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={4} className="muted">아직 점수가 있는 사람이 없어.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.user_id} className={r.user_id === user?.id ? "mine" : ""}>
                <td className="n">{r.rank}</td>
                <td>{r.nickname}{r.user_id === user?.id ? " (나)" : ""}</td>
                <td className="n">{r.points}</td>
                <td className="n">{r.solved}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {scope === "all" && <p className="small muted" style={{ marginBottom: 0 }}>전체 점수에는 문제 제안 보너스(승인된 문제당 +5점)도 포함돼.</p>}
      </section>
    </div>
  );
}
