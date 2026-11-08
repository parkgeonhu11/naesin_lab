"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SchoolCard from "@/components/SchoolCard";
import { ago } from "@/lib/data";
import { friendly, IS_PREVIEW, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Row = {
  course_id: number; course_name: string; subject: string; kind: string; publisher: string | null; votes: number; total: number;
  confirmed: boolean; my_publisher: string | null; my_note: string | null; notes: number; school_name: string; level: string; grade: number | null;
};
type Course = { id: number; level: string; subject: string; name: string; kind: string; grade_hint: number | null };
type Note = { id: number; nickname: string; publisher: string; note: string; admin_reply: string | null; created_at: string; mine: boolean };

const OTHER = "__other";

function Notes({ courseId, tick }: { courseId: number; tick: number }) {
  const [list, setList] = useState<Note[] | null>(null);
  useEffect(() => {
    sb().rpc("textbook_notes", { p_course: courseId }).then(({ data }) => setList((data as Note[]) ?? []));
  }, [courseId, tick]);
  if (list === null) return <p className="small faint">불러오는 중…</p>;
  if (!list.length) return <p className="small faint">아직 남긴 의견이 없어.</p>;
  return (
    <ul className="tb-notes">
      {list.map((n) => (
        <li key={n.id}>
          <div className="small"><b>{n.nickname}{n.mine ? " (나)" : ""}</b> <span className="faint">{n.publisher} · {ago(n.created_at)}</span></div>
          {n.note && <p>{n.note}</p>}
          {n.admin_reply && <p className="tb-reply"><b>내신랩</b> {n.admin_reply}</p>}
        </li>
      ))}
    </ul>
  );
}

function CourseRow({ r, pubs, onSaved }: { r: Row; pubs: string[]; onSaved: () => void }) {
  const known = !r.my_publisher || pubs.includes(r.my_publisher);
  const [pick, setPick] = useState(r.my_publisher ? (known ? r.my_publisher : OTHER) : "");
  const [custom, setCustom] = useState(known ? "" : r.my_publisher ?? "");
  const [note, setNote] = useState(r.my_note ?? "");
  const [open, setOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const publisher = pick === OTHER ? custom.trim() : pick;

  const save = async () => {
    setBusy(true);
    const { data, error } = await sb().rpc("report_textbook", { p_course: r.course_id, p_publisher: publisher, p_note: note });
    setBusy(false);
    setMsg(error ? friendly(error) : (data as string));
    if (!error) { setOpen(false); setTick((t) => t + 1); onSaved(); }
  };

  return (
    <li className="tb-row">
      <div className="tb-main">
        <div className="tb-name">
          <b>{r.course_name}</b>
          <small>{r.kind === "중학" ? "" : r.kind}</small>
        </div>
        <div className="tb-now">
          {r.publisher ? (
            <>
              <span className="tb-pub">{r.publisher}</span>
              <span className="small faint">{r.confirmed ? "확정" : `${r.total}명 중 ${r.votes}명`}</span>
            </>
          ) : (
            <span className="small faint">아직 아무도 안 알려 줬어</span>
          )}
        </div>
        <button type="button" className="btn line" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {r.my_publisher ? "고치기" : "알려 주기"}
        </button>
      </div>

      {r.my_publisher && !open && <p className="small muted tb-mine">내가 알려 준 것: {r.my_publisher}{r.my_note ? ` · "${r.my_note}"` : ""}</p>}

      {open && (
        <form className="tb-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="small muted">출판사
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)} required>
              <option value="" disabled>골라 줘</option>
              {pubs.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value={OTHER}>목록에 없어 (직접 쓰기)</option>
            </select>
          </label>
          {pick === OTHER && (
            <label className="small muted">출판사 이름
              <input className="input" maxLength={20} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="교과서 표지 아래쪽에 적혀 있어" required />
            </label>
          )}
          <label className="small muted">의견 (안 써도 돼)
            <textarea className="input" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 1학기 시험 범위가 3단원까지야, 단원 순서가 달라" />
          </label>
          <div className="row">
            <button className="btn" disabled={busy || !publisher}>{busy ? "보내는 중…" : "보내기"}</button>
            <button type="button" className="btn line" onClick={() => setOpen(false)}>취소</button>
          </div>
        </form>
      )}
      {msg && <p className="small muted">{msg}</p>}

      {(r.notes > 0 || showNotes) && (
        <button type="button" className="link-btn small" onClick={() => setShowNotes((s) => !s)}>
          {showNotes ? "의견 접기" : `친구들 의견 ${r.notes}개 보기`}
        </button>
      )}
      {showNotes && <Notes courseId={r.course_id} tick={tick} />}
    </li>
  );
}

export default function TextbookPage() {
  const { ready, user, school, grade } = useMe();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pubs, setPubs] = useState<string[]>([]);
  const [extra, setExtra] = useState<number[]>([]);
  const [add, setAdd] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [m, c, p] = await Promise.all([sb().rpc("my_textbooks"), sb().rpc("textbook_courses"), sb().rpc("textbook_publishers_list")]);
    if (m.error) setErr(friendly(m.error));
    setRows((m.data as Row[]) ?? []);
    setCourses((c.data as Course[]) ?? []);
    setPubs(((p.data as { name: string }[]) ?? []).map((x) => x.name));
  }, []);

  useEffect(() => { if (user && school) load(); }, [user, school, grade, load]);

  const level = rows?.[0]?.level ?? (school && /(고등학교|고)$/.test(school.name) ? "high" : "mid");
  const shown = useMemo(() => new Set((rows ?? []).map((r) => r.course_id)), [rows]);
  const addable = courses.filter((c) => c.level === level && !shown.has(c.id) && !extra.includes(c.id));
  const extraRows: Row[] = extra
    .filter((id) => !shown.has(id))
    .map((id) => courses.find((c) => c.id === id)!)
    .filter(Boolean)
    .map((c) => ({ course_id: c.id, course_name: c.name, subject: c.subject, kind: c.kind, publisher: null, votes: 0, total: 0, confirmed: false, my_publisher: null, my_note: null, notes: 0, school_name: school?.name ?? "", level, grade }));

  if (!IS_PREVIEW) return <p className="muted">준비 중인 기능이야.</p>;
  if (!ready) return <p className="muted">불러오는 중…</p>;

  return (
    <>
      <div className="page-title">
        <h1>우리 학교 교과서</h1>
      </div>
      <p className="lead tb-lead">
        과목마다 어느 출판사 교과서를 쓰는지 알려 줘. 같은 학교 친구들 답을 모아서, 그 교과서 단원 순서대로 시험 범위 문제를 묶어 줄게.
      </p>

      {(!school || !grade) && <SchoolCard title="먼저 학교와 학년을 골라 줘" compact />}
      {err && <div className="notice warn">{err}</div>}

      {school && grade && (
        <section className="tb">
          <h2 className="tb-h">{school.name} {grade}학년</h2>
          {rows === null && <p className="small faint">불러오는 중…</p>}
          <ul className="tb-list">
            {[...(rows ?? []), ...extraRows].map((r) => <CourseRow key={r.course_id} r={r} pubs={pubs} onSaved={load} />)}
          </ul>

          {addable.length > 0 && (
            <div className="tb-add">
              <label className="small muted">{level === "high" ? "선택과목 더하기" : "다른 과목 더하기"}
                <select className="input" value={add} onChange={(e) => setAdd(e.target.value)}>
                  <option value="">과목 고르기</option>
                  {["중학", "공통", "일반선택", "진로선택", "융합선택"].map((k) => {
                    const list = addable.filter((c) => c.kind === k);
                    return list.length ? (
                      <optgroup key={k} label={k === "중학" ? "중학교" : k}>
                        {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                    ) : null;
                  })}
                </select>
              </label>
              <button type="button" className="btn line" disabled={!add} onClick={() => { setExtra((x) => [...x, Number(add)]); setAdd(""); }}>더하기</button>
            </div>
          )}
          <p className="small faint">교과서 표지 아래쪽이나 맨 뒤쪽에 출판사 이름이 적혀 있어. 잘못 알려 줘도 언제든 고칠 수 있어.</p>
        </section>
      )}
      <p className="small"><Link href="/problems" className="link">문제 풀러 가기</Link></p>
    </>
  );
}
