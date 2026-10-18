"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NameBadges, FramedAvatar, useFrames } from "@/components/Framed";
import { minsec, type MockBoardRow, type MockExam } from "@/lib/mock";
import { isConfigured, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { useRowLink } from "@/lib/useRowLink";

export default function MockRankPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useMe();
  const rowLink = useRowLink();
  const frameFor = useFrames();
  const [rows, setRows] = useState<MockBoardRow[] | null>(null);
  const [exam, setExam] = useState<MockExam | null>(null);
  const [all, setAll] = useState<MockExam[]>([]);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    const load = async () => {
      const [{ data: b }, { data: l }] = await Promise.all([sb().rpc("mock_board", { p_exam: id, p_limit: 200 }), sb().rpc("mock_list_v2")]);
      if (!alive) return;
      setRows((b as MockBoardRow[]) ?? []);
      const list = (l as MockExam[]) ?? [];
      setAll(list);
      setExam(list.find((e) => e.id === id) ?? null);
    };
    setRows(null);
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  const me = rows?.find((r) => r.user_id === user?.id);

  return (
    <>
      <div className="page-title">
        <h1>{exam?.title ?? "예상 시험"} 랭킹</h1>
        <span className="muted small">첫 번째 응시 기준 · 맞은 개수 × 100 + 시간 보너스</span>
      </div>
      <section className="panel">
        <div className="tabs">
          {all.map((e) => (
            <Link key={e.id} href={`/mock/${e.id}/rank`} aria-pressed={e.id === id}>{e.title.replace(" 기말 예상 시험", "")}</Link>
          ))}
        </div>
        {rows && rows.length > 0 && (
          <div className="podium" aria-label="1~3위">
            {[1, 0, 2].map((i) => {
              const r = rows[i];
              return (
                <div key={i} className={`pod p${i + 1} ${r ? "" : "empty"}`}>
                  {r && <Link href={`/user/${r.user_id}`} className="pod-link" aria-label={`${r.nickname} 프로필`} />}
                  <FramedAvatar name={r?.nickname ?? "?"} frame={r ? frameFor(r.user_id) : null} />
                  <b>{r ? r.nickname + (r.user_id === user?.id ? " (나)" : "") : "비어 있음"}</b>
                  {r && <span className="pod-badges"><NameBadges id={r.user_id} max={2} /></span>}
                  <small>{r ? `${r.correct}/${r.total} · ${minsec(r.elapsed)}` : "도전해 봐"}</small>
                  <div className="step">{i + 1}</div>
                </div>
              );
            })}
          </div>
        )}
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th className="c">순위</th><th>닉네임</th><th className="r">점수</th><th className="r">맞힘</th><th className="r">시간</th><th className="hide-m">제출</th></tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={6} className="empty-cell">불러오는 중…</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={6} className="empty-cell">아직 이 시험을 본 사람이 없어. 첫 번째가 돼 봐!</td></tr>}
              {rows?.map((r) => (
                <tr key={r.user_id} {...rowLink(`/user/${r.user_id}`, r.user_id === user?.id ? "mine" : "")}>
                  <td className="c n"><span className={`medal m${r.rank}`} style={{ margin: "0 auto" }}>{r.rank}</span></td>
                  <td><Link className="cell-link rank-name" href={`/user/${r.user_id}`}><FramedAvatar name={r.nickname} frame={frameFor(r.user_id)} /><span>{r.nickname}{r.user_id === user?.id ? " (나)" : ""}<NameBadges id={r.user_id} /></span></Link></td>
                  <td className="r n"><b>{r.score}</b></td>
                  <td className="r n">{r.correct}/{r.total}</td>
                  <td className="r n">{minsec(r.elapsed)}</td>
                  <td className="small faint hide-m">{new Date(r.submitted_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="row">
        {!me && exam && exam.my_status !== "done" && <Link className="btn" href={`/mock/${id}`}>{exam.my_status === "running" ? "이어서 풀기" : "이 시험 보러 가기"}</Link>}
        {me && <span className="small muted">내 순위 <b>{me.rank}위</b> · {me.score}점</span>}
        <Link className="btn line" href="/mock">예상 시험 목록</Link>
      </div>
    </>
  );
}
