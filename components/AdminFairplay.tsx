"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { DiffBadge } from "@/components/Badges";
import { ago } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";

type Row = {
  user_id: string; nickname: string | null; email: string | null; correct: number; flags: number; away_ok: number; traced_ok: number;
  fast2x: number; hard_tried: number; hard_first: number; score: number;
  warned_at: string | null; warning_ack_at: string | null; banned_at: string | null; review: boolean; last_at: string | null;
};
type Ev = { k: string; t: number; d?: string | number; ok?: boolean };
type Trace = { no: number | null; title: string | null; difficulty: number | null; mode: string; events: Ev[]; away_ms: number; away_count: number; picks: number; solved_ok: boolean; need: number | null; updated_at: string };

const sec = (ms: number) => (ms >= 60000 ? `${Math.floor(ms / 60000)}분 ${Math.round((ms % 60000) / 1000)}초` : `${Math.round(ms / 100) / 10}초`);
const level = (s: number) => (s >= 60 ? { t: "높음", c: "hi" } : s >= 30 ? { t: "주의", c: "mid" } : { t: "낮음", c: "lo" });

/** 풀이 타임라인: 회색 = 문제 화면, 빨강 = 다른 곳에 나가 있던 시간, 점 = 보기 고름, 깃발 = 제출 */
function Timeline({ tr }: { tr: Trace }) {
  const ev = tr.events ?? [];
  const end = Math.max(1000, ...ev.map((e) => e.t));
  const x = (t: number) => `${Math.min(100, (t / end) * 100)}%`;
  const away: [number, number][] = [];
  let left: number | null = null;
  ev.forEach((e) => {
    if (e.k === "leave") left = e.t;
    if (e.k === "back" && left !== null) { away.push([left, e.t]); left = null; }
  });
  if (left !== null) away.push([left, end]);
  return (
    <div className="tl" title={`전체 ${sec(end)}`}>
      <div className="tl-bar">
        {away.map(([a, b], i) => <span key={i} className="tl-away" style={{ left: x(a), width: `calc(${x(b)} - ${x(a)})` }} title={`나가 있음 ${sec(b - a)}`} />)}
        {tr.need != null && <span className="tl-need" style={{ left: x(tr.need * 1000) }} title={`최소 필요 시간 ${tr.need.toFixed(0)}초`} />}
        {ev.filter((e) => e.k === "pick").map((e, i) => <span key={`p${i}`} className="tl-pick" style={{ left: x(e.t) }} title={`${sec(e.t)}: ${e.d ?? ""} 고름`} />)}
        {ev.filter((e) => e.k === "submit" || e.k === "reveal").map((e, i) => (
          <span key={`s${i}`} className={`tl-sub ${e.k === "reveal" ? "rv" : e.ok ? "ok" : "no"}`} style={{ left: x(e.t) }}
            title={`${sec(e.t)}: ${e.k === "reveal" ? "정답 보기" : e.ok ? "정답" : "오답"} ${e.d ?? ""}`} />
        ))}
      </div>
      <div className="tl-scale small faint"><span>열기</span><span>{sec(end)}</span></div>
    </div>
  );
}

/** 관리자: 부정행위 의심 확률 + 풀이 기록. 정지는 관리자가 직접 누를 때만 된다. */
export default function AdminFairplay() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [traces, setTraces] = useState<Record<string, Trace[]>>({});
  const [armed, setArmed] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb().rpc("admin_fairplay");
    if (error) setMsg(friendly(error));
    setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!traces[id]) {
      const { data } = await sb().rpc("admin_traces", { p_user: id, p_limit: 30 });
      setTraces((t) => ({ ...t, [id]: (data as Trace[]) ?? [] }));
    }
  };

  const status = (r: Row) =>
    r.banned_at ? <span className="badge lv4">정지됨</span>
      : r.review ? <span className="badge lv4">정지 검토 필요</span>
      : r.warned_at ? <span className="badge lv3">{r.warning_ack_at ? "경고 확인함" : "경고 보냄"}</span>
      : <span className="badge subj">정상</span>;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>부정행위 의심 확률 <span className="num muted">{rows?.length ?? 0}명</span></h2>
        <span className="small faint">추정치일 뿐 증거가 아니야. 정지는 자동으로 되지 않고, 여기서 [정지]를 눌러야만 돼.</span>
      </div>
      <details className="panel-body small muted" style={{ paddingTop: 0 }}>
        <summary style={{ cursor: "pointer" }}>확률은 이렇게 계산해</summary>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li><b>35%</b> 읽기만 해도 걸리는 시간보다 빨리 맞힌 정답 비율</li>
          <li><b>35%</b> 정답을 내기 전에 다른 탭·앱으로 5초 넘게 나갔다 온 비율 (AI·검색 의심)</li>
          <li><b>15%</b> 최소 시간의 2배 안에 맞힌 정답이 너무 많은지</li>
          <li><b>15%</b> 어려움·최상위 문제를 첫 시도에 맞히는 비율이 지나치게 높은지 (3문제 이상 풀었을 때)</li>
          <li>푼 문제가 적으면 확률을 낮춰서 보여 줘 (몇 문제만으로 판단하지 않게).</li>
        </ul>
      </details>
      <div className="table-wrap"><table className="tbl">
        <thead><tr>
          <th>별명</th><th>의심 확률</th><th className="hide-m">근거</th><th>상태</th><th className="c">조치</th>
        </tr></thead>
        <tbody>
          {rows === null && <tr><td colSpan={5} className="empty-cell">불러오는 중…</td></tr>}
          {rows?.length === 0 && <tr><td colSpan={5} className="empty-cell">아직 푼 사람이 없어.</td></tr>}
          {rows?.map((r) => {
            const lv = level(r.score);
            return (
              <Fragment key={r.user_id}>
                <tr>
                  <td>
                    <b>{r.nickname ?? "별명 없음"}</b>
                    <div className="small faint">{r.email ?? "임시 계정"}{r.last_at ? ` · ${ago(r.last_at)}` : ""}</div>
                  </td>
                  <td className="nowrap">
                    <div className={`sus ${lv.c}`}><span style={{ width: `${r.score}%` }} /></div>
                    <b className={`sus-t ${lv.c}`}>{r.score}%</b> <span className="small faint">{lv.t}</span>
                  </td>
                  <td className="small hide-m">
                    빠른 정답 <b>{r.flags}</b>/{r.correct} · 나갔다 와서 맞힘 <b>{r.away_ok}</b>/{r.traced_ok}<br />
                    2배 안에 맞힘 {r.fast2x}/{r.correct} · 어려운 문제 첫 시도 {r.hard_first}/{r.hard_tried}
                  </td>
                  <td className="nowrap">{status(r)}</td>
                  <td className="c nowrap">
                    <button className="btn line mini" onClick={() => toggle(r.user_id)}>{open === r.user_id ? "기록 닫기" : "풀이 기록"}</button>{" "}
                    {r.banned_at || r.warned_at ? (
                      <button className="btn line mini" onClick={async () => {
                        const { error } = await sb().rpc("admin_pardon", { p_user: r.user_id });
                        setMsg(error ? friendly(error) : `${r.nickname ?? "이 학생"}의 경고·정지를 풀었어.`); load();
                      }}>풀어 주기</button>
                    ) : null}{" "}
                    {!r.banned_at && (
                      <button className={`btn mini ${armed === r.user_id ? "danger" : "line"}`} onClick={async () => {
                        if (armed !== r.user_id) { setArmed(r.user_id); setTimeout(() => setArmed((u) => (u === r.user_id ? null : u)), 4000); return; }
                        setArmed(null);
                        const { error } = await sb().rpc("admin_ban", { p_user: r.user_id });
                        setMsg(error ? friendly(error) : `${r.nickname ?? "이 학생"}을(를) 정지했어.`); load();
                      }}>{armed === r.user_id ? "정말 정지?" : "정지"}</button>
                    )}
                  </td>
                </tr>
                {open === r.user_id && (
                  <tr className="trace-row"><td colSpan={5}>
                    {!traces[r.user_id] ? <p className="small muted">불러오는 중…</p>
                      : traces[r.user_id].length === 0 ? <p className="small muted">아직 풀이 기록이 없어. (이 기능을 켠 뒤부터 쌓여)</p>
                      : (
                        <div className="traces">
                          <p className="small faint" style={{ margin: 0 }}>
                            <span className="tl-key away" /> 다른 곳에 나가 있던 시간 <span className="tl-key pick" /> 보기 고름{" "}
                            <span className="tl-key ok" /> 정답 <span className="tl-key no" /> 오답 <span className="tl-key need" /> 읽기 최소 시간
                          </p>
                          {traces[r.user_id].map((t, i) => (
                            <div key={i} className="trace">
                              <div className="trace-head small">
                                <b>{t.mode === "exam" ? "시험지" : `${t.no}번`}</b>
                                {t.difficulty ? <DiffBadge level={t.difficulty} /> : null}
                                <span className="muted">{t.title ?? ""}</span>
                                <span className="faint" style={{ marginLeft: "auto" }}>{ago(t.updated_at)}</span>
                              </div>
                              <Timeline tr={t} />
                              <div className="small muted">
                                나감 {t.away_count}번{t.away_ms ? ` (${sec(t.away_ms)})` : ""} · 보기 바꿈 {t.picks}번 · {t.solved_ok ? <span className="res-ac">맞힘</span> : <span className="faint">못 맞힘/정답 봄</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </td></tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table></div>
      {msg && <p className="small muted" style={{ margin: 0, padding: "10px 16px" }}>{msg}</p>}
    </section>
  );
}
