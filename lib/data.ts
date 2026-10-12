export type SubjectCode = "ko" | "ma" | "sc" | "so" | "en" | "hi" | "hm";

export const SUBJECTS: { code: SubjectCode; name: string }[] = [
  { code: "ko", name: "국어" },
  { code: "ma", name: "수학" },
  { code: "sc", name: "과학" },
  { code: "so", name: "사회" },
  { code: "en", name: "영어" },
  { code: "hi", name: "역사" },
  { code: "hm", name: "한문" },
];

export const subjectName = (code: string) => SUBJECTS.find((s) => s.code === code)?.name ?? code;

/** 난이도 1~5 → 이름, 점수 (서버의 points_for 함수와 같아야 함) */
export const DIFF = [
  { level: 1, label: "매우 쉬움", points: 5 },
  { level: 2, label: "쉬움", points: 10 },
  { level: 3, label: "보통", points: 20 },
  { level: 4, label: "어려움", points: 35 },
  { level: 5, label: "최상위", points: 50 },
];
export const diffOf = (d: number) => DIFF[Math.min(Math.max(d, 1), 5) - 1];

/** 문제 유형 */
export const QTYPES = [
  { code: "mc", label: "객관식" },
  { code: "short", label: "단답형" },
] as const;
export type QType = (typeof QTYPES)[number]["code"];
export const qtypeName = (t: string) => QTYPES.find((q) => q.code === t)?.label ?? t;

/** 문제 목록 한 줄 (정답은 없음) */
export type ProblemRow = {
  no: number;
  id: string;
  subject: string;
  unit: string;     // 대단원
  topic: string;    // 세부 유형
  qtype: QType;
  difficulty: number;
  title: string;
  solvers: number;
  submissions: number;
  accuracy: number;
  source: string;
  author_nick: string;
  from_student: boolean;
};

/** 문제 상세 */
export type Question = {
  id: string;
  no: number;
  subject: string;
  unit: string;
  topic: string;
  qtype: QType;
  difficulty: number;
  body: string;
  choices: string[];
  explanation?: string;
  source: string;
  author: string | null;
  author_nick: string;
};

export type Progress = {
  question_id: string;
  points: number | null;   // null = 아직 안 끝남, 0 = 정답 보기, >0 = 맞힘
  tried: boolean;          // 틀린 적 있음
  wrong: number;           // 틀린 횟수
  answer: number | null;   // 끝난 문제만: 객관식 정답 (0부터)
  answer_text: string | null; // 끝난 문제만: 단답형 정답
  explanation: string | null;
};

/** 내 풀이 상태: solved(점수 받음) / revealed(정답 보기, 0점) / tried(틀림) / none */
export type MyState = "solved" | "revealed" | "tried" | "none";
export function stateOf(p?: Progress): MyState {
  if (!p) return "none";
  if (p.points != null) return p.points > 0 ? "solved" : "revealed";
  return p.tried ? "tried" : "none";
}

export type BoardRow = { rank: number; user_id: string; nickname: string; points: number; solved: number; submissions: number };

export type Submission = {
  id: number;
  nickname: string;
  is_me: boolean;
  problem_no: number;
  subject: string;
  title: string;
  is_correct: boolean;
  created_at: string;
};

/** 단원(세부 유형)별 내 성적 */
export type UnitStat = {
  subject: string;
  unit: string;
  topic: string;
  total: number;
  solved: number;
  attempted: number;
  submissions: number;
  correct_submissions: number;
};

/** 채점 결과 (submit_answer 응답) */
export type GradeResult = {
  correct: boolean;
  points: number;
  already?: boolean;
  tried?: number;
  answer?: number | null;
  answer_text?: string | null;
  explanation?: string;
};

/** 정답을 사람이 읽는 문장으로 */
export function answerLabel(q: { qtype: string; choices: string[] }, answer?: number | null, answerText?: string | null) {
  if (q.qtype === "short") return answerText || "";
  if (answer == null) return "";
  return `${answer + 1}번 (${q.choices[answer] ?? ""})`;
}

/** "3분 전" 같은 상대 시간 */
export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

/** 배열 섞기 (시험지 문제 고르기용) */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
