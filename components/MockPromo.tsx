"use client";
import Link from "next/link";
import Icon from "@/components/Icon";

const SUBS = [
  { code: "ko", name: "국어" }, { code: "ma", name: "수학" }, { code: "en", name: "영어" },
  { code: "sc", name: "과학" }, { code: "so", name: "사회" }, { code: "hi", name: "역사" },
];

/** 예상 시험 안내 카드 (홈·시험지 화면에 들어감) */
export default function MockPromo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/mock" className={`mock-promo ${compact ? "compact" : ""}`}>
      <span className="mock-promo-ic"><Icon name="timer" size={26} /></span>
      <span className="mock-promo-txt">
        <b>기말 예상 시험 <span className="mock-new">NEW</span></b>
        <small>실제 시험처럼 25분 안에 풀고, 과목마다 따로 랭킹을 겨뤄 봐.</small>
        {!compact && (
          <span className="mock-promo-subs">
            {SUBS.map((s) => <span key={s.code} className={`sub-${s.code}`}><i className="subject-badge">{s.name.slice(0, 1)}</i>{s.name}</span>)}
          </span>
        )}
      </span>
      <span className="mock-promo-go">시험 보러 가기 <span aria-hidden="true">→</span></span>
    </Link>
  );
}
