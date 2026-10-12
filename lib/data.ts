export type SubjectCode = "ko" | "ma" | "sc" | "so" | "en" | "hi" | "hm";

export const SUBJECTS: { code: SubjectCode; name: string; desc: string }[] = [
  { code: "ko", name: "국어", desc: "문학 · 문장의 짜임" },
  { code: "ma", name: "수학", desc: "삼각비 · 원의 성질" },
  { code: "sc", name: "과학", desc: "생식과 유전 · 에너지" },
  { code: "so", name: "사회", desc: "인권 · 헌법 · 글로벌" },
  { code: "en", name: "영어", desc: "Lesson 5–8 문법" },
  { code: "hi", name: "역사", desc: "조선의 성립 · 변동" },
  { code: "hm", name: "한문", desc: "한자 · 성어" },
];

export const subjectName = (code: string) => SUBJECTS.find((s) => s.code === code)?.name ?? code;

/** 난이도 1~5 → 점수 (서버의 points_for 함수와 같아야 함) */
export const DIFF = [
  { level: 1, label: "매우 쉬움", points: 5 },
  { level: 2, label: "쉬움", points: 10 },
  { level: 3, label: "보통", points: 20 },
  { level: 4, label: "어려움", points: 35 },
  { level: 5, label: "최상위", points: 50 },
];
export const diffOf = (d: number) => DIFF[Math.min(Math.max(d, 1), 5) - 1];

export type Question = {
  id: string;
  subject: string;
  unit: string;
  difficulty: number;
  body: string;
  choices: string[];
  author: string | null;
  author_nick: string;
  sort: number;
};

export type Progress = { question_id: string; points: number | null; tried: boolean; answer: number | null };

export type BoardRow = { rank: number; user_id: string; nickname: string; points: number; solved: number };
