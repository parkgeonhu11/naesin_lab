import { diffOf, subjectName, type MyState } from "@/lib/data";

export function DiffBadge({ level }: { level: number }) {
  const d = diffOf(level);
  return (
    <span className={`badge lv${d.level}`} title={`${d.label} · ${d.points}점`}>
      {d.label}
    </span>
  );
}

export function SubjBadge({ code }: { code: string }) {
  return <span className="badge subj">{subjectName(code)}</span>;
}

/** 채점 결과 표시 (온라인 저지처럼 "맞았습니다!!" / "틀렸습니다") */
export function ResultText({ correct }: { correct: boolean }) {
  return correct ? <span className="res-ac">맞았습니다!!</span> : <span className="res-wa">틀렸습니다</span>;
}

/** 문제 목록의 내 상태 */
export function StateIcon({ state }: { state: MyState }) {
  if (state === "solved") return <span className="state-icon solved" title="맞힌 문제">✓ 해결</span>;
  if (state === "revealed") return <span className="state-icon revealed" title="정답 보기로 넘긴 문제">– 확인</span>;
  if (state === "tried") return <span className="state-icon tried" title="틀린 적 있는 문제">✗ 시도</span>;
  return null;
}
