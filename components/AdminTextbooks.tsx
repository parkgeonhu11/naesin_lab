"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ago } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";

type Rep = {
  id: number; school: string; school_id: string; course_id: number; course: string; publisher: string; note: string;
  admin_reply: string | null; nickname: string | null; updated_at: string; confirmed: string | null;
};
type Group = { key: string; school: string; school_id: string; course: string; course_id: number; confirmed: string | null; reps: Rep[]; tally: [string, number][] };

function Reply({ r, onDone }: { r: Rep; onDone: () => void }) {
  const [text, setText] = useState(r.admin_reply ?? "");
  const [msg, setMsg] = useState("");
  return (
    <form className="row" style={{ gap: 6 }} onSubmit={async (e) => {
      e.preventDefault();
      const { error } = await sb().rpc("admin_reply_textbook", { p_id: r.id, p_reply: text });
      setMsg(error ? friendly(error) : "저장했어");
      if (!error) onDone();
    }}>
      <input className="input" style={{ flex: "1 1 220px" }} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="답글 (비우면 삭제)" />
      <button className="btn line">답글</button>
      {msg && <span className="small muted">{msg}</span>}
    </form>
  );
}

function GroupCard({ g, onDone }: { g: Group; onDone: () => void }) {
  const [pub, setPub] = useState(g.confirmed ?? g.tally[0]?.[0] ?? "");
  const [msg, setMsg] = useState("");
  const confirm = async (value: string) => {
    const { error } = await sb().rpc("admin_confirm_textbook", { p_school: g.school_id, p_course: g.course_id, p_publisher: value, p_note: "" });
    setMsg(error ? friendly(error) : value ? `${value}(으)로 확정했어` : "확정을 풀었어");
    if (!error) onDone();
  };
  return (
    <article className="panel panel-body" style={{ display: "grid", gap: 10 }}>
      <div className="row small" style={{ gap: 8 }}>
        <b style={{ fontSize: 15 }}>{g.school} · {g.course}</b>
        <span className="muted">{g.tally.map(([p, n]) => `${p} ${n}`).join(" / ")}</span>
        {g.confirmed && <span className="badge">확정: {g.confirmed}</span>}
      </div>
      <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); confirm(pub.trim()); }}>
        <input className="input" style={{ flex: "0 1 200px" }} maxLength={20} value={pub} onChange={(e) => setPub(e.target.value)} list={`pubs-${g.key}`} />
        <datalist id={`pubs-${g.key}`}>{g.tally.map(([p]) => <option key={p} value={p} />)}</datalist>
        <button className="btn">확정</button>
        {g.confirmed && <button type="button" className="btn line" onClick={() => confirm("")}>확정 풀기</button>}
        {msg && <span className="small muted">{msg}</span>}
      </form>
      <ul className="report-list">
        {g.reps.map((r) => (
          <li key={r.id} style={{ display: "grid", gap: 4 }}>
            <div className="small"><b>{r.nickname ?? "익명"}</b> <span className="faint">{r.publisher} · {ago(r.updated_at)}</span></div>
            {r.note && <div className="small">{r.note}</div>}
            {(r.note || r.admin_reply) && <Reply r={r} onDone={onDone} />}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function AdminTextbooks() {
  const [reps, setReps] = useState<Rep[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb().rpc("admin_textbook_reports", { p_limit: 500 });
    if (error) { setErr(friendly(error)); setReps([]); return; }
    setReps((data as Rep[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo<Group[]>(() => {
    const m = new Map<string, Group>();
    for (const r of reps ?? []) {
      const key = `${r.school_id}:${r.course_id}`;
      if (!m.has(key)) m.set(key, { key, school: r.school, school_id: r.school_id, course: r.course, course_id: r.course_id, confirmed: r.confirmed, reps: [], tally: [] });
      m.get(key)!.reps.push(r);
    }
    for (const g of m.values()) {
      const t = new Map<string, number>();
      g.reps.forEach((r) => t.set(r.publisher, (t.get(r.publisher) ?? 0) + 1));
      g.tally = [...t.entries()].sort((a, b) => b[1] - a[1]);
    }
    // 확정 안 된 것, 의견 달린 것 먼저
    return [...m.values()].sort((a, b) => Number(!!a.confirmed) - Number(!!b.confirmed) || b.reps.length - a.reps.length);
  }, [reps]);

  const waiting = groups.filter((g) => !g.confirmed).length;

  return (
    <section className="panel">
      <div className="panel-head"><h2>교과서 제보 <span className="num muted">{waiting}</span></h2><span className="small faint">학교·과목별로 묶음. 확정하면 학생 화면에 '확정'으로 보여</span></div>
      <div className="panel-body" style={{ display: "grid", gap: 10 }}>
        {err && <div className="notice warn">{err}</div>}
        {reps === null && <p className="muted small" style={{ margin: 0 }}>불러오는 중…</p>}
        {reps?.length === 0 && !err && <p className="muted small" style={{ margin: 0 }}>아직 들어온 제보가 없어.</p>}
        {groups.map((g) => <GroupCard key={g.key} g={g} onDone={load} />)}
      </div>
    </section>
  );
}
