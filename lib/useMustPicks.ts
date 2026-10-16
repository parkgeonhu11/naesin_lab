"use client";
import { useEffect, useState } from "react";
import { isConfigured, sb } from "./supabase";

/** 과목별 '꼭 풀어야 할 20문제' (question_id → 순서). 한 번 불러와서 같이 쓴다. */
let cache: Map<string, { subject: string; rank: number }> | null = null;
let pending: Promise<void> | null = null;
const subs = new Set<() => void>();

function load() {
  if (pending || !isConfigured) return;
  pending = Promise.resolve(sb().from("must_picks").select("question_id,subject,rank")).then(({ data }) => {
    cache = new Map(((data as { question_id: string; subject: string; rank: number }[]) ?? []).map((r) => [r.question_id, { subject: r.subject, rank: r.rank }]));
    subs.forEach((f) => f());
  }, () => { pending = null; });
}

export function useMustPicks() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    subs.add(f);
    load();
    return () => { subs.delete(f); };
  }, []);
  return cache;
}
