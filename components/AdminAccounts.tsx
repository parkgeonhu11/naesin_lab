"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ago } from "@/lib/data";
import { sb } from "@/lib/supabase";

type Account = {
  user_id: string; nickname: string | null; email: string | null; provider: string; is_anonymous: boolean;
  created_at: string; last_sign_in_at: string | null; last_seen: string | null;
  visits_7d: number; visits_total: number; last_device: string | null; points: number; solved: number;
};
type LoginEvent = { created_at: string; nickname: string | null; email: string | null; provider: string; device: string; os: string; browser: string };

const provName = (p: string) =>
  p === "anonymous" ? "임시 계정" : p.split(", ").map((x) => (x === "google" ? "Google" : x === "email" ? "이메일" : x)).join(" + ");
const fmt = (s: string | null) =>
  s ? new Date(s).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";
const kstDay = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

/** 관리자: 계정·로그인 현황 */
export default function AdminAccounts() {
  const [rows, setRows] = useState<Account[] | null>(null);
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "google" | "anon">("all");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [a, e] = await Promise.all([sb().rpc("admin_accounts"), sb().rpc("admin_login_events", { p_limit: 100 })]);
    if (a.error) setErr(a.error.message);
    setRows((a.data as Account[]) ?? []);
    setEvents((e.data as LoginEvent[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = kstDay(new Date());
  const stats = useMemo(() => {
    const r = rows ?? [];
    return {
      total: r.length,
      google: r.filter((x) => !x.is_anonymous).length,
      anon: r.filter((x) => x.is_anonymous).length,
      today: r.filter((x) => x.last_seen && kstDay(new Date(x.last_seen)) === today).length,
      week: r.filter((x) => +x.visits_7d > 0).length,
    };
  }, [rows, today]);

  const shown = (rows ?? []).filter((r) => {
    if (kind === "google" && r.is_anonymous) return false;
    if (kind === "anon" && !r.is_anonymous) return false;
    const s = q.trim().toLowerCase();
    return !s || (r.nickname ?? "").toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s);
  });

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>계정 · 로그인 현황 <span className="num muted">{stats.total}개</span></h2>
        <button className="btn line" style={{ padding: "3px 12px", fontSize: 12.5, minHeight: 0 }} onClick={load}>새로고침</button>
      </div>
      <div className="panel-body" style={{ display: "grid", gap: 12 }}>
        {err && <p className="small res-wa" style={{ margin: 0 }}>{err}</p>}
        <div className="acct-stats">
          <div><small>Google 계정</small><b className="num">{stats.google}</b></div>
          <div><small>임시 계정</small><b className="num">{stats.anon}</b></div>
          <div><small>오늘 접속</small><b className="num">{stats.today}</b></div>
          <div><small>최근 7일 접속</small><b className="num">{stats.week}</b></div>
        </div>
        <div className="row">
          <input className="input" style={{ flex: "1 1 220px" }} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="별명이나 이메일로 찾기" />
          <div className="tabs">
            {([["all", "전체"], ["google", "Google"], ["anon", "임시"]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="table-wrap"><table className="tbl">
        <thead><tr>
          <th>별명</th><th>이메일</th><th>로그인 방식</th><th>가입</th><th>마지막 접속</th>
          <th className="r">7일 접속</th><th>최근 기기</th><th className="r">점수</th><th className="r">맞힌 문제</th>
        </tr></thead>
        <tbody>
          {rows === null && <tr><td colSpan={9} className="empty-cell">불러오는 중…</td></tr>}
          {rows && shown.length === 0 && <tr><td colSpan={9} className="empty-cell">조건에 맞는 계정이 없어.</td></tr>}
          {shown.map((r) => (
            <tr key={r.user_id}>
              <td>{r.nickname ? <Link className="link" href={`/user/${r.user_id}`} title="프로필에서 점수 주기">{r.nickname}</Link> : <span className="faint">별명 없음</span>}</td>
              <td className="small">{r.email ?? <span className="faint">–</span>}</td>
              <td><span className={`badge ${r.is_anonymous ? "subj" : "type-short"}`}>{provName(r.provider)}</span></td>
              <td className="small faint nowrap">{fmt(r.created_at)}</td>
              <td className="small nowrap" title={fmt(r.last_seen ?? r.last_sign_in_at)}>{r.last_seen ? ago(r.last_seen) : r.last_sign_in_at ? ago(r.last_sign_in_at) : "–"}</td>
              <td className="r n">{r.visits_7d}</td>
              <td className="small faint nowrap">{r.last_device || "–"}</td>
              <td className="r n">{r.points}</td>
              <td className="r n">{r.solved}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <details className="panel-body">
        <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>최근 로그인 기록 {events.length}건 (같은 기기는 30분에 한 번만 기록)</summary>
        <div className="table-wrap" style={{ marginTop: 8 }}><table className="tbl">
          <thead><tr><th>시간</th><th>별명</th><th>이메일</th><th>방식</th><th>기기</th></tr></thead>
          <tbody>
            {events.length === 0 && <tr><td colSpan={5} className="empty-cell">아직 기록이 없어.</td></tr>}
            {events.map((e, i) => (
              <tr key={i}>
                <td className="small nowrap">{fmt(e.created_at)}</td>
                <td>{e.nickname ?? <span className="faint">별명 없음</span>}</td>
                <td className="small">{e.email ?? "–"}</td>
                <td className="small">{provName(e.provider)}</td>
                <td className="small faint">{[e.device, e.os, e.browser].filter(Boolean).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </details>
    </section>
  );
}
