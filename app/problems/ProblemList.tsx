"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DiffBadge, StateIcon, SubjBadge, TypeBadge } from "@/components/Badges";
import { DIFF, QTYPES, stateOf, SUBJECTS, subjectName } from "@/lib/data";
import { useMe } from "@/lib/useMe";
import { buildTree, useProblems } from "@/lib/useProblems";

/** 주소에 쓸 분류 링크 (?subject=ma&unit=...&topic=...) */
const href = (subject?: string, unit?: string, topic?: string) => {
  const p = new URLSearchParams();
  if (subject) p.set("subject", subject);
  if (unit) p.set("unit", unit);
  if (topic) p.set("topic", topic);
  return `/problems${p.toString() ? "?" + p : ""}`;
};

export default function ProblemList() {
  const { error } = useMe();
  const { rows, prog } = useProblems();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const subject = params.get("subject") ?? "";
  const unit = params.get("unit") ?? "";
  const topic = params.get("topic") ?? "";
  const diff = params.get("diff") ?? "";
  const type = params.get("type") ?? "";
  const mine = params.get("mine") ?? "";
  const [q, setQ] = useState("");

  /** 필터를 주소창에 저장해서 새로고침·공유해도 그대로 보이게 */
  const setParam = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.replace(`${path}${next.toString() ? "?" + next : ""}`, { scroll: false });
  };

  const tree = useMemo(() => buildTree(rows ?? []), [rows]);

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (subject && r.subject !== subject) return false;
      if (unit && (r.unit || "기타") !== unit) return false;
      if (topic && (r.topic || "기타") !== topic) return false;
      if (diff && String(r.difficulty) !== diff) return false;
      if (type && r.qtype !== type) return false;
      const st = stateOf(prog[r.id]);
      if (mine === "unsolved" && (st === "solved" || st === "revealed")) return false;
      if (mine === "solved" && st !== "solved") return false;
      if (mine === "tried" && st !== "tried") return false;
      if (kw && !`${r.no} ${r.title} ${r.unit} ${r.topic}`.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [rows, subject, unit, topic, diff, type, mine, q, prog]);

  const solvedHere = shown.filter((r) => stateOf(prog[r.id]) === "solved").length;
  const crumbs = [subject && subjectName(subject), unit, topic].filter(Boolean) as string[];

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      <div className="page-title">
        <h1>{crumbs.length ? crumbs[crumbs.length - 1] : "전체 문제"}</h1>
        <span className="muted small">
          {crumbs.length > 1 && <>{crumbs.slice(0, -1).join(" › ")} · </>}
          {shown.length}문제 중 {solvedHere}개 해결
        </span>
        {shown.length > 0 && (
          <Link className="btn line" style={{ marginLeft: "auto" }} href={`/exam?${new URLSearchParams({ ...(subject && { subject }), ...(unit && { unit }), ...(topic && { topic }) })}`}>
            이 범위로 시험지 만들기
          </Link>
        )}
      </div>

      <div className="list-grid">
        {/* 왼쪽: 분류 (과목 → 대단원 → 세부 유형) */}
        <aside className="panel cat-box" aria-label="분류">
          <div className="cat">
            <div className="cat-title">분류</div>
            <Link href="/problems" aria-current={!subject}>
              전체 <span>{rows?.length ?? 0}</span>
            </Link>
            {SUBJECTS.map((s) => (
              <div key={s.code}>
                <Link href={href(s.code)} aria-current={subject === s.code && !unit}>
                  {s.name} <span>{tree[s.code]?.count ?? 0}</span>
                </Link>
                {subject === s.code &&
                  Object.entries(tree[s.code]?.units ?? {}).map(([u, uv]) => (
                    <div key={u}>
                      <Link className="unit" href={href(s.code, u)} aria-current={unit === u && !topic}>
                        {u} <span>{uv.count}</span>
                      </Link>
                      {unit === u &&
                        Object.entries(uv.topics).map(([t, n]) => (
                          <Link key={t} className="topic" href={href(s.code, u, t)} aria-current={topic === t}>
                            {t} <span>{n}</span>
                          </Link>
                        ))}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </aside>

        {/* 오른쪽: 필터 + 문제 표 */}
        <section className="panel">
          <div className="filters">
            <select className="cat-mobile" aria-label="과목" value={subject} onChange={(e) => setParam({ subject: e.target.value, unit: "", topic: "" })}>
              <option value="">전체 과목</option>
              {SUBJECTS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            {subject && (
              <select className="cat-mobile" aria-label="대단원" value={unit} onChange={(e) => setParam({ unit: e.target.value, topic: "" })}>
                <option value="">전체 단원</option>
                {Object.keys(tree[subject]?.units ?? {}).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
            {subject && unit && (
              <select className="cat-mobile" aria-label="세부 유형" value={topic} onChange={(e) => setParam({ topic: e.target.value })}>
                <option value="">전체 유형</option>
                {Object.keys(tree[subject]?.units[unit]?.topics ?? {}).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select aria-label="난이도" value={diff} onChange={(e) => setParam({ diff: e.target.value })}>
              <option value="">난이도 전체</option>
              {DIFF.map((d) => <option key={d.level} value={d.level}>{d.label} ({d.points}점)</option>)}
            </select>
            <select aria-label="문제 유형" value={type} onChange={(e) => setParam({ type: e.target.value })}>
              <option value="">유형 전체</option>
              {QTYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            <select aria-label="풀이 상태" value={mine} onChange={(e) => setParam({ mine: e.target.value })}>
              <option value="">풀이 상태 전체</option>
              <option value="unsolved">안 푼 문제</option>
              <option value="solved">맞힌 문제</option>
              <option value="tried">틀린 문제</option>
            </select>
            <input id="search" type="search" placeholder="번호·제목·단원 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="검색" />
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="c" style={{ width: 64 }}>번호</th>
                  <th>제목</th>
                  <th className="hide-m">단원 · 유형</th>
                  <th className="c hide-m">형식</th>
                  <th className="c">난이도</th>
                  <th className="r">정답률</th>
                  <th className="c">내 상태</th>
                </tr>
              </thead>
              <tbody>
                {rows === null && <tr><td colSpan={7} className="empty-cell">불러오는 중…</td></tr>}
                {rows && shown.length === 0 && <tr><td colSpan={7} className="empty-cell">조건에 맞는 문제가 없어.</td></tr>}
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="c n"><Link className="link" href={`/problem/${r.no}`}>{r.no}</Link></td>
                    <td className="title-cell"><Link href={`/problem/${r.no}`}>{r.title}</Link></td>
                    <td className="unit-cell hide-m">
                      {!subject && <><SubjBadge code={r.subject} /> </>}
                      <span className="small muted">{topic ? r.topic : unit ? r.topic : r.unit}</span>
                    </td>
                    <td className="c hide-m"><TypeBadge type={r.qtype} /></td>
                    <td className="c nowrap"><DiffBadge level={r.difficulty} /></td>
                    <td className="r n nowrap" title={`맞힌 사람 ${r.solvers}명 · 제출 ${r.submissions}번`}>{r.submissions ? `${r.accuracy}%` : "–"}</td>
                    <td className="c nowrap"><StateIcon state={stateOf(prog[r.id])} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
