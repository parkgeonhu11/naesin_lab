"use client";
import { useEffect, useState } from "react";
import { levelOf } from "@/lib/data";
import { isConfigured, sb } from "@/lib/supabase";

/**
 * 아바타 테두리 (꾸미기)
 * - 전체 누적 랭킹 1·2·3위: 왕관 골드 / 프로스트 실버 / 인페르노 브론즈
 * - 그 밖에 레벨 5 이상: 네온(Lv.5~9) / 오로라(Lv.10~14) / 코스믹(Lv.15~)
 * 순위 테두리가 레벨 테두리보다 먼저야.
 */
export type FrameKey = "gold" | "silver" | "bronze" | "neon" | "aurora" | "cosmic";
export const FRAME_NAME: Record<FrameKey, string> = {
  gold: "왕관 골드",
  silver: "프로스트 실버",
  bronze: "인페르노 브론즈",
  neon: "네온 링",
  aurora: "오로라 웨이브",
  cosmic: "코스믹 스타",
};

export function frameOf(rank?: number | null, points?: number | null): FrameKey | null {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  const lv = levelOf(points ?? 0).lv;
  if (lv >= 15) return "cosmic";
  if (lv >= 10) return "aurora";
  if (lv >= 5) return "neon";
  return null;
}

// 전체 누적 랭킹을 한 번만 불러와서 여러 화면이 같이 쓴다 (1분마다 새로)
type Entry = { rank: number; points: number };
let cache: { at: number; byId: Map<string, Entry>; byNick: Map<string, Entry> } | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function refresh() {
  if (!isConfigured || inflight) return;
  inflight = (async () => {
    const { data } = await sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 500 });
    const byId = new Map<string, Entry>(), byNick = new Map<string, Entry>();
    ((data as { user_id: string; nickname: string; rank: number; points: number }[]) ?? []).forEach((r) => {
      const e = { rank: r.rank, points: r.points };
      byId.set(r.user_id, e);
      byNick.set(r.nickname, e);
    });
    cache = { at: Date.now(), byId, byNick };
    inflight = null;
    listeners.forEach((f) => f());
  })();
}

export function useFrames() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    listeners.add(f);
    if (!cache || Date.now() - cache.at > 60000) refresh();
    return () => {
      listeners.delete(f);
    };
  }, []);
  return (userId?: string | null, nickname?: string | null): FrameKey | null => {
    const e = (userId && cache?.byId.get(userId)) || (nickname && cache?.byNick.get(nickname)) || null;
    return e ? frameOf(e.rank, e.points) : null;
  };
}

function Avatar({ name, className = "" }: { name?: string | null; className?: string }) {
  return <span className={`avatar ${className}`} aria-hidden="true">{(name ?? "?").trim().slice(0, 1) || "?"}</span>;
}

/** 테두리 + 아바타. frame이 없으면 그냥 아바타 */
export function FramedAvatar({ name, frame, className = "" }: { name?: string | null; frame: FrameKey | null; className?: string }) {
  if (!frame) return <Avatar name={name} className={className} />;
  return (
    <span className={`fr fr-${frame}`} title={`${FRAME_NAME[frame]} 테두리`}>
      {frame === "gold" && (
        <svg className="fr-crown" viewBox="0 0 24 16" aria-hidden="true">
          <path d="M2 14 L1 4 L7 8 L12 1 L17 8 L23 4 L22 14 Z" />
          <circle cx="12" cy="9.5" r="1.8" className="gem" />
        </svg>
      )}
      {(frame === "silver" || frame === "cosmic" || frame === "gold") && <span className="fr-spark" aria-hidden="true" />}
      <Avatar name={name} className={className} />
    </span>
  );
}

/** 이름 옆에 붙이는 작은 테두리 이름표 */
export function FrameChip({ frame }: { frame: FrameKey | null }) {
  if (!frame) return null;
  return <span className={`fr-chip fr-chip-${frame}`}>{FRAME_NAME[frame]}</span>;
}
