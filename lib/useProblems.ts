"use client";
import { useCallback, useEffect, useState } from "react";
import { loadProblemRows, rpcAll, type ProblemRow, type Progress } from "./data";
import { isConfigured, sb } from "./supabase";
import { useMe } from "./useMe";

export type Category = { subject: string; unit: string; topic: string; sort: number };

/** 분류 구조(과목 → 대단원 → 세부 유형)를 불러온다. 문제가 없어도 분류는 보인다. */
export function useCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const reload = useCallback(async () => {
    if (!isConfigured) return;
    const { data } = await sb().from("categories").select("subject,unit,topic,sort").order("sort").order("unit").order("topic");
    setCats((data as Category[]) ?? []);
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { cats, reload };
}

/** 문제 목록(통계 포함), 내 풀이 상태, 분류 구조를 함께 불러온다. 여러 화면에서 같이 쓴다. */
export function useProblems() {
  const { user } = useMe();
  const { cats } = useCategories();
  const [rows, setRows] = useState<ProblemRow[] | null>(null);
  const [prog, setProg] = useState<Record<string, Progress>>({});

  const reload = useCallback(async () => {
    if (!isConfigured) return;
    const [list, mine] = await Promise.all([
      loadProblemRows(sb()),
      user ? rpcAll(sb(), "my_progress").then((data) => ({ data })) : Promise.resolve({ data: [] }),
    ]);
    setRows(list);
    const m: Record<string, Progress> = {};
    ((mine.data as Progress[]) ?? []).forEach((p) => (m[p.question_id] = p));
    setProg(m);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, prog, cats, reload };
}

/** 과목 → 대단원 → 세부 유형 트리 (문제 수 포함). 분류표에 있는 단원은 문제가 0개여도 들어간다. */
export type Tree = Record<string, { count: number; units: Record<string, { count: number; topics: Record<string, number> }> }>;
export function buildTree(rows: ProblemRow[], cats: Category[] = []): Tree {
  const t: Tree = {};
  const add = (subject: string, unit: string, topic: string, n: number) => {
    const u = unit || "기타";
    const tp = topic || "기타";
    t[subject] ??= { count: 0, units: {} };
    t[subject].count += n;
    t[subject].units[u] ??= { count: 0, topics: {} };
    t[subject].units[u].count += n;
    t[subject].units[u].topics[tp] = (t[subject].units[u].topics[tp] ?? 0) + n;
  };
  cats.forEach((c) => add(c.subject, c.unit, c.topic, 0));
  rows.forEach((r) => add(r.subject, r.unit, r.topic, 1));
  return t;
}
