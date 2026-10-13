"use client";
import Link from "next/link";
import { useMemo } from "react";
import { DiffBadge, SubjBadge, TypeBadge } from "@/components/Badges";
import { stateOf, type ProblemRow, type Progress } from "@/lib/data";
import { useMe } from "@/lib/useMe";
import { useProblems } from "@/lib/useProblems";
import { useRowLink } from "@/lib/useRowLink";

type Row = ProblemRow & { p: Progress };

function Table({ rows, empty, showRetry }: { rows: Row[]; empty: string; showRetry?: boolean }) {
  const rowLink = useRowLink();
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th className="c">번호</th><th>제목</th><th className="hide-m">단원 · 유형</th><th className="c hide-m">형식</th><th className="c">난이도</th><th className="r">틀린 횟수</th>
            {showRetry && <th className="c">다시</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={7} className="empty-cell">{empty}</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} {...rowLink(`/problem/${r.no}`)}>
              <td className="c n"><Link className="link" href={`/problem/${r.no}`}>{r.no}</Link></td>
              <td className="title-cell"><Link className="cell-link" href={`/problem/${r.no}`}>{r.title}</Link></td>
              <td className="unit-cell hide-m"><SubjBadge code={r.subject} /> <span className="small muted">{r.topic || r.unit}</span></td>
              <td className="c hide-m"><TypeBadge type={r.qtype} /></td>
              <td className="c nowrap"><DiffBadge level={r.difficulty} /></td>
              <td className="r n res-wa">{r.p.wrong}</td>
              {showRetry && <td className="c"><Link className="link small" href={`/problem/${r.no}`}>풀기</Link></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReviewPage() {
  const { error } = useMe();
  const { rows, prog } = useProblems();

  const { open, fixed, revealed } = useMemo(() => {
    const all: Row[] = (rows ?? []).filter((r) => prog[r.id]).map((r) => ({ ...r, p: prog[r.id] }));
    return {
      open: all.filter((r) => stateOf(r.p) === "tried").sort((a, b) => b.p.wrong - a.p.wrong),          // 틀렸고 아직 못 맞힘
      fixed: all.filter((r) => stateOf(r.p) === "solved" && r.p.wrong > 0),                             // 틀렸다가 맞힘
      revealed: all.filter((r) => stateOf(r.p) === "revealed"),                                         // 정답 보기로 넘김
    };
  }, [rows, prog]);

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      <div className="page-title">
        <h1>오답 노트</h1>
        <span className="muted small">틀린 문제를 모아 뒀어. 다시 맞히면 절반 점수를 받아. 두 번째 오답부터는 틀릴 때마다 감점되니까 신중하게!</span>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>아직 못 맞힌 문제 <span className="num res-wa">{open.length}</span></h2>
          {open.length > 0 && (
            <Link className="btn" style={{ marginLeft: "auto" }} href={`/exam?nos=${open.map((r) => r.no).join(",")}`}>
              이 문제들로 시험 보기
            </Link>
          )}
        </div>
        <Table rows={rows === null ? [] : open} empty={rows === null ? "불러오는 중…" : "못 맞힌 문제가 없어. 잘하고 있어!"} showRetry />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>틀렸다가 맞힌 문제 <span className="num res-ac">{fixed.length}</span></h2><span className="small faint">시험 전에 한 번 더 보면 좋아.</span></div>
        <Table rows={fixed} empty="아직 없어." />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>정답 보기로 넘긴 문제 <span className="num muted">{revealed.length}</span></h2><span className="small faint">점수는 없지만 해설은 다시 볼 수 있어.</span></div>
        <Table rows={revealed} empty="아직 없어." />
      </section>
    </>
  );
}
