"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import Runner, { type RunResult } from "@/components/learn/Runner";
import { itemsOf } from "@/lib/learn/units";
import { PASS, summarize, useLearn, type LearnStatus } from "@/lib/learn/useLearn";
import type { Item, Unit } from "@/lib/learn/types";

type Mode = { kind: "basic" } | { kind: "type"; tag: string } | { kind: "practical" } | { kind: "review" };

/** 안 푼 문제 → 틀린 문제 → 맞힌 문제 순서 */
function order(items: Item[], s: LearnStatus) {
  const rank = (i: Item) => (s.seen[i.key] === undefined ? 0 : s.seen[i.key] ? 2 : 1);
  return [...items].sort((a, b) => rank(a) - rank(b));
}

/** 복습할 유형마다 새 문제 하나 (처음 틀린 문제는 빼고) */
function reviewItems(u: Unit, s: LearnStatus) {
  const now = Date.now();
  const due = s.reviews.filter((r) => new Date(r.due_at).getTime() <= now);
  const out: Item[] = [];
  for (const r of due) {
    const pool = u.items.filter((i) => i.tag === r.type_tag && i.stage !== "concept" && i.key !== r.source);
    const pick = order(pool, s)[0] ?? u.items.find((i) => i.key === r.source);
    if (pick) out.push(pick);
  }
  return out.slice(0, 10);
}

export default function StagePlay({ u, mode }: { u: Unit; mode: Mode }) {
  const { status, reload } = useLearn(u);
  const [result, setResult] = useState<RunResult[] | null>(null);
  const [run, setRun] = useState(0);
  // 문제 목록은 처음 불러온 상태로 고정 (풀면서 바뀌지 않게)
  const items = useMemo(() => {
    if (!status) return null;
    if (mode.kind === "basic") return order(itemsOf(u, "basic"), status).slice(0, 10);
    if (mode.kind === "type") return order(itemsOf(u, "type", { tag: mode.tag }), status);
    if (mode.kind === "practical") return itemsOf(u, "practical");
    return reviewItems(u, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === null, run]);

  const t = mode.kind === "type" ? u.types.find((x) => x.tag === mode.tag) : null;
  const title = mode.kind === "basic" ? "기본 문제" : mode.kind === "type" ? `유형: ${t?.title ?? ""}` : mode.kind === "practical" ? "실전 문제" : "오늘의 복습";
  const sub = mode.kind === "basic" ? `최근 10문제 중 ${PASS.basicOk}개를 맞히면 통과`
    : mode.kind === "type" ? `${t?.desc ?? ""} · 최근 4문제 중 ${PASS.typeOk}개`
    : mode.kind === "practical" ? "여러 개념이 섞인 문제야. 시간을 재면서 풀어 봐"
    : "틀렸던 유형을 새 문제로. 1일 → 3일 → 7일, 세 번 맞히면 완성";
  const typeTitle = (tag: string) => u.types.find((x) => x.tag === tag)?.title;

  return (
    <>
      <div className="learn-crumb"><Link href={`/learn/${u.slug}`}><Icon name="back" size={16} /> {u.title}</Link><span>{u.course}</span></div>
      <div className="page-title"><h1>{title}</h1><span className="muted small">{sub}</span></div>
      {!items && <p className="muted">불러오는 중…</p>}
      {items && items.length === 0 && (
        <section className="panel panel-body empty-learn">
          <b>{mode.kind === "review" ? "오늘은 복습할 게 없어 🎉" : "풀 문제가 없어"}</b>
          <p className="small muted">{mode.kind === "review" ? "틀린 유형이 생기면 하루 뒤에 여기로 와." : ""}</p>
          <Link className="btn" href={`/learn/${u.slug}`}>단원으로</Link>
        </section>
      )}
      {items && items.length > 0 && !result && (
        <section className="panel panel-body">
          <Runner key={run} items={items} mode={mode.kind === "review" ? "review" : mode.kind === "practical" ? "practical" : "learn"} typeTitle={typeTitle} onDone={(r) => { setResult(r); reload(); }} />
        </section>
      )}
      {result && status && (() => {
        const ok = result.filter((r) => r.credited).length;
        const s = summarize(u, status);
        const passedNow = mode.kind === "basic" ? s.passed.basic : mode.kind === "type" ? s.typeDone(mode.tag) : mode.kind === "practical" ? s.passed.practical : false;
        return (
          <section className={`panel panel-body lcard result ${passedNow ? "pass" : ""}`}>
            <div className="result-big">{result.length}문제 중 {ok}개</div>
            <p>{passedNow ? "이 단계를 통과했어! 👏" : mode.kind === "review" ? "복습 끝! 맞힌 유형은 다음 복습 날짜로 넘어갔어." : "틀린 유형은 내일 복습에 새 문제로 다시 나와. 한 번 더 도전해도 좋아."}</p>
            <div className="lcard-actions">
              <Link className="btn line" href={`/learn/${u.slug}`}>단원으로</Link>
              {mode.kind !== "review" && <button type="button" className="btn" onClick={() => { setResult(null); setRun((x) => x + 1); }}>다시 풀기</button>}
            </div>
          </section>
        );
      })()}
    </>
  );
}
