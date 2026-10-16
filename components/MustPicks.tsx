"use client";
import Link from "next/link";
import { useState } from "react";
import { DiffBadge, StateIcon } from "@/components/Badges";
import { stateOf, SUBJECTS, subjectName, type ProblemRow, type Progress } from "@/lib/data";

/** 과목을 고르면 문제 목록 맨 위에 나오는 '필수 20' */
export function MustPicksPanel({ subject, rows, picks, prog }: {
  subject: string; rows: ProblemRow[]; picks: Map<string, { subject: string; rank: number }>; prog: Record<string, Progress>;
}) {
  const list = rows
    .filter((r) => picks.get(r.id)?.subject === subject)
    .sort((a, b) => (picks.get(a.id)?.rank ?? 0) - (picks.get(b.id)?.rank ?? 0));
  const [open, setOpen] = useState(false);
  if (!list.length) return null;
  const done = list.filter((r) => stateOf(prog[r.id]) === "solved").length;
  const pct = Math.round((100 * done) / list.length);
  return (
    <section className="must" aria-labelledby="must-title">
      <div className="must-head">
        <span className="must-star" aria-hidden="true">★</span>
        <div className="grow">
          <h2 id="must-title">{subjectName(subject)} 필수 {list.length}문제</h2>
          <p>시험 단원을 골고루 담고, 자주 틀리는 함정까지 넣은 문제들이야. 내신 전에 이것만큼은 꼭 풀어 보자.</p>
        </div>
        <div className="must-prog">
          <b>{done}<small>/{list.length}</small></b>
          <span className="must-bar"><span style={{ width: `${pct}%` }} /></span>
          <small>{done === list.length ? "다 풀었어!" : `${list.length - done}문제 남음`}</small>
        </div>
      </div>
      <ol className={`must-list ${open ? "open" : ""}`}>
        {list.map((r, i) => {
          const st = stateOf(prog[r.id]);
          return (
            <li key={r.id} className={st === "solved" ? "done" : ""}>
              <Link href={`/problem/${r.no}`}>
                <span className="must-rank">{i + 1}</span>
                <span className="must-txt">
                  <b>{r.title}</b>
                  <small>{r.topic} · {r.no}번</small>
                </span>
                <DiffBadge level={r.difficulty} />
                <span className="must-st"><StateIcon state={st} /></span>
              </Link>
            </li>
          );
        })}
      </ol>
      {!open && <button type="button" className="must-more" onClick={() => setOpen(true)}>20문제 다 보기 ▾</button>}
      <div className="must-foot">
        <Link className="btn" href={`/exam?nos=${list.map((r) => r.no).join(",")}`}>20문제 한 번에 시험지로 풀기</Link>
        {done < list.length && (
          <Link className="btn line" href={`/problem/${list.find((r) => stateOf(prog[r.id]) !== "solved")!.no}`}>안 푼 것부터 풀기</Link>
        )}
      </div>
    </section>
  );
}

/** '전체' 화면에서 과목별 필수 20으로 가는 칩 */
export function MustPicksChips({ rows, picks, prog }: { rows: ProblemRow[]; picks: Map<string, { subject: string; rank: number }>; prog: Record<string, Progress> }) {
  const stat = SUBJECTS.map((s) => {
    const l = rows.filter((r) => picks.get(r.id)?.subject === s.code);
    return { ...s, n: l.length, done: l.filter((r) => stateOf(prog[r.id]) === "solved").length };
  }).filter((s) => s.n);
  if (!stat.length) return null;
  return (
    <section className="must must-mini">
      <div className="must-head">
        <span className="must-star" aria-hidden="true">★</span>
        <div className="grow">
          <h2>과목별 필수 20문제</h2>
          <p>과목을 누르면 맨 위에 꼭 풀어야 할 20문제가 나와.</p>
        </div>
      </div>
      <div className="must-chips">
        {stat.map((s) => (
          <Link key={s.code} href={`/problems?subject=${s.code}`} className={`must-chip sub-${s.code}`}>
            <i className="subject-badge">{s.name.slice(0, 1)}</i>
            <span>{s.name}</span>
            <small>{s.done}/{s.n}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
