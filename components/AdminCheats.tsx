"use client";
import { useCallback, useEffect, useState } from "react";
import { ago } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";

type Row = {
  user_id: string; nickname: string | null; email: string | null; flags: number; last_flag: string;
  warned_at: string | null; warning_ack_at: string | null; banned_at: string | null;
  recent: { no: number; sec: number; need: number; at: string }[] | null;
};

/** 관리자: 너무 빨리 맞힌 답(부정 이용 의심) */
export default function AdminCheats() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await sb().rpc("admin_cheat_list");
    setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const status = (r: Row) =>
    r.banned_at ? <span className="badge lv4">이용 정지</span>
      : r.warned_at ? <span className="badge lv3">{r.warning_ack_at ? "경고 확인함" : "경고 보냄"}</span>
      : <span className="badge subj">지켜보는 중</span>;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>부정 이용 의심 <span className="num muted">{rows?.length ?? 0}명</span></h2>
        <span className="small faint">문제를 연 뒤 읽기만 해도 걸리는 시간보다 빨리 맞힌 답. 3번이면 자동 경고, 경고 확인 후 2번 더면 자동 정지</span>
      </div>
      <div className="table-wrap"><table className="tbl">
        <thead><tr><th>별명</th><th>이메일</th><th className="r">의심 횟수</th><th>상태</th><th>최근 기록 (문제: 걸린 시간 / 최소 시간)</th><th className="c">조치</th></tr></thead>
        <tbody>
          {rows === null && <tr><td colSpan={6} className="empty-cell">불러오는 중…</td></tr>}
          {rows?.length === 0 && <tr><td colSpan={6} className="empty-cell">의심되는 기록이 없어.</td></tr>}
          {rows?.map((r) => (
            <tr key={r.user_id}>
              <td>{r.nickname ?? <span className="faint">별명 없음</span>}</td>
              <td className="small">{r.email ?? "–"}</td>
              <td className="r n">{r.flags}</td>
              <td className="nowrap">{status(r)} <span className="small faint">{ago(r.last_flag)}</span></td>
              <td className="small">
                {(r.recent ?? []).slice(0, 5).map((x, i) => (
                  <span key={i} className="nowrap" style={{ marginRight: 8, opacity: x.need < 0 ? 0.45 : 1 }} title={x.need < 0 ? "풀어 준 뒤라 세지 않는 기록" : ""}>
                    {x.no}번: <b className="res-wa">{x.sec}초</b>/{Math.abs(x.need)}초
                  </span>
                ))}
              </td>
              <td className="c nowrap">
                {(r.warned_at || r.banned_at) && (
                  <button className="btn line" style={{ padding: "3px 10px", fontSize: 12.5, minHeight: 0, marginRight: 4 }}
                    onClick={async () => { const { error } = await sb().rpc("admin_pardon", { p_user: r.user_id }); setMsg(error ? friendly(error) : `${r.nickname ?? "이 학생"}의 경고·정지를 풀었어. 지난 기록은 더 이상 세지 않아.`); load(); }}>
                    풀어 주기
                  </button>
                )}
                {!r.banned_at && (
                  <button className={`btn ${armed === r.user_id ? "danger" : "line"}`} style={{ padding: "3px 10px", fontSize: 12.5, minHeight: 0 }}
                    onClick={async () => {
                      if (armed !== r.user_id) { setArmed(r.user_id); setTimeout(() => setArmed((u) => (u === r.user_id ? null : u)), 4000); return; }
                      setArmed(null);
                      const { error } = await sb().rpc("admin_ban", { p_user: r.user_id });
                      setMsg(error ? friendly(error) : `${r.nickname ?? "이 학생"}을(를) 정지했어.`); load();
                    }}>
                    {armed === r.user_id ? "한 번 더" : "바로 정지"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {msg && <p className="small muted" style={{ margin: 0, padding: "10px 16px" }}>{msg}</p>}
    </section>
  );
}
