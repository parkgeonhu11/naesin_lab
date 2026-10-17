"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DiffBadge } from "@/components/Badges";
import Explain from "@/components/Explain";
import Figure from "@/components/Figure";
import { SUBJECTS, subjectName } from "@/lib/data";
import type { FigureSpec } from "@/lib/figure";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Row = {
  no: number; subject: string; unit: string; topic: string; qtype: string; difficulty: number; body: string;
  choices: string[] | null; figure: FigureSpec | null; explanation: string | null; answer: number | null; answer_text: string | null;
  submissions: number; accuracy: number | null; must: boolean; reasons: string[]; my_state: "solved" | "tried" | "new";
};

/** 약점 집중: 수학은 원, 과학은 유전. 나머지 과목은 전부 */
const WEAK: Record<string, (r: Row) => boolean> = {
  ma: (r) => r.unit.includes("원"),
  sc: (r) => r.unit.includes("유전") && /멘델|사람의 유전|감수/.test(r.topic),
};
const isWeak = (r: Row) => (WEAK[r.subject] ? WEAK[r.subject](r) : true);
const CIRC = ["①", "②", "③", "④", "⑤"];
const STATE: Record<Row["my_state"], string> = { solved: "맞힘", tried: "틀린 적 있음", new: "안 풀어 봄" };

export default function AllbackPage() {
  const { user, ready } = useMe();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [subj, setSubj] = useState("all");
  const [weak, setWeak] = useState(false);
  const [todo, setTodo] = useState(false);
  const [openAll, setOpenAll] = useState(false);
  const [open, setOpen] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!ready) return;
    if (!user || user.is_anonymous) { setErr("관리자 계정으로 로그인해야 볼 수 있어."); setRows([]); return; }
    sb().rpc("admin_allback").then(({ data, error }) => {
      if (error) { setErr(friendly(error)); setRows([]); return; }
      setRows((data as Row[]) ?? []);
    });
  }, [ready, user]);

  const list = useMemo(
    () => (rows ?? []).filter((r) => (subj === "all" || r.subject === subj) && (!weak || isWeak(r)) && (!todo || r.my_state !== "solved")),
    [rows, subj, weak, todo],
  );
  const count = (s: string) => (rows ?? []).filter((r) => s === "all" || r.subject === s).length;
  const solved = list.filter((r) => r.my_state === "solved").length;
  const toggle = (no: number) => setOpen((o) => { const n = new Set(o); if (n.has(no)) n.delete(no); else n.add(no); return n; });

  return (
    <>
      <div className="page-title">
        <h1>올백 문제 모음</h1>
        <span className="muted small">관리자만 보이는 페이지야. 난이도 4~5, 과목별 필수 20, 정답률 60% 아래 함정 문제를 정답·해설과 같이 모았어.</span>
      </div>
      {err && <div className="notice warn">{err}</div>}
      <section className="panel">
        <div className="tabs">
          {[{ code: "all", name: "전체" }, ...SUBJECTS].map((s) => (
            <button key={s.code} aria-pressed={subj === s.code} onClick={() => setSubj(s.code)}>
              {s.name} <span className="num faint">{rows ? count(s.code) : ""}</span>
            </button>
          ))}
        </div>
        <div className="ab-tools">
          <label><input type="checkbox" id="ab-weak" checked={weak} onChange={(e) => setWeak(e.target.checked)} /> 약점 집중 (수학 원 · 과학 유전)</label>
          <label><input type="checkbox" id="ab-todo" checked={todo} onChange={(e) => setTodo(e.target.checked)} /> 아직 못 맞힌 것만</label>
          <label><input type="checkbox" id="ab-open" checked={openAll} onChange={(e) => setOpenAll(e.target.checked)} /> 정답·해설 전부 펼치기</label>
          <span className="small muted ab-count">{rows ? `${list.length}문제 · 맞힘 ${solved}` : "불러오는 중…"}</span>
        </div>
      </section>

      <div className="ab-list">
        {rows && list.length === 0 && !err && <div className="panel panel-body muted">조건에 맞는 문제가 없어.</div>}
        {list.map((r) => {
          const shown = openAll || open.has(r.no);
          return (
            <article key={r.no} className={`panel ab-card sub-${r.subject}`} id={`q${r.no}`}>
              <header className="ab-head">
                <Link href={`/problem/${r.no}`} className="ab-no num">{r.no}</Link>
                <span className="badge subj">{subjectName(r.subject)}</span>
                <DiffBadge level={r.difficulty} />
                {r.reasons.filter((x) => !/난도/.test(x)).map((x) => <span key={x} className={`ab-chip ${x.startsWith("정답률") ? "hot" : ""}`}>{x}</span>)}
                <span className={`ab-state ${r.my_state}`}>{STATE[r.my_state]}</span>
              </header>
              <p className="small muted ab-where">{r.unit} · {r.topic}{r.submissions ? ` · 친구들 정답률 ${r.accuracy}% (${r.submissions}번 제출)` : ""}</p>
              <p className="statement ab-body">{r.body}</p>
              <Figure spec={r.figure} />
              {r.qtype === "mc" && r.choices && r.choices.length > 0 && (
                <ol className="choices">
                  {r.choices.map((c, i) => (
                    <li key={i} className={`choice ab-choice ${shown && r.answer === i ? "right" : ""}`}>
                      <span className="cn">{i + 1}</span><span>{c}</span>
                    </li>
                  ))}
                </ol>
              )}
              <div className="row">
                <button className="btn line" onClick={() => toggle(r.no)} aria-expanded={shown} disabled={openAll}>{shown ? "정답·해설 접기" : "정답·해설 보기"}</button>
                <Link className="btn line" href={`/problem/${r.no}`}>사이트에서 풀기</Link>
              </div>
              {shown && (
                <div className="ab-answer">
                  <p className="ab-ans"><b>정답</b> {r.qtype === "mc" && r.answer !== null ? `${CIRC[r.answer]} ${r.choices?.[r.answer] ?? ""}` : (r.answer_text ?? "").split("|").join(" / ")}</p>
                  {r.explanation && <Explain text={r.explanation} style={{ fontSize: 15 }} />}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
