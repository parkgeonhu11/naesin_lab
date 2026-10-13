"use client";
import Link from "next/link";
import { useRowLink } from "@/lib/useRowLink";
import { useEffect, useState } from "react";
import { FramedAvatar, useFrames } from "@/components/Framed";
import { SUBJECTS, type BoardRow } from "@/lib/data";
import { isConfigured, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function RankingPage() {
  const { user } = useMe();
  const rowLink = useRowLink();
  const frameFor = useFrames();
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
    <>
      <div className="page-title">
        <h1>랭킹</h1>
        <span className="muted small">주간 랭킹은 매주 월요일 0시에 새로 시작해. 누적 점수는 그대로야.</span>
      </div>
      <section className="panel">
        <div className="tabs">
          <button aria-pressed={period === "all"} onClick={() => setPeriod("all")}>누적</button>
          <button aria-pressed={period === "week"} onClick={() => setPeriod("week")}>이번 주</button>
        </div>
        <div className="tabs">
          {[{ code: "all", name: "전체" }, ...SUBJECTS].map((s) => (
            <button key={s.code} aria-pressed={scope === s.code} onClick={() => setScope(s.code)}>{s.name}</button>
          ))}
        </div>
        {rows && rows.length > 0 && (
          <div className="podium" aria-label="1~3위">
            {[1, 0, 2].map((i) => {
              const r = rows[i];
              return (
                <div key={i} className={`pod p${i + 1} ${r ? "" : "empty"}`}>
                  {r && <Link href={`/user/${r.user_id}`} className="pod-link" aria-label={`${r.nickname}이(가) 푼 문제 보기`} />}
                  <FramedAvatar name={r?.nickname ?? "?"} frame={r ? frameFor(r.user_id) : null} />
                  <b>{r ? r.nickname + (r.user_id === user?.id ? " (나)" : "") : "비어 있음"}</b>
                  <small>{r ? `${r.points}점 · ${r.solved}문제` : "도전해 봐"}</small>
                  <div className="step">{i + 1}</div>
                </div>
              );
            })}
          </div>
        )}
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th className="c">순위</th><th>닉네임</th><th className="r">점수</th><th className="r">맞힌 문제</th><th className="r hide-m">제출</th><th className="r">정답률</th></tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={6} className="empty-cell">불러오는 중…</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={6} className="empty-cell">아직 점수가 있는 사람이 없어.</td></tr>}
              {rows?.map((r) => (
                <tr key={r.user_id} {...rowLink(`/user/${r.user_id}`, r.user_id === user?.id ? "mine" : "")}>
                  <td className="c n"><span className={`medal m${r.rank}`} style={{ margin: "0 auto" }}>{r.rank}</span></td>
                  <td><Link className="cell-link rank-name" href={`/user/${r.user_id}`}><FramedAvatar name={r.nickname} frame={frameFor(r.user_id)} /><span>{r.nickname}{r.user_id === user?.id ? " (나)" : ""}</span></Link></td>
                  <td className="r n"><b>{r.points}</b></td>
                  <td className="r n">{r.solved}</td>
                  <td className="r n hide-m">{r.submissions}</td>
                  <td className="r n">{r.submissions ? `${Math.round((100 * r.solved) / r.submissions)}%` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {scope === "all" && <p className="small faint" style={{ margin: 0 }}>전체 점수에는 문제 제안 보너스(승인된 문제당 +5점)도 들어가.</p>}
    </>
  );
}
