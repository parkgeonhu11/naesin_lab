"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import Icon from "@/components/Icon";
import Rich from "@/components/learn/Rich";
import { POLY_SUMMARY } from "@/lib/learn/polySummary";
import { unitBySlug } from "@/lib/learn/units";

export default function SummaryPage() {
  const { unit } = useParams<{ unit: string }>();
  const u = unitBySlug(unit);
  if (!u) return <p className="muted">없는 단원이야. <Link className="link" href="/learn">수학 학습으로</Link></p>;
  return (
    <>
      <div className="learn-crumb"><Link href={`/learn/${u.slug}`}><Icon name="back" size={16} /> {u.title}</Link><span>{u.course}</span></div>
      <div className="page-title"><h1>{u.title} 한 장 요약</h1><span className="muted small">시험 전에 5분만 훑어봐. 헷갈리는 줄은 눌러서 그 레슨으로.</span></div>
      <div className="sum-grid">
        {POLY_SUMMARY.map((s) => (
          <section key={s.title} className="sum-card">
            <div className="sum-head"><span className="lesson-no">{s.lesson}</span><b>{s.title}</b><Link className="link-btn" href={`/learn/${u.slug}/lesson/${s.lesson}`}>레슨 보기</Link></div>
            <Rich text={s.points.map((p) => `- ${p}`).join("\n")} />
          </section>
        ))}
      </div>
    </>
  );
}
