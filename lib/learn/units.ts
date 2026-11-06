import { POLY_ITEMS } from "./polyItems";
import { POLY_LESSONS } from "./polyLessons";
import type { Item, Stage, Unit } from "./types";

export const POLY: Unit = {
  id: "cm1.poly",
  slug: "poly",
  course: "공통수학1",
  title: "다항식",
  summary: "식의 덧셈·곱셈부터 나눗셈, 항등식, 나머지정리, 인수분해까지. 고등 수학 전체의 기초 체력을 만드는 단원이야.",
  lessons: POLY_LESSONS,
  types: [
    { tag: "poly.ops", title: "다항식의 연산", desc: "식을 대입해서 정리하고, 원하는 항의 계수만 빠르게 구하기", lesson: "poly.l2" },
    { tag: "poly.formula", title: "곱셈 공식의 변형", desc: "a+b, ab로 a²+b², a³+b³ 같은 값 구하기", lesson: "poly.l3" },
    { tag: "poly.div", title: "나눗셈과 조립제법", desc: "몫과 나머지, A=BQ+R 관계 쓰기", lesson: "poly.l4" },
    { tag: "poly.ident", title: "항등식", desc: "계수비교법·수치대입법, 계수의 합 구하기", lesson: "poly.l5" },
    { tag: "poly.rem", title: "나머지정리·인수정리", desc: "나누지 않고 나머지 구하기, 미정계수 결정", lesson: "poly.l6" },
    { tag: "poly.factor", title: "인수분해", desc: "공식, 치환, 인수정리로 곱의 꼴 만들기", lesson: "poly.l7" },
  ],
  items: POLY_ITEMS,
};

export const UNITS: Unit[] = [POLY];
export const unitBySlug = (slug: string) => UNITS.find((u) => u.slug === slug) ?? null;

/** 과목 지도 (열린 단원은 slug가 있다) */
export const COURSES: { name: string; units: { title: string; slug?: string }[] }[] = [
  { name: "공통수학1", units: [{ title: "다항식", slug: "poly" }, { title: "방정식과 부등식" }, { title: "경우의 수" }, { title: "행렬" }] },
  { name: "공통수학2", units: [{ title: "도형의 방정식" }, { title: "집합과 명제" }, { title: "함수와 그래프" }] },
  { name: "대수", units: [{ title: "지수함수와 로그함수" }, { title: "삼각함수" }, { title: "수열" }] },
  { name: "미적분Ⅰ", units: [{ title: "함수의 극한과 연속" }, { title: "미분" }, { title: "적분" }] },
];

export const itemsOf = (u: Unit, stage: Stage, opt?: { lesson?: string; tag?: string }) =>
  u.items.filter((i) => i.stage === stage && (!opt?.lesson || i.lesson === opt.lesson) && (!opt?.tag || i.tag === opt.tag));

export const itemByKey = (u: Unit, key: string): Item | undefined => u.items.find((i) => i.key === key);
