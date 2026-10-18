"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { subjectName } from "@/lib/data";
import { useMe } from "@/lib/useMe";

/** 시험 일정 (한국 시간 기준 날짜) · 지금은 서연중 3학년 일정만 있어 */
const EXAM_FOR = { school: "seoyeon", grade: 3 };
export const EXAM_DAYS = [
  { date: "2026-10-20", label: "10/20 (화)", subjects: ["sc", "ma", "ko"] },
  { date: "2026-10-21", label: "10/21 (수)", subjects: ["en", "so", "hi"] },
];

/** 오늘 날짜(한국 시간)를 "YYYY-MM-DD"로 */
function todayKST() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400_000);

type Count = Record<string, { total: number; solved: number }>;

export default function ExamDday({ counts }: { counts: Count }) {
  const { school, grade } = useMe();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(todayKST());
    const t = setInterval(() => setToday(todayKST()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!today) return null;
  if (school?.id !== EXAM_FOR.school || grade !== EXAM_FOR.grade) return null;

  const last = EXAM_DAYS[EXAM_DAYS.length - 1].date;
  if (today > last) return null; // 시험 끝나면 숨김

  const d = dayDiff(today, EXAM_DAYS[0].date);
  const big = d > 0 ? `D-${d}` : today === EXAM_DAYS[0].date ? "D-DAY" : "시험 2일차";
  const msg =
    d > 1 ? "과목별로 안 푼 문제부터 하나씩 끝내 보자." :
    d === 1 ? "내일 시험이야! 오답 노트로 틀린 문제만 다시 보자." :
    today === EXAM_DAYS[0].date ? "오늘 첫날 시험! 끝나면 내일 과목 오답을 정리하자." :
    "마지막 날이야. 끝까지 힘내!";

  return (
    <section className="dday" aria-label="시험 일정">
      <div className="dday-head">
        <b className="dday-big">{big}</b>
        <div>
          <strong>{school.name.replace(/학교$/, "")} {grade}학년 2학기 시험</strong>
          <small>{msg}</small>
        </div>
      </div>
      <div className="dday-days">
        {EXAM_DAYS.map((day) => {
          const gone = today > day.date;
          const now = today === day.date;
          return (
            <div key={day.date} className={`dday-day${now ? " now" : ""}${gone ? " gone" : ""}`}>
              <span className="dday-date">{day.label}{now && <em>오늘</em>}</span>
              <div className="dday-subj">
                {day.subjects.map((s) => {
                  const c = counts[s] ?? { total: 0, solved: 0 };
                  const p = c.total ? Math.round((100 * c.solved) / c.total) : 0;
                  return (
                    <Link key={s} href={`/problems?subject=${s}`} data-s={s} title={`${subjectName(s)} ${c.solved}/${c.total}문제 맞힘`}>
                      <b>{subjectName(s)}</b>
                      <small className="n">{c.solved}/{c.total}</small>
                      <span className="dday-bar"><span style={{ width: `${p}%` }} /></span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
