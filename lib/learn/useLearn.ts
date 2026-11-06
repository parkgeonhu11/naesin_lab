"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import type { Stage, Unit } from "./types";

export type Review = { type_tag: string; step: number; due_at: string; source: string; fails: number };
export type LearnStatus = {
  concept: Record<string, { ok: number; n: number }>;
  basic: { ok: number; n: number };
  types: Record<string, { ok: number; n: number }>;
  practical: { ok: number; n: number };
  seen: Record<string, boolean>;
  reviews: Review[];
  mastered: number;
};
const EMPTY: LearnStatus = { concept: {}, basic: { ok: 0, n: 0 }, types: {}, practical: { ok: 0, n: 0 }, seen: {}, reviews: [], mastered: 0 };

/** 통과 조건 (기획서 3장) */
export const PASS = { conceptOk: 4, basicOk: 8, typeOk: 3, practicalRate: 0.7 };

export function summarize(u: Unit, s: LearnStatus) {
  const lessonDone = (id: string) => (s.concept[id]?.ok ?? 0) >= PASS.conceptOk;
  const conceptDone = u.lessons.filter((l) => lessonDone(l.id)).length;
  const typeDone = (tag: string) => (s.types[tag]?.ok ?? 0) >= PASS.typeOk;
  const pracTotal = u.items.filter((i) => i.stage === "practical").length;
  const passed: Record<Stage, boolean> = {
    concept: conceptDone === u.lessons.length,
    basic: s.basic.ok >= PASS.basicOk,
    type: u.types.every((t) => typeDone(t.tag)),
    practical: s.practical.ok >= Math.ceil(pracTotal * PASS.practicalRate),
  };
  const progress: Record<Stage, number> = {
    concept: conceptDone / u.lessons.length,
    basic: Math.min(1, s.basic.ok / PASS.basicOk),
    type: u.types.filter((t) => typeDone(t.tag)).length / u.types.length,
    practical: Math.min(1, s.practical.ok / Math.ceil(pracTotal * PASS.practicalRate)),
  };
  const order: Stage[] = ["concept", "basic", "type", "practical"];
  const unlocked = (st: Stage) => order.indexOf(st) === 0 || passed[order[order.indexOf(st) - 1]];
  const current = order.find((st) => !passed[st]) ?? null;
  const due = s.reviews.filter((r) => new Date(r.due_at).getTime() <= Date.now());
  const total = (progress.concept + progress.basic + progress.type + progress.practical) / 4;
  return { lessonDone, conceptDone, typeDone, passed, progress, unlocked, current, due, total, pracTotal };
}

/** 단원 진행 상황 불러오기 (게스트도 계정이 생기면 저장됨) */
export function useLearn(u: Unit | null) {
  const { user, authChecked } = useMe();
  const [status, setStatus] = useState<LearnStatus | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    if (!u) return;
    if (!user) { setStatus(EMPTY); return; }
    const { data, error } = await sb().rpc("learn_status", { p_unit: u.id });
    if (error) { setErr(error.message); setStatus(EMPTY); return; }
    setStatus({ ...EMPTY, ...(data as LearnStatus) });
  }, [u, user]);
  useEffect(() => { if (authChecked) load(); }, [authChecked, load]);
  return { status, reload: load, err };
}

export type Graded = { correct: boolean; credited: boolean; answer: number | null; answer_text: string; explanation: string; review: string | null };

export async function submitLearn(key: string, choice: number | null, text: string | null, hints: number, mode: "learn" | "review" | "practical") {
  const { data, error } = await sb().rpc("learn_submit", { p_key: key, p_choice: choice, p_text: text, p_hints: hints, p_mode: mode });
  if (error) throw error;
  return data as Graded;
}
