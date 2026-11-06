"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { itemsOf, unitBySlug } from "@/lib/learn/units";
import { PASS, summarize, useLearn } from "@/lib/learn/useLearn";
import { STAGES, type Stage } from "@/lib/learn/types";

const when = (iso: string) => {
  const d = (new Date(iso).getTime() - Date.now()) / 86400000;
  if (d <= 0) return "오늘";
  if (d < 1) return "내일";
  return `${Math.ceil(d)}일 뒤`;
};

export default function UnitPage() {
  const { unit } = useParams<{ unit: string }>();
  const u = unitBySlug(unit);
  const { status } = useLearn(u);
  const [peek, setPeek] = useState<Stage | null>(null);
  if (!u) return <p className="muted">없는 단원이야. <Link className="link" href="/learn">수학 학습으로</Link></p>;
  const s = status ? summarize(u, status) : null;
  const pct = s ? Math.round(s.total * 100) : 0;

  // 이어서 하기: 아직 안 끝낸 첫 레슨 → 현재 단계
  const nextLesson = u.lessons.find((l) => !s?.lessonDone(l.id));
  const cont = !s ? null
    : s.current === "concept" && nextLesson ? { href: `/learn/${u.slug}/lesson/${nextLesson.no}`, label: `개념 ${nextLesson.no}. ${nextLesson.title}` }
    : s.current === "basic" ? { href: `/learn/${u.slug}/basic`, label: "기본 문제" }
    : s.current === "type" ? (() => { const t = u.types.find((t) => !s.typeDone(t.tag))!; return { href: `/learn/${u.slug}/type/${t.tag.split(".")[1]}`, label: `유형: ${t.title}` }; })()
    : s.current === "practical" ? { href: `/learn/${u.slug}/practical`, label: "실전 문제" }
    : null;

  const Lock = ({ st }: { st: Stage }) => {
    const prev = STAGES[STAGES.findIndex((x) => x.key === st) - 1];
    return (
      <div className="stage-lock">
        <Icon name="lock" size={16} />
        <span>먼저 <b>{prev.label}</b> 단계를 통과하면 열려. 순서대로 하면 훨씬 쉬워.</span>
        {peek !== st && <button type="button" className="link-btn" onClick={() => setPeek(st)}>그래도 미리 볼래</button>}
      </div>
    );
  };
  const open = (st: Stage) => !!s && (s.unlocked(st) || peek === st);

  return (
    <>
      <div className="learn-crumb"><Link href="/learn"><Icon name="back" size={16} /> 수학 학습</Link><span>{u.course}</span></div>
      <section className="unit-hero">
        <div className="grow">
          <h1>{u.title}</h1>
          <p>{u.summary}</p>
          {cont && <Link className="btn big" href={cont.href}>이어서 하기 · {cont.label} <Icon name="arrow" /></Link>}
          {s && !s.current && <p className="unit-done">🎉 다항식 단원을 모두 통과했어! 복습만 이어 가면 돼.</p>}
        </div>
        <div className="unit-ring" aria-label={`진행률 ${pct}%`}>
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" className="ring-bg" /><circle cx="60" cy="60" r="50" className="ring-fg" style={{ strokeDasharray: `${pct * 3.1416} 314.16` }} /></svg>
          <b>{pct}%</b>
        </div>
      </section>

      {s && s.due.length > 0 && (
        <Link href={`/learn/${u.slug}/review`} className="review-banner">
          <Icon name="repeat" />
          <span className="grow"><b>오늘 복습할 유형 {s.due.length}개</b><small>틀렸던 유형을 새 문제로 다시 풀 시간이야</small></span>
          <Icon name="arrow" />
        </Link>
      )}

      <ol className="stage-path" aria-label="학습 단계">
        {STAGES.map((st, i) => {
          const done = s?.passed[st.key];
          const now = s?.current === st.key;
          return (
            <li key={st.key} className={`${done ? "done" : ""}${now ? " now" : ""}${s && !s.unlocked(st.key) ? " locked" : ""}`}>
              <span className="sp-dot">{done ? "✓" : i + 1}</span>
              <b>{st.label}</b>
              <small>{st.rule}</small>
              <span className="sp-bar"><span style={{ width: `${Math.round((s?.progress[st.key] ?? 0) * 100)}%` }} /></span>
            </li>
          );
        })}
      </ol>

      {/* 1. 개념 */}
      <section className="panel stage-sec">
        <div className="panel-head"><h2>1. 개념</h2><span className="small faint">카드를 보고 확인 문제 5개 중 {PASS.conceptOk}개를 맞히면 통과</span></div>
        <ul className="lesson-list">
          {u.lessons.map((l) => {
            const c = status?.concept[l.id];
            const done = s?.lessonDone(l.id);
            return (
              <li key={l.id}>
                <Link href={`/learn/${u.slug}/lesson/${l.no}`} className={`lesson-row${done ? " done" : ""}`}>
                  <span className="lesson-no">{done ? "✓" : l.no}</span>
                  <span className="grow"><b>{l.title}</b><small>{l.goal}</small></span>
                  <span className="lesson-meta">{c ? <span className={done ? "ok" : ""}>확인 {c.ok}/5</span> : <span className="faint">{l.minutes}분</span>}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 2. 기본 */}
      <section className="panel stage-sec">
        <div className="panel-head"><h2>2. 기본</h2><span className="small faint">공식을 그대로 써 보는 문제 {itemsOf(u, "basic").length}개</span></div>
        <div className="panel-body">
          {s && !s.unlocked("basic") && <Lock st="basic" />}
          {open("basic") && (
            <div className="stage-card">
              <div className="grow">
                <b>최근 10문제 중 {status?.basic.ok ?? 0}개 정답</b>
                <small>{PASS.basicOk}개 이상이면 통과 · 힌트 3개를 다 쓴 문제는 세지 않아</small>
              </div>
              <Link className="btn" href={`/learn/${u.slug}/basic`}>{s?.passed.basic ? "다시 풀기" : "풀기"}</Link>
            </div>
          )}
        </div>
      </section>

      {/* 3. 유형 */}
      <section className="panel stage-sec">
        <div className="panel-head"><h2>3. 유형</h2><span className="small faint">유형마다 최근 4문제 중 {PASS.typeOk}개</span></div>
        <div className="panel-body">
          {s && !s.unlocked("type") && <Lock st="type" />}
          {open("type") && (
            <div className="type-grid">
              {u.types.map((t, i) => {
                const st = status?.types[t.tag];
                const done = s?.typeDone(t.tag);
                return (
                  <Link key={t.tag} href={`/learn/${u.slug}/type/${t.tag.split(".")[1]}`} className={`type-card${done ? " done" : ""}`}>
                    <span className="type-no">유형 {i + 1}</span>
                    <b>{t.title}</b>
                    <small>{t.desc}</small>
                    <span className="type-prog">{done ? "✓ 통과" : st ? `최근 ${st.n}문제 중 ${st.ok}개` : `${itemsOf(u, "type", { tag: t.tag }).length}문제`}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. 실전 */}
      <section className="panel stage-sec">
        <div className="panel-head"><h2>4. 실전</h2><span className="small faint">여러 개념이 섞인 문제 {s?.pracTotal ?? 12}개</span></div>
        <div className="panel-body">
          {s && !s.unlocked("practical") && <Lock st="practical" />}
          {open("practical") && (
            <div className="stage-card">
              <div className="grow">
                <b>{status?.practical.n ? `${status.practical.n}문제 중 ${status.practical.ok}개 정답` : "아직 안 풀었어"}</b>
                <small>{Math.ceil((s?.pracTotal ?? 12) * PASS.practicalRate)}개 이상 맞히면 단원 통과 · 시간을 재 봐</small>
              </div>
              <Link className="btn" href={`/learn/${u.slug}/practical`}>{status?.practical.n ? "다시 풀기" : "시작"}</Link>
            </div>
          )}
        </div>
      </section>

      {/* 복습 */}
      {status && status.reviews.length > 0 && (
        <section className="panel stage-sec">
          <div className="panel-head"><h2>오답 복습</h2><span className="small faint">1일 → 3일 → 7일, 세 번 맞히면 완성 · 완성 {status.mastered}개</span></div>
          <ul className="review-list">
            {status.reviews.map((r) => {
              const t = u.types.find((t) => t.tag === r.type_tag);
              return (
                <li key={r.type_tag}>
                  <span className="grow"><b>{t?.title ?? r.type_tag}</b><small>{r.step}단계 / 3 {r.fails ? `· 연속 실패 ${r.fails}` : ""}</small></span>
                  <span className={new Date(r.due_at).getTime() <= Date.now() ? "due" : "faint"}>{when(r.due_at)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
