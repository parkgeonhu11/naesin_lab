import { MOCK_FIGS } from "./mockFigs";

/** 예상 시험(모의고사) 공통 타입·도우미 */
export type MockExam = {
  id: string; subject: string; title: string; scope: string | null; time_limit: number;
  items: number; essays: number; takers: number;
  my_status: "running" | "done" | null; my_correct: number | null; my_total: number | null;
  my_elapsed: number | null; my_score: number | null; my_rank: number | null; my_tries: number;
};
export type MockItem = { no: number; pts: number; stem: string; bogi: string[] | null; fig: string | null; choices: string[]; lay: string; ans?: number; expl?: string };
export type MockEssay = { no: number; pts: number; stem: string; fig: string | null; subs: string[] | null; model: string; rubric: string | null };
export type MockStart = {
  attempt: number; ranked: boolean; started_at: string; deadline: string; now: string; time_limit: number;
  saved: (number | null)[]; title: string; subject: string; items: MockItem[];
};
export type MockResult = {
  attempt: number; exam_id: string; ranked: boolean; auto: boolean; correct: number; total: number;
  pts_earned: number; pts_total: number; elapsed: number; score: number; answers: (number | null)[];
  submitted_at: string; rank: number | null; takers: number; items: MockItem[]; essays: MockEssay[];
};
export type MockBoardRow = { rank: number; user_id: string; nickname: string; correct: number; total: number; elapsed: number; score: number; submitted_at: string };

/** 그림: '@키'면 앱에 들어 있는 그림, 아니면 그대로(표 같은 짧은 HTML) */
export const figHtml = (fig: string | null | undefined) => (!fig ? "" : fig.startsWith("@") ? MOCK_FIGS[fig.slice(1)] ?? "" : fig);

export const CIRC = ["①", "②", "③", "④", "⑤"];
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export const minsec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, "0")}초` : `${s}초`);

/** 랭킹 점수 설명 (서버와 같은 식) */
export const bonusOf = (limit: number, elapsed: number, correct: number, total: number) =>
  total ? Math.round(((limit - Math.min(limit, elapsed)) / 15) * (correct / total)) : 0;
