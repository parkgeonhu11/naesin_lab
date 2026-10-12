"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DiffBadge, StateIcon, SubjBadge } from "@/components/Badges";
import { DIFF, stateOf, SUBJECTS, subjectName, type Progress, type ProblemRow } from "@/lib/data";
import { isConfigured, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function ProblemList() {
  const { user, error } = useMe();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const subject = params.get("subject") ?? "";
  const unit = params.get("unit") ?? "";
  const diff = params.get("diff") ?? "";
  const mine = params.get("mine") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");

  const [rows, setRows] = useState<ProblemRow[] | null>(null);
  const [prog, setProg] = useState<Record<string, Progress>>({});

  useEffect(() => {
    if (!isConfigured) return;
    sb().rpc("problem_list").then(({ data }) => setRows((data as ProblemRow[]) ?? []));
  }, []);
  useEffect(() => {
    if (!user) return;
    sb().rpc("my_progress").then(({ data }) => {
      const m: Record<string, Progress> = {};
      ((data as Progress[]) ?? []).forEach((p) => (m[p.question_id] = p));
      setProg(m);
    });
  }, [user]);

  /** 주소창(?subject=ma&unit=...)으로 필터를 저장해서, 새로고침·공유해도 그대로 보이게 */
  const setParam = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.replace(`${path}${next.toString() ? "?" + next : ""}`, { scroll: false });
  };

  // 분류 트리: 과목 → 단원 (문제 수 포함)
  const tree = useMemo(() => {
    const t: Record<string, { count: number; units: Record<string, number> }> = {};
    (rows ?? []).forEach((r) => {
      t[r.subject] ??= { count: 0, units: {} };
      t[r.subject].count++;
      const u = r.unit || "기타";
      t[r.subject].units[u] = (t[r.subject].units[u] ?? 0) + 1;
    });
    return t;
  }, [rows]);

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (subject && r.subject !== subject) return false;
      if (unit && (r.unit || "기타") !== unit) return false;
      if (diff && String(r.difficulty) !== diff) return false;
      const st = stateOf(prog[r.id]);
      if (mine === "unsolved" && (st === "solved" || st === "revealed")) return false;
      if (mine === "solved" && st !== "solved") return false;
      if (mine === "tried" && st !== "tried") return false;
      if (kw && !(`${r.no} ${r.title} ${r.unit}`.toLowerCase().includes(kw))) return false;
      return true;
    });
  }, [rows, subject, unit, diff, mine, q, prog]);

  const solvedCount = Object.values(prog).filter((p) => (p.points ?? 0) > 0).length;
  const heading = unit ? `${subjectName(subject)} · ${unit}` : subject ? subjectName(subject) : "전체 문제";

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      <div className="page-title">
        <h1>{heading}</h1>
        <span className="muted small">{shown.length}문제 · 내가 맞힌 문제 {solvedCount}개</span>
      </div>

      <div className="list-grid">
        {/* 왼쪽: 분류 */}
        <aside className="panel cat-box" aria-label="분류">
          <div className="cat">
            <div className="cat-title">분류</div>
            <Link href="/problems" aria-current={!subject}>
              전체 <span>{rows?.length ?? 0}</span>
            </Link>
            {SUBJECTS.map((s) => (
              <div key={s.code}>
                <Link href={`/problems?subject=${s.code}`} aria-current={subject === s.code && !unit}>
                  {s.name} <span>{tree[s.code]?.count ?? 0}</span>
                </Link>
                {subject === s.code &&
                  Object.entries(tree[s.code]?.units ?? {}).map(([u, n]) => (
                    <Link key={u} className="unit" href={`/problems?subject=${s.code}&unit=${encodeURIComponent(u)}`} aria-current={unit === u}>
                      {u} <span>{n}</span>
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        </aside>

        {/* 오른쪽: 문제 표 */}
        <section className="panel">
          <div className="filters">
            <select className="cat-mobile" aria-label="과목" value={subject} onChange={(e) => setParam({ subject: e.target.value, unit: "" })}>
              <option value="">전체 과목</option>
              {SUBJECTS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            {subject && (
              <select className="cat-mobile" aria-label="단원" value={unit} onChange={(e) => setParam({ unit: e.target.value })}>
                <option value="">전체 단원</option>
                {Object.keys(tree[subject]?.units ?? {}).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
            <select aria-label="난이도" value={diff} onChange={(e) => setParam({ diff: e.target.value })}>
              <option value="">난이도 전체</option>
              {DIFF.map((d) => <option key={d.level} value={d.level}>{d.label} ({d.points}점)</option>)}
            </select>
            <select aria-label="풀이 상태" value={mine} onChange={(e) => setParam({ mine: e.target.value })}>
              <option value="">풀이 상태 전체</option>
              <option value="unsolved">안 푼 문제</option>
              <option value="solved">맞힌 문제</option>
              <option value="tried">틀린 문제</option>
            </select>
            <input id="search" type="search" placeholder="번호나 제목으로 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="검색" />
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="c" style={{ width: 70 }}>번호</th>
                  <th>제목</th>
                  <th className="hide-m">분류</th>
                  <th className="c">난이도</th>
                  <th className="r hide-m">맞힌 사람</th>
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
                    <td className="unit-cell hide-m">{!subject && <><SubjBadge code={r.subject} /> </>}<span className="small muted">{r.unit}</span></td>
                    <td className="c nowrap"><DiffBadge level={r.difficulty} /></td>
                    <td className="r n hide-m">{r.solvers}</td>
                    <td className="r n nowrap">{r.submissions ? `${r.accuracy}%` : "–"}</td>
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
