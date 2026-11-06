"use client";
import Link from "next/link";
import Icon from "@/components/Icon";
import { COURSES, POLY } from "@/lib/learn/units";
import { summarize, useLearn } from "@/lib/learn/useLearn";

export default function LearnHome() {
  const { status } = useLearn(POLY);
  const sum = status ? summarize(POLY, status) : null;
  const pct = sum ? Math.round(sum.total * 100) : 0;
  return (
    <>
      <section className="learn-hero">
        <div className="grow">
          <span className="learn-kicker">수학 학습 <span className="beta">베타</span></span>
          <h1>모르는 데서부터, 내 속도로</h1>
          <p>개념 카드로 이해하고 → 기본 → 유형 → 실전 순서로 올라가. 틀린 유형은 1일·3일·7일 뒤에 새 문제로 다시 나와서 진짜 내 것이 돼.</p>
          <div className="learn-hero-actions">
            <Link className="btn white big" href="/learn/poly">다항식부터 시작하기 <Icon name="arrow" /></Link>
            {sum && sum.due.length > 0 && <Link className="btn ghost" href="/learn/poly/review">오늘 복습 {sum.due.length}개</Link>}
          </div>
        </div>
        <div className="learn-hero-ring" aria-label={`다항식 진행률 ${pct}%`}>
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" className="ring-bg" /><circle cx="60" cy="60" r="50" className="ring-fg" style={{ strokeDasharray: `${pct * 3.1416} 314.16` }} /></svg>
          <b>{pct}%</b><small>다항식</small>
        </div>
      </section>

      <section className="learn-map">
        {COURSES.map((c, ci) => (
          <div key={c.name} className="course">
            <div className="course-head"><span className="course-no">{ci + 1}</span><b>{c.name}</b></div>
            <ul>
              {c.units.map((u) =>
                u.slug ? (
                  <li key={u.title}>
                    <Link href={`/learn/${u.slug}`} className="unit-pill open">
                      <span className="grow">{u.title}</span>
                      <span className="unit-pct num">{pct}%</span>
                    </Link>
                  </li>
                ) : (
                  <li key={u.title}><span className="unit-pill"><span className="grow">{u.title}</span><Icon name="lock" size={15} /></span></li>
                ),
              )}
            </ul>
          </div>
        ))}
      </section>
      <p className="small faint learn-foot">
        지금은 공통수학1 다항식 단원만 열려 있어. 다른 단원은 하나씩 추가할게. 모든 설명과 문제는 내신랩이 직접 만든 거야.
      </p>
    </>
  );
}
