"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { refreshFrames } from "@/components/Framed";
import { ago, SUBJECTS, subjectName } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Grant = {
  id: number; user_id: string; nickname: string; admin_nick: string; points: number;
  subject: string | null; note: string | null; created_at: string; seen_at: string | null; revoked_at: string | null;
};

const QUICK = [10, 30, 50, 100];
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** 준 기록 한 줄 */
function GrantRow({ g, showName, onRevoke }: { g: Grant; showName: boolean; onRevoke: (id: number) => Promise<void> }) {
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const off = !!g.revoked_at;
  return (
    <tr className={off ? "grant-off" : ""}>
      <td className="small nowrap faint">{ago(g.created_at)}</td>
      {showName && <td><Link className="link" href={`/user/${g.user_id}`}>{g.nickname}</Link></td>}
      <td className={`r n grant-pts ${g.points > 0 ? "plus" : "minus"}`}>{sign(g.points)}</td>
      <td className="small">{g.subject ? subjectName(g.subject) : "전체"}</td>
      <td className="small">{g.note || <span className="faint">–</span>}</td>
      <td className="small nowrap">
        {off ? <span className="faint">취소됨</span> : g.seen_at ? <span className="muted">확인함</span> : <span className="faint">알림 대기</span>}
      </td>
      <td className="r">
        {!off && (
          <button
            type="button"
            className="btn line small-btn"
            disabled={busy}
            onClick={async () => {
              if (!sure) { setSure(true); setTimeout(() => setSure(false), 4000); return; }
              setBusy(true);
              await onRevoke(g.id);
              setBusy(false);
              setSure(false);
            }}
          >
            {sure ? "정말 취소?" : "취소"}
          </button>
        )}
      </td>
    </tr>
  );
}

function GrantTable({ rows, showName, onRevoke }: { rows: Grant[] | null; showName: boolean; onRevoke: (id: number) => Promise<void> }) {
  const cols = showName ? 7 : 6;
  return (
    <div className="table-wrap"><table className="tbl">
      <thead><tr>
        <th>언제</th>{showName && <th>받은 사람</th>}<th className="r">점수</th><th>과목</th><th>사유</th><th>상태</th><th />
      </tr></thead>
      <tbody>
        {rows === null && <tr><td colSpan={cols} className="empty-cell">불러오는 중…</td></tr>}
        {rows && rows.length === 0 && <tr><td colSpan={cols} className="empty-cell">아직 준 점수가 없어.</td></tr>}
        {rows?.map((g) => <GrantRow key={g.id} g={g} showName={showName} onRevoke={onRevoke} />)}
      </tbody>
    </table></div>
  );
}

/** 프로필 화면(관리자만): 이 학생에게 점수 주기 */
export function GrantPanel({ userId, nickname, onChanged }: { userId: string; nickname: string; onChanged?: () => void }) {
  const { refreshScore } = useMe();
  const [amount, setAmount] = useState("50");
  const [minus, setMinus] = useState(false);
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rows, setRows] = useState<Grant[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb().rpc("admin_grant_list", { p_user: userId, p_limit: 20 });
    setRows((data as Grant[]) ?? []);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const n = Math.round(Number(amount));
  const pts = minus ? -n : n;
  const bad = !Number.isFinite(n) || n < 1 || n > 1000;

  const after = async () => {
    await Promise.all([load(), refreshScore()]);
    refreshFrames();
    onChanged?.();
  };

  const give = async () => {
    if (bad || busy) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb().rpc("admin_grant_points", { p_user: userId, p_points: pts, p_subject: subject || null, p_note: note.trim() || null });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: friendly(error) });
    setMsg({ ok: true, text: `${nickname}에게 ${sign(pts)}점을 ${minus ? "뺐어" : "줬어"}. 지금 점수: ${(data as { total: number }).total}점` });
    setNote("");
    await after();
  };

  const revoke = async (id: number) => {
    const { error } = await sb().rpc("admin_grant_revoke", { p_id: id });
    if (error) return setMsg({ ok: false, text: friendly(error) });
    setMsg({ ok: true, text: "취소했어. 그 점수는 없어졌어." });
    await after();
  };

  return (
    <section className="panel grant-panel">
      <div className="panel-head">
        <h2>점수 주기 <span className="admin-chip">ADMIN</span></h2>
        <span className="small muted">관리자에게만 보여. 준 점수는 랭킹·레벨에 바로 반영되고, {nickname}에게 알림이 가.</span>
      </div>
      <div className="panel-body grant-form">
        <div className="grant-sign tabs" role="group" aria-label="주기 또는 빼기">
          <button type="button" aria-pressed={!minus} className={!minus ? "on" : ""} onClick={() => setMinus(false)}>+ 주기</button>
          <button type="button" aria-pressed={minus} className={minus ? "on" : ""} onClick={() => setMinus(true)}>− 빼기</button>
        </div>
        <div className="grant-quick">
          {QUICK.map((q) => (
            <button key={q} type="button" className={`chip-btn${Number(amount) === q ? " on" : ""}`} onClick={() => setAmount(String(q))}>{minus ? "−" : "+"}{q}</button>
          ))}
          <label className="grant-amount">
            <input className="input" type="number" inputMode="numeric" min={1} max={1000} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="점수" />
            <span>점</span>
          </label>
        </div>
        <div className="grant-row">
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="과목">
            <option value="">전체 점수만</option>
            {SUBJECTS.map((s) => <option key={s.code} value={s.code}>{s.name} 랭킹에도</option>)}
          </select>
          <input className="input grow" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} placeholder="사유 (받는 사람에게 보여, 예: 수행평가 문제 제보 고마워!)" />
          <button type="button" className={`btn${minus ? " danger" : ""}`} disabled={bad || busy} onClick={give}>
            {busy ? "처리 중…" : `${sign(bad ? 0 : pts)}점 ${minus ? "빼기" : "주기"}`}
          </button>
        </div>
        {bad && <p className="small res-wa" style={{ margin: 0 }}>1점부터 1000점까지 넣어 줘.</p>}
        {msg && <p className={`small ${msg.ok ? "res-ac" : "res-wa"}`} style={{ margin: 0 }}>{msg.text}</p>}
      </div>
      <GrantTable rows={rows} showName={false} onRevoke={revoke} />
    </section>
  );
}

/** 관리자 화면: 지금까지 준 점수 기록 전체 */
export function AdminGrants() {
  const [rows, setRows] = useState<Grant[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb().rpc("admin_grant_list", { p_user: null, p_limit: 100 });
    if (error) setErr(friendly(error));
    setRows((data as Grant[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const live = (rows ?? []).filter((g) => !g.revoked_at);
  const sum = live.reduce((a, g) => a + g.points, 0);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>관리자가 준 점수 <span className="num muted">{live.length}건 · 합계 {sign(sum)}점</span></h2>
        <span className="small faint">점수를 주려면 랭킹이나 아래 계정 목록에서 학생 이름을 눌러 프로필로 들어가.</span>
      </div>
      {err && <p className="panel-body small res-wa" style={{ margin: 0 }}>{err}</p>}
      <GrantTable
        rows={rows}
        showName
        onRevoke={async (id) => {
          const { error } = await sb().rpc("admin_grant_revoke", { p_id: id });
          if (error) setErr(friendly(error));
          await load();
          refreshFrames();
        }}
      />
    </section>
  );
}

/** 받은 사람: 접속하면 한 번 알려 주기 */
export function GrantNotice() {
  const { user, refreshScore } = useMe();
  const [list, setList] = useState<{ id: number; points: number; subject: string | null; note: string | null }[]>([]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    sb().rpc("my_grants_unseen").then(({ data }) => {
      if (!alive) return;
      const l = (data as { id: number; points: number; subject: string | null; note: string | null }[]) ?? [];
      if (l.length) { setList(l); refreshScore(); }
    });
    return () => { alive = false; };
  }, [user, refreshScore]);
  if (!list.length) return null;
  const total = list.reduce((a, g) => a + g.points, 0);
  const close = () => { setList([]); sb().rpc("my_grants_ack").then(() => {}, () => {}); };
  return (
    <div className={`grant-toast ${total >= 0 ? "plus" : "minus"}`} role="status">
      <span className="grant-toast-pts">{sign(total)}</span>
      <div className="grow">
        <b>{total >= 0 ? "관리자가 점수를 줬어!" : "관리자가 점수를 조정했어"}</b>
        <ul>
          {list.slice(0, 4).map((g) => (
            <li key={g.id}>{sign(g.points)}점{g.subject ? ` (${subjectName(g.subject)})` : ""}{g.note ? ` · ${g.note}` : ""}</li>
          ))}
          {list.length > 4 && <li>외 {list.length - 4}건</li>}
        </ul>
      </div>
      <button type="button" className="btn small-btn" onClick={close}>확인</button>
    </div>
  );
}
