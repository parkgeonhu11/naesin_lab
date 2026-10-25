"use client";
import { useCallback, useEffect, useState } from "react";
import { DiffBadge, TypeBadge } from "@/components/Badges";
import { REVIEW, SUBJECTS, subjectName, type ReviewStatus } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";

type Item = {
  id: string; no: number; subject: string; unit: string; topic: string; qtype: string; difficulty: number; grade: number; school_id: string | null;
  body: string; choices: string[]; answer: number | null; answer_text: string | null; explanation: string;
  review_status: ReviewStatus; basis: string; reviewed_at: string | null; created_at: string; updated_at: string;
  edits: number; open_reports: number; total: number;
};
type Sum = { subject: string; pending: number; checked: number; verified: number };
type Hist = { changed_at: string; kind: string; before: Record<string, unknown>; after: Record<string, unknown>; who: string };

const PAGE = 20;
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "–");
const KIND: Record<string, string> = { edit: "내용 수정", answer: "정답 수정", review: "검수 상태" };
const short = (v: unknown, k = "") => {
  if (k === "answer" && typeof v === "number") return `${v + 1}번`;
  const t = typeof v === "string" ? v : JSON.stringify(v);
  return t && t.length > 120 ? t.slice(0, 120) + "…" : t ?? "";
};

function History({ id }: { id: string }) {
  const [rows, setRows] = useState<Hist[] | null>(null);
  useEffect(() => {
    sb().rpc("admin_question_history", { p_question: id }).then(({ data }) => setRows((data as Hist[]) ?? []));
  }, [id]);
  if (!rows) return <p className="small faint">불러오는 중…</p>;
  if (!rows.length) return <p className="small faint">수정 이력이 없어.</p>;
  return (
    <ul className="review-hist">
      {rows.map((h, i) => (
        <li key={i}>
          <b>{KIND[h.kind] ?? h.kind}</b> <span className="faint">· {new Date(h.changed_at).toLocaleString("ko-KR")}{h.who ? ` · ${h.who}` : ""}</span>
          {Object.keys(h.after).map((k) => (
            <div key={k} className="small"><code>{k}</code> {short(h.before[k], k)} → <b>{short(h.after[k], k)}</b></div>
          ))}
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({ it, onChanged }: { it: Item; onChanged: () => void }) {
  const [basis, setBasis] = useState(it.basis);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [hist, setHist] = useState(false);
  const mc = it.qtype === "mc";

  const set = async (status: ReviewStatus) => {
    setBusy(true);
    setMsg("");
    const { error } = await sb().rpc("admin_set_review", { p_question: it.id, p_status: status, p_basis: basis });
    setBusy(false);
    if (error) return setMsg(friendly(error));
    onChanged();
  };

  return (
    <article className="panel panel-body review-card">
      <div className="row small muted" style={{ gap: 6 }}>
        <b className="num" style={{ color: "var(--text)" }}>{it.no}번</b>
        <span className="badge subj">{subjectName(it.subject)}</span>
        <TypeBadge type={it.qtype} /> <DiffBadge level={it.difficulty} />
        <span>{[it.unit, it.topic].filter(Boolean).join(" › ")}</span>
        <span className={`review-tag rv-${it.review_status}`}>{REVIEW[it.review_status].label}</span>
        {it.open_reports > 0 && <span className="badge lv4">오류 제보 {it.open_reports}</span>}
        <a className="link push-right" href={`/problem/${it.no}`} target="_blank" rel="noreferrer">문제 화면</a>
      </div>
      <div className="review-body">{it.body}</div>
      {mc ? (
        <ol className="review-choices">
          {it.choices.map((c, i) => <li key={i} className={i === it.answer ? "ans" : ""}>{c}{i === it.answer && <b> ← 정답</b>}</li>)}
        </ol>
      ) : (
        <div className="small">정답: <b>{it.answer_text}</b></div>
      )}
      {it.explanation && <div className="review-exp small"><b>해설</b> {it.explanation}</div>}
      <div className="small faint">만든 날 {day(it.created_at)} · 고친 날 {day(it.updated_at)} · 검수 {day(it.reviewed_at)}</div>
      <label className="small muted review-basis">
        출제 근거 (교과서 쪽수, 학교 범위 등)
        <input className="input" value={basis} maxLength={200} placeholder="예: 교과서 146~165쪽 / ○○중 2학기 기말 범위" onChange={(e) => setBasis(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className="btn line" disabled={busy} onClick={() => set("checked")}>정답·해설 확인함</button>
        <button type="button" className="btn" disabled={busy} onClick={() => set("verified")}>교과서 대조까지 완료</button>
        {it.review_status !== "pending" && <button type="button" className="btn line" disabled={busy} onClick={() => set("pending")}>검수 전으로</button>}
        <button type="button" className="btn line push-right" onClick={() => setHist((v) => !v)}>수정 이력 {it.edits}건</button>
      </div>
      {msg && <p className="small res-wa" style={{ margin: 0 }}>{msg}</p>}
      {hist && <History id={it.id} />}
    </article>
  );
}

/** 관리자: 문제 검수 (검수 전 → 정답·해설 확인 → 교과서 대조) */
export default function AdminReview() {
  const [sum, setSum] = useState<Sum[]>([]);
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "">("pending");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Item[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const [{ data: s }, { data: r, error }] = await Promise.all([
      sb().rpc("admin_review_summary"),
      sb().rpc("admin_review_list", { p_subject: subject || null, p_status: status || null, p_q: q.trim() || null, p_limit: PAGE, p_offset: page * PAGE }),
    ]);
    setSum((s as Sum[]) ?? []);
    setRows(error ? [] : ((r as Item[]) ?? []));
  }, [subject, status, q, page]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const tot = sum.reduce((a, s) => ({ p: a.p + +s.pending, c: a.c + +s.checked, v: a.v + +s.verified }), { p: 0, c: 0, v: 0 });
  const total = rows?.[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>문제 검수</h2>
        <span className="small faint">내용·정답을 고치면 자동으로 "검수 전"으로 돌아가고 수정 이력이 남아</span>
        <button type="button" className="btn line push-right" onClick={() => setOpen((v) => !v)}>{open ? "접기" : "열기"}</button>
      </div>
      {open && (
        <div className="panel-body" style={{ display: "grid", gap: 12 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>과목</th><th className="r">검수 전</th><th className="r">정답·해설 검수</th><th className="r">교과서 대조</th></tr></thead>
              <tbody>
                {sum.map((s) => (
                  <tr key={s.subject}><td>{subjectName(s.subject)}</td><td className="r n">{s.pending}</td><td className="r n">{s.checked}</td><td className="r n">{s.verified}</td></tr>
                ))}
                <tr><td><b>합계</b></td><td className="r n"><b>{tot.p}</b></td><td className="r n"><b>{tot.c}</b></td><td className="r n"><b>{tot.v}</b></td></tr>
              </tbody>
            </table>
          </div>
          <div className="filters">
            <select aria-label="과목" value={subject} onChange={(e) => { setSubject(e.target.value); setPage(0); }}>
              <option value="">전체 과목</option>
              {SUBJECTS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <select aria-label="검수 상태" value={status} onChange={(e) => { setStatus(e.target.value as ReviewStatus | ""); setPage(0); }}>
              <option value="">모든 상태</option>
              {(Object.keys(REVIEW) as ReviewStatus[]).map((k) => <option key={k} value={k}>{REVIEW[k].label}</option>)}
            </select>
            <input type="search" placeholder="번호·본문·단원 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="검색" />
          </div>
          {rows === null && <p className="small faint">불러오는 중…</p>}
          {rows && rows.length === 0 && <p className="small faint">조건에 맞는 문제가 없어.</p>}
          {rows?.map((it) => <ReviewCard key={it.id + it.review_status + it.basis} it={it} onChanged={load} />)}
          {total > PAGE && (
            <div className="row" style={{ gap: 8, justifyContent: "center" }}>
              <button type="button" className="btn line" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>이전</button>
              <span className="small muted num">{page + 1} / {pages} · {total}문제</span>
              <button type="button" className="btn line" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>다음</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
