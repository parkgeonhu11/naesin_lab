"use client";
import { useCallback, useEffect, useState } from "react";
import type { ProblemRow, Progress } from "./data";
import { isConfigured, sb } from "./supabase";
import { useMe } from "./useMe";

/** 문제 목록(통계 포함)과 내 풀이 상태를 함께 불러온다. 여러 화면에서 같이 쓴다. */
export function useProblems() {
  const { user } = useMe();
  const [rows, setRows] = useState<ProblemRow[] | null>(null);
  const [prog, setProg] = useState<Record<string, Progress>>({});

  const reload = useCallback(async () => {
    if (!isConfigured) return;
    const [{ data: list }, mine] = await Promise.all([
      sb().rpc("problem_list"),
      user ? sb().rpc("my_progress") : Promise.resolve({ data: [] }),
    ]);
    setRows((list as ProblemRow[]) ?? []);
    const m: Record<string, Progress> = {};
    ((mine.data as Progress[]) ?? []).forEach((p) => (m[p.question_id] = p));
    setProg(m);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, prog, reload };
}

/** 과목 → 대단원 → 세부 유형 트리 (문제 수 포함) */
export type Tree = Record<string, { count: number; units: Record<string, { count: number; topics: Record<string, number> }> }>;
export function buildTree(rows: ProblemRow[]): Tree {
  const t: Tree = {};
  rows.forEach((r) => {
    const u = r.unit || "기타";
    const tp = r.topic || "기타";
    t[r.subject] ??= { count: 0, units: {} };
    t[r.subject].count++;
    t[r.subject].units[u] ??= { count: 0, topics: {} };
    t[r.subject].units[u].count++;
    t[r.subject].units[u].topics[tp] = (t[r.subject].units[u].topics[tp] ?? 0) + 1;
  });
  return t;
}
