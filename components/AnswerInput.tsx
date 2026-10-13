"use client";
import type { Question } from "@/lib/data";
import { GuardedText } from "@/components/Guarded";

export type AnswerValue = { choice: number | null; text: string };
export const emptyAnswer: AnswerValue = { choice: null, text: "" };
export const hasAnswer = (q: Pick<Question, "qtype">, v: AnswerValue) => (q.qtype === "short" ? v.text.trim() !== "" : v.choice !== null);

/**
 * 객관식이면 보기 버튼, 단답형이면 입력 칸을 보여 준다.
 * reveal: 정답을 공개할 때 (객관식 보기 번호 / 단답형 정답 글자)
 * wrongPick: 틀린 보기 표시
 */
export default function AnswerInput({
  q,
  value,
  onChange,
  disabled,
  revealChoice,
  revealText,
  wrongPick,
  onEnter,
  idPrefix = "ans",
  guard,
}: {
  q: Pick<Question, "qtype" | "choices">;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  disabled?: boolean;
  revealChoice?: number | null;
  revealText?: string | null;
  wrongPick?: number | null;
  onEnter?: () => void;
  idPrefix?: string;
  /** 복사 방지할 문제면 문제 id */
  guard?: string;
}) {
  if (q.qtype === "short") {
    return (
      <div className="short-answer">
        <input
          id={`${idPrefix}-text`}
          value={value.text}
          disabled={disabled}
          maxLength={100}
          placeholder="정답을 입력해"
          autoComplete="off"
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          aria-label="정답 입력"
        />
        {revealText ? (
          <span>정답 <span className="answer-box">{revealText}</span></span>
        ) : (
          <span className="hint">띄어쓰기, 마침표, ° 기호는 신경 쓰지 않아도 돼.</span>
        )}
      </div>
    );
  }
  return (
    <ol className="choices">
      {q.choices.map((c, i) => {
        const cls = ["choice"];
        if (revealChoice === i) cls.push("right");
        if (wrongPick === i) cls.push("wrong");
        return (
          <li key={i}>
            <button
              type="button"
              className={cls.join(" ")}
              aria-pressed={value.choice === i}
              disabled={disabled}
              onClick={() => onChange({ ...value, choice: i })}
            >
              <span className="cn">{i + 1}</span>
              {guard ? <GuardedText as="span" className="ct" text={c} seed={guard + i} on /> : <span className="ct">{c}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
