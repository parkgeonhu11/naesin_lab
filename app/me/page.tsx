"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import NicknameCard from "@/components/NicknameCard";
import { SUBJECTS, type BoardRow, type Progress, type ProblemRow } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type SubjStat = { total: number; solved: number; points: number };

export default function MePage() {
  const { user, nickname, points, rank, error, saveNickname } = useMe();
  const [week, setWeek] = useState(0);
  const [solved, setSolved] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [bySub, setBySub] = useState<Record<string, SubjStat>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: wk }, { data: prog }, { data: probs }] = await Promise.all([
        sb().rpc("leaderboard", { p_subject: "all", p_period: "week", p_limit: 500 }),
        sb().rpc("my_progress"),
        sb().rpc("problem_list"),
      ]);
      setWeek(((wk as BoardRow[]) ?? []).find((r) => r.user_id === user.id)?.points ?? 0);
      const subjOf: Record<string, string> = {};
      const s: Record<string, SubjStat> = {};
      ((probs as ProblemRow[]) ?? []).forEach((p) => {
        subjOf[p.id] = p.subject;
        s[p.subject] ??= { total: 0, solved: 0, points: 0 };
        s[p.subject].total++;
      });
      let ok = 0, rv = 0;
      ((prog as Progress[]) ?? []).forEach((p) => {
        if (p.points == null) return;
        const sub = subjOf[p.question_id];
        if (p.points > 0) ok++; else rv++;
        if (sub) {
          s[sub].points += p.points;
          if (p.points > 0) s[sub].solved++;
        }
      });
      setSolved(ok);
      setRevealed(rv);
      setBySub(s);
    })();
  }, [user]);

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      <div className="page-title">
        <h1>{nickname ?? "닉네임 없음"}</h1>
        <span className="muted small">내 정보</span>
      </div>

      <section className="panel stat-row">
        <div className="stat"><small>누적 점수</small><b>{points}</b></div>
        <div className="stat"><small>전체 등수</small><b>{rank ? `${rank}위` : "–"}</b></div>
        <div className="stat"><small>이번 주 점수</small><b>{week}</b></div>
        <div className="stat"><small>맞힌 문제</small><b>{solved}</b></div>
        <div className="stat"><small>정답 보기로 넘김</small><b>{revealed}</b></div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>과목별 진도</h2>
          <Link href="/status" className="more">내 제출 보기</Link>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>과목</th><th className="r">맞힌 문제</th><th className="r">전체</th><th className="r">진도</th><th className="r">점수</th></tr></thead>
            <tbody>
              {SUBJECTS.map((s) => {
                const v = bySub[s.code] ?? { total: 0, solved: 0, points: 0 };
                return (
                  <tr key={s.code}>
                    <td><Link className="link" href={`/problems?subject=${s.code}`}>{s.name}</Link></td>
                    <td className="r n">{v.solved}</td>
                    <td className="r n">{v.total}</td>
                    <td className="r n">{v.total ? `${Math.round((100 * v.solved) / v.total)}%` : "–"}</td>
                    <td className="r n">{v.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <NicknameCard current={nickname} onSave={saveNickname} title="닉네임 바꾸기" />

      <p className="small faint" style={{ margin: 0 }}>
        기록은 이 브라우저의 익명 계정에 저장돼. 브라우저 기록(쿠키·사이트 데이터)을 지우거나 다른 기기로 열면 새 계정으로 시작돼.
      </p>
    </>
  );
}
