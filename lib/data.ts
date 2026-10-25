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
  { level: 1, label: "기초", points: 5, desc: "용어·뜻·공식 하나만 알면 바로 풀리는 문제" },
  { level: 2, label: "쉬움", points: 10, desc: "개념 하나를 예문이나 간단한 계산(1~2단계)에 그대로 적용" },
  { level: 3, label: "보통", points: 20, desc: "개념 두 개를 연결하거나, 헷갈리는 보기 사이에서 골라야 하는 문제" },
  { level: 4, label: "어려움", points: 35, desc: "ㄱㄴㄷ 종합·순서 나열·함정 보기, 3단계 이상 풀이" },
  { level: 5, label: "최상위", points: 50, desc: "여러 단원을 엮은 학교 시험 마지막 문제 수준 (수학 21번급)" },
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
  /** 학교 전용 문제면 그 학교 id (null이면 학년 공통) */
  school_id?: string | null;
  /** 이 문제를 풀어 본 사람 수 (제출했거나 정답을 본 사람) */
  tried?: number;
  /** 이 문제를 맞힌 사람 수 */
  solved_people?: number;
};

type People = { question_id: string; tried: number; solved: number };
type RangeRpc = { rpc: (fn: string) => { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }> } };
/** 행이 많은 RPC를 1000줄씩 끝까지 불러온다 (서버가 한 번에 1000줄까지만 돌려줘서) */
export async function rpcAll<T>(client: RangeRpc, fn: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.rpc(fn).range(from, from + 999);
    if (error) break;
    const rows = (data as T[]) ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
/** 문제 목록 + 푼 사람/맞힌 사람 수를 함께 불러온다 */
export async function loadProblemRows(client: RangeRpc): Promise<ProblemRow[]> {
  const [list, people] = await Promise.all([rpcAll<ProblemRow>(client, "problem_list_v2"), rpcAll<People>(client, "problem_people")]);
  const m = new Map(((people as People[]) ?? []).map((p) => [p.question_id, p]));
  return ((list as ProblemRow[]) ?? []).map((r) => ({ ...r, tried: +(m.get(r.id)?.tried ?? 0), solved_people: +(m.get(r.id)?.solved ?? 0) }));
}

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
  /** 문제 그림 (좌표 설명). 없으면 null */
  figure?: import("./figure").FigureSpec | null;
  school_id?: string | null;
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

/** 관리자 계정의 공개 정답률은 98%로 고정해서 보여 준다 (틀린 기록 자체는 그대로 남음) */
export const ADMIN_ACC = 98;
export const accOf = (ok: number, subs: number, admin: boolean) => (admin ? ADMIN_ACC : subs ? Math.round((100 * ok) / subs) : null);

export type BoardRow = { rank: number; user_id: string; nickname: string; points: number; solved: number; submissions: number; school_name?: string | null; grade?: number | null };

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
  /** 이번 오답으로 깎인 점수 (양수) */
  penalty?: number;
  /** 다음에 또 틀리면 깎일 점수 */
  next_penalty?: number;
  /** 같은 오답을 다시 낸 경우 (감점 없음) */
  repeat?: boolean;
  /** 맞히기 전까지 오답으로 깎인 점수 합계 */
  lost?: number;
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

/** 오답 감점: 첫 오답은 봐주고, 두 번째 오답부터 배점의 25% (문제당 최대 4번) */
export const penaltyOf = (points: number) => Math.round(points * 0.25);
/** 지금까지 서로 다른 오답 수가 wrong일 때, 다음 오답에서 깎일 점수 */
export const nextPenalty = (points: number, wrong: number) => (wrong >= 1 && wrong <= 4 ? penaltyOf(points) : 0);

/** 홈 대시보드용 내 요약 (my_summary 함수) */
export type MySummary = {
  points: number;
  week: number;
  rank: number | null;
  players: number;
  solved: number;
  revealed: number;
  submissions: number;
  correct_submissions: number;
  today_solved: number;
  today_submissions: number;
  streak: number;
  week_subjects: number;
  week_subs: number;
  week_ok: number;
  last_subs: number;
  last_ok: number;
  daily: { d: string; n: number }[] | null;
};

/** 레벨 k가 되는 점수 = LV_STEP × k × (k − 1). Lv.2 70점 · Lv.5 700점 · Lv.10 3150점 · Lv.15 7350점 */
export const LV_STEP = 35;
export function levelOf(points: number) {
  const p = Math.max(0, points);
  let lv = 1;
  while (LV_STEP * (lv + 1) * lv <= p) lv++;
  const base = LV_STEP * lv * (lv - 1);
  const next = LV_STEP * (lv + 1) * lv;
  return { lv, base, next, toNext: next - p, pct: Math.round((100 * (p - base)) / (next - base)) };
}

/** 과목 아이콘에 쓰는 한 글자 */
export const subjectLetter = (code: string) => subjectName(code).slice(0, 1);
