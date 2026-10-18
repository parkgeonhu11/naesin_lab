"use client";
import { useAdmins } from "@/components/Framed";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SchoolCard from "@/components/SchoolCard";
import AccountCard from "@/components/AccountCard";
import DeleteAccount from "@/components/DeleteAccount";
import NicknameCard from "@/components/NicknameCard";
import { SUBJECTS, subjectName, type BoardRow, type UnitStat, ADMIN_ACC } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : null);
const level = (p: number | null) => (p === null ? "" : p < 50 ? "low" : p < 80 ? "mid" : "high");

function Meter({ value }: { value: number | null }) {
  return (
    <div className={`meter ${level(value)}`} aria-label={value === null ? "기록 없음" : `${value}%`}>
      <span style={{ width: `${value ?? 0}%` }} />
    </div>
  );
}

export default function MePage() {
  const { user, nickname, points, rank, error, saveNickname, isAnon } = useMe();
  const isAdmin = useAdmins();
  const [week, setWeek] = useState(0);
  const [stats, setStats] = useState<UnitStat[] | null>(null);
  const [subject, setSubject] = useState("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: wk }, { data: us }] = await Promise.all([
        sb().rpc("leaderboard_v2", { p_subject: "all", p_period: "week", p_limit: 500, p_scope: "school" }),
        sb().rpc("my_unit_stats"),
      ]);
      setWeek(((wk as BoardRow[]) ?? []).find((r) => r.user_id === user.id)?.points ?? 0);
      setStats((us as UnitStat[]) ?? []);
    })();
  }, [user]);

  // 과목별 · 대단원별 합계
  const bySubject = useMemo(() => {
    const m: Record<string, { total: number; solved: number; subs: number; ok: number; units: Record<string, { total: number; solved: number; subs: number; ok: number }> }> = {};
    (stats ?? []).forEach((s) => {
      m[s.subject] ??= { total: 0, solved: 0, subs: 0, ok: 0, units: {} };
      const S = m[s.subject];
      S.units[s.unit] ??= { total: 0, solved: 0, subs: 0, ok: 0 };
      const U = S.units[s.unit];
      for (const t of [S, U]) {
        t.total += +s.total; t.solved += +s.solved; t.subs += +s.submissions; t.ok += +s.correct_submissions;
      }
    });
    return m;
  }, [stats]);

  // 약점: 2번 이상 풀어 본 세부 유형 중 정답률이 낮은 순서
  const weak = useMemo(
    () =>
      (stats ?? [])
        .filter((s) => +s.submissions >= 2 && pct(+s.correct_submissions, +s.submissions)! < 70)
        .sort((a, b) => pct(+a.correct_submissions, +a.submissions)! - pct(+b.correct_submissions, +b.submissions)!)
        .slice(0, 3),
    [stats],
  );

  const totalSolved = (stats ?? []).reduce((a, s) => a + +s.solved, 0);
  const totalSubs = (stats ?? []).reduce((a, s) => a + +s.submissions, 0);
  const totalOk = (stats ?? []).reduce((a, s) => a + +s.correct_submissions, 0);
  const examLink = (s: UnitStat) => `/exam?${new URLSearchParams({ subject: s.subject, unit: s.unit, topic: s.topic })}`;

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      <div className="page-title">
        <h1>{nickname ?? "닉네임 없음"}</h1>
        <span className="muted small">내 정보 · 성적 분석</span>
      </div>
      <AccountCard />
      <SchoolCard title="학교·학년" compact />

      <section className="panel stat-row">
        <div className="stat"><small>누적 점수</small><b>{points}</b></div>
        <div className="stat"><small>전체 등수</small><b>{rank ? `${rank}위` : "–"}</b></div>
        <div className="stat"><small>이번 주 점수</small><b>{week}</b></div>
        <div className="stat"><small>맞힌 문제</small><b>{totalSolved}</b></div>
        <div className="stat"><small>제출 정답률</small><b>{totalSubs ? `${isAdmin(user?.id, nickname) ? ADMIN_ACC : pct(totalOk, totalSubs)}%` : "–"}</b></div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>약점 유형</h2><span className="small faint">2번 이상 풀어 본 유형 중 정답률 70% 미만</span></div>
        <div className="panel-body weak">
          {stats === null && <span className="muted small">불러오는 중…</span>}
          {stats && weak.length === 0 && <span className="muted small">아직 약점 유형이 없어. 문제를 더 풀면 여기에 보여.</span>}
          {weak.map((s) => (
            <div key={s.subject + s.unit + s.topic} className="weak-item">
              <b>{subjectName(s.subject)} › {s.unit} › {s.topic}</b>
              <span className="num small">정답률 {pct(+s.correct_submissions, +s.submissions)}% ({s.correct_submissions}/{s.submissions})</span>
              <Link className="btn" href={examLink(s)}>이 유형 다시 풀기</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>단원별 진도와 정답률</h2>
          <select aria-label="과목" value={subject} onChange={(e) => setSubject(e.target.value)} className="input" style={{ marginLeft: "auto", width: "auto" }}>
            <option value="all">전체 과목</option>
            {SUBJECTS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>단원</th><th className="r">맞힌 문제</th><th style={{ width: "22%" }}>진도</th><th className="r hide-m">제출</th><th style={{ width: "22%" }}>정답률</th></tr>
            </thead>
            <tbody>
              {SUBJECTS.filter((s) => (subject === "all" || s.code === subject) && bySubject[s.code]).map((s) => {
                const S = bySubject[s.code];
                return [
                  <tr key={s.code} className="group-row">
                    <td><Link href={`/problems?subject=${s.code}`}>{s.name}</Link></td>
                    <td className="r n">{S.solved}/{S.total}</td>
                    <td><Meter value={pct(S.solved, S.total)} /></td>
                    <td className="r n hide-m">{S.subs}</td>
                    <td><Meter value={pct(S.ok, S.subs)} /></td>
                  </tr>,
                  ...Object.entries(S.units).map(([u, U]) => (
                    <tr key={s.code + u}>
                      <td style={{ paddingLeft: 24 }}><Link className="link" href={`/problems?subject=${s.code}&unit=${encodeURIComponent(u)}`}>{u}</Link></td>
                      <td className="r n">{U.solved}/{U.total}</td>
                      <td><Meter value={pct(U.solved, U.total)} /></td>
                      <td className="r n hide-m">{U.subs}</td>
                      <td>{U.subs ? <Meter value={pct(U.ok, U.subs)} /> : <span className="faint small">기록 없음</span>}</td>
                    </tr>
                  )),
                ];
              })}
              {stats === null && <tr><td colSpan={5} className="empty-cell">불러오는 중…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <NicknameCard current={nickname} onSave={saveNickname} title="별명 바꾸기" />

      {isAnon && <p className="small faint" style={{ margin: 0 }}>
        기록은 이 브라우저의 익명 계정에 저장돼. 브라우저 기록(쿠키·사이트 데이터)을 지우거나 다른 기기로 열면 새 계정으로 시작돼.
      </p>}
      <DeleteAccount />
    </>
  );
}
