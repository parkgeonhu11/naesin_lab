/** 수학 학습(커리큘럼) 콘텐츠 타입. 문제의 정답·해설은 DB(learn_items)에만 있다. */
export type Level = "easy" | "normal" | "deep";
export const LEVELS: { key: Level; label: string; desc: string }[] = [
  { key: "easy", label: "쉽게", desc: "비유와 그림으로" },
  { key: "normal", label: "보통", desc: "교과서처럼 정확하게" },
  { key: "deep", label: "깊게", desc: "왜 그런지까지" },
];

/** 개념 카드 하나. kind 순서: 왜 배워 → 비유와 그림 → 쉬운 예제 → 직접 해보기 */
export type Card = {
  kind: "why" | "picture" | "example" | "try";
  title: string;
  /** 같은 내용을 세 가지 깊이로. 문단은 빈 줄, 수식은 $...$, 강조는 **...** */
  body: Record<Level, string>;
  /** 움직이는 그림 (components/learn/Visuals.tsx 의 이름) */
  visual?: string;
  /** 직접 해보기: 화면에서 바로 확인 (점수 없음) */
  practice?: { prompt: string; answers: string[]; placeholder?: string; hint: string; solution: string };
};

export type Lesson = {
  id: string;          // 'poly.l1'
  no: number;
  title: string;
  goal: string;        // 이 레슨이 끝나면 할 수 있는 것 한 줄
  minutes: number;
  cards: Card[];
};

export type Item = {
  key: string;
  stage: "concept" | "basic" | "type" | "practical";
  tag: string;
  lesson?: string | null;
  diff: number;
  qtype: "mc" | "short";
  body: string;
  choices?: string[];
  hints: [string, string, string];
};

export type TypeInfo = { tag: string; title: string; desc: string; lesson: string };

export type Unit = {
  id: string;          // 'cm1.poly'
  slug: string;        // URL용 'poly'
  course: string;      // '공통수학1'
  title: string;
  summary: string;
  lessons: Lesson[];
  types: TypeInfo[];
  items: Item[];
};

export type Stage = Item["stage"];
export const STAGES: { key: Stage; label: string; desc: string; rule: string }[] = [
  { key: "concept", label: "개념", desc: "카드로 이해하고 확인 문제 풀기", rule: "레슨마다 확인 문제 5개 중 4개" },
  { key: "basic", label: "기본", desc: "공식을 그대로 써 보는 문제", rule: "최근 10문제 중 8문제" },
  { key: "type", label: "유형", desc: "시험에 나오는 대표 유형", rule: "모든 유형에서 최근 4문제 중 3문제" },
  { key: "practical", label: "실전", desc: "여러 개념이 섞인 실전 문제", rule: "실전 문제 70% 이상" },
];
