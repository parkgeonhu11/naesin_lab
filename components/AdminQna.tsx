"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ago } from "@/lib/data";
import { sb } from "@/lib/supabase";

type Row = { kind: "thread" | "answer"; id: number; thread_id: number; no: number; body: string; nickname: string | null; email: string | null; hidden: boolean; created_at: string };

/** 관리자: 질문방 글 관리 (숨기기 / 다시 보이기) */
export default function AdminQna() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb().rpc("admin_qna", { p_limit: 150 });
    if (error) setErr(error.message);
    setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const toggle = async (r: Row) => {
    const { error } = await sb().rpc("admin_qna_hide", { p_kind: r.kind, p_id: r.id, p_hidden: !r.hidden });
    if (error) setErr(error.message);
    load();
  };
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>질문방 글 관리</h2>
        <span className="small faint">최근 글 150개 · 욕설·비방·정답만 던지는 글은 숨겨 줘</span>
      </div>
      {err && <div className="notice warn">{err}</div>}
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>종류</th><th>문제</th><th>쓴 사람</th><th>내용</th><th>쓴 때</th><th className="c">상태</th></tr></thead>
          <tbody>
            {rows === null && <tr><td colSpan={6} className="empty-cell">불러오는 중…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={6} className="empty-cell">아직 글이 없어.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.kind + r.id} style={r.hidden ? { opacity: 0.5 } : undefined}>
                <td>{r.kind === "thread" ? "질문" : "답변"}</td>
                <td><Link className="link" href={`/problem/${r.no}#qna`}>{r.no}번</Link></td>
                <td>{r.nickname ?? "–"}<div className="small faint">{r.email ?? ""}</div></td>
                <td style={{ maxWidth: 420, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.body}</td>
                <td className="small faint">{ago(r.created_at)}</td>
                <td className="c"><button type="button" className={`btn ${r.hidden ? "" : "line"}`} onClick={() => toggle(r)}>{r.hidden ? "다시 보이기" : "숨기기"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
