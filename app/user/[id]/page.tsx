"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DiffBadge, SubjBadge } from "@/components/Badges";
import { GrantPanel } from "@/components/AdminGrant";
import { NameBadges, FrameChip, FramedAvatar, TitleChip, useAdmins, useFrames } from "@/components/Framed";
import { ago, levelOf, SUBJECTS, subjectName, accOf } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { useRowLink } from "@/lib/useRowLink";

type Solved = { no: number; subject: string; unit: string; topic: string; difficulty: number; title: string; points: number; at: string };
type Info = { nickname: string; is_me: boolean; points: number; submissions: number; correct: number; solved: Solved[] };

/** 다른 친구가 맞힌 문제 목록 (랭킹에서 이름을 누르면 옴) */
export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useMe();
  const rowLink = useRowLink();
  const [info, setInfo] = useState<Info | null | undefined>(undefined);
  const frameFor = useFrames();
  const [subject, setSubject] = useState("all");
  const [prog, setProg] = useState<{ subject: string; solved: number; total: number }[]>([]);
  const isAdmin = useAdmins();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    sb().rpc("user_solved", { p_user: id }).then(({ data }) => setInfo((data as Info) ?? null));
    sb().rpc("title_progress", { p_user: id }).then(({ data }) => setProg(((data as { subject: string; solved: number; total: number }[]) ?? []).map((r) => ({ ...r, solved: Number(r.solved), total: Number(r.total) }))));
  }, [user, id, tick]);

  const bySubj = useMemo(() => {
    const m: Record<string, number> = {};
    (info?.solved ?? []).forEach((s) => (m[s.subject] = (m[s.subject] ?? 0) + 1));
    return m;
  }, [info]);
  const list = (info?.solved ?? []).filter((s) => subject === "all" || s.subject === subject);

  if (info === undefined) return <p className="muted">불러오는 중…</p>;
  if (info === null) return <div className="notice warn">이 친구의 기록을 볼 수 없어. <Link className="link" href="/ranking">랭킹으로</Link></div>;
  const lv = levelOf(info.points).lv;
  const frame = frameFor(id);

  return (
    <>
      <div className="page-title user-head">
        <FramedAvatar name={info.nickname} className="big" frame={frame} />
        <h1>{info.nickname}{info.is_me ? " (나)" : ""} <span className="lv-chip">Lv.{lv}</span><NameBadges id={id} max={7} /><FrameChip frame={frame} /></h1>
        <Link className="btn line" style={{ marginLeft: "auto" }} href="/ranking">← 랭킹</Link>
      </div>

      <section className="panel stat-row">
        <div className="stat"><small>점수</small><b>{info.points}</b></div>
        <div className="stat"><small>맞힌 문제</small><b>{info.solved.length}</b></div>
        <div className="stat"><small>제출</small><b>{info.submissions}</b></div>
        <div className="stat"><small>정답률</small><b>{(() => { const a = accOf(info.correct, info.submissions, isAdmin(id, info.nickname)); return a === null ? "–" : `${a}%`; })()}</b></div>
      </section>

      {user && isAdmin(user.id) && (
        <GrantPanel userId={id} nickname={info.nickname} onChanged={() => setTick((t) => t + 1)} />
      )}

      {prog.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>과목 마스터 칭호</h2>
            <span className="small muted">한 과목의 지금 있는 문제를 전부 맞히면 칭호가 붙어. 새 문제가 나오면 그것까지 풀어야 해.</span>
          </div>
          <div className="title-grid">
            {SUBJECTS.map((sj) => prog.find((r) => r.subject === sj.code)).filter((r): r is { subject: string; solved: number; total: number } => !!r).map((r) => {
              const done = r.solved >= r.total;
              return (
                <div key={r.subject} className={`title-card${done ? " done" : ""}`} data-s={r.subject}>
                  <div className="title-card-top">
                    {done ? <TitleChip subject={r.subject} /> : <b>{subjectName(r.subject)} 마스터</b>}
                    <span className="small num">{r.solved} / {r.total}</span>
                  </div>
                  <div className="title-bar"><i style={{ width: `${Math.min(100, (100 * r.solved) / r.total)}%` }} /></div>
                  <span className="small muted">{done ? "획득!" : `${r.total - r.solved}문제 남음`}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head"><h2>맞힌 문제 <span className="num muted">{list.length}</span></h2></div>
        <div className="tabs">
          <button aria-pressed={subject === "all"} onClick={() => setSubject("all")}>전체 {info.solved.length}</button>
          {SUBJECTS.filter((s) => bySubj[s.code]).map((s) => (
            <button key={s.code} aria-pressed={subject === s.code} onClick={() => setSubject(s.code)}>{s.name} {bySubj[s.code]}</button>
          ))}
        </div>
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th className="c" style={{ width: 64 }}>번호</th><th>문제</th><th className="hide-m">단원</th><th className="c">난이도</th><th className="r">받은 점수</th><th className="r hide-m">맞힌 때</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="empty-cell">아직 맞힌 문제가 없어.</td></tr>}
            {list.map((s) => (
              <tr key={s.no} {...rowLink(`/problem/${s.no}`)}>
                <td className="c n"><Link className="link" href={`/problem/${s.no}`}>{s.no}</Link></td>
                <td className="title-cell"><Link className="cell-link" href={`/problem/${s.no}`}>{s.title}</Link></td>
                <td className="unit-cell hide-m"><SubjBadge code={s.subject} /> <span className="small muted">{s.topic || s.unit || subjectName(s.subject)}</span></td>
                <td className="c nowrap"><DiffBadge level={s.difficulty} /></td>
                <td className="r n">+{s.points}</td>
                <td className="r small faint nowrap hide-m">{ago(s.at)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
      <p className="small faint" style={{ margin: 0 }}>맞힌 문제만 보여. 틀린 문제나 낸 답은 다른 친구에게 보이지 않아.</p>
    </>
  );
}
