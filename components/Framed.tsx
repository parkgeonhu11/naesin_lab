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
let cache: { at: number; byId: Map<string, Entry>; byNick: Map<string, Entry>; adminIds: Set<string>; adminNicks: Set<string> } | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function refresh() {
  if (!isConfigured || inflight) return;
  inflight = (async () => {
    const [{ data }, { data: adm }] = await Promise.all([
      sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 500 }),
      sb().rpc("admin_people"),
    ]);
    const adminIds = new Set<string>(), adminNicks = new Set<string>();
    ((adm as { user_id: string; nickname: string | null }[]) ?? []).forEach((r) => {
      adminIds.add(r.user_id);
      if (r.nickname) adminNicks.add(r.nickname);
    });
    const byId = new Map<string, Entry>(), byNick = new Map<string, Entry>();
    ((data as { user_id: string; nickname: string; rank: number; points: number }[]) ?? []).forEach((r) => {
      const e = { rank: r.rank, points: r.points };
      byId.set(r.user_id, e);
      byNick.set(r.nickname, e);
    });
    cache = { at: Date.now(), byId, byNick, adminIds, adminNicks };
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

// 불꽃 하나 (아래가 뿌리, 위가 끝). 원 둘레에 돌려 가며 붙인다
const FLAME = "M0,0 C-7,-5 -7,-13 -2,-20 C-1,-14 2,-13 1,-24 C7,-17 9,-9 6,-4 C5,-1 3,0 0,0 Z";

function FlameRing({ tone }: { tone: "gold" | "fire" }) {
  const n = 12;
  const g = tone === "gold" ? ["#fff7c2", "#ffd23f", "#ff9d00"] : ["#ffe08a", "#ff7a1a", "#d61f00"];
  const id = `frf-${tone}`;
  return (
    <svg className="fr-flames" viewBox="-50 -50 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={g[2]} />
          <stop offset=".55" stopColor={g[1]} />
          <stop offset="1" stopColor={g[0]} />
        </linearGradient>
      </defs>
      {Array.from({ length: n }, (_, k) => (
        <g key={k} transform={`rotate(${(360 / n) * k}) translate(0 -26) scale(${k % 2 ? 0.8 : 1.05})`}>
          <path d={FLAME} fill={`url(#${id})`} className="fl" style={{ animationDelay: `${(k % 4) * -0.23}s` }} />
        </g>
      ))}
    </svg>
  );
}

function IceWings() {
  // 오른쪽 날개를 그리고 왼쪽은 뒤집어서 쓴다
  const wing = "M30,-2 C40,-30 70,-46 96,-44 C88,-34 82,-28 70,-22 C84,-22 92,-16 97,-8 C84,-6 74,-4 64,-2 C74,2 80,8 84,16 C70,14 58,10 48,8 C54,14 56,20 56,26 C46,20 38,12 30,6 Z";
  return (
    <svg className="fr-wings" viewBox="-100 -70 200 130" aria-hidden="true">
      <defs>
        <linearGradient id="frw" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2f9ff" />
          <stop offset=".5" stopColor="#8cc6ff" />
          <stop offset="1" stopColor="#3c72d6" />
        </linearGradient>
      </defs>
      <ellipse className="halo" cx="0" cy="-48" rx="22" ry="6" />
      <g className="wl"><path d={wing} transform="scale(-1 1)" fill="url(#frw)" /></g>
      <g className="wr"><path d={wing} fill="url(#frw)" /></g>
    </svg>
  );
}

/** 테두리 + 아바타. frame이 없으면 그냥 아바타 */
export function FramedAvatar({ name, frame, className = "" }: { name?: string | null; frame: FrameKey | null; className?: string }) {
  if (!frame) return <Avatar name={name} className={className} />;
  const top = frame === "gold" || frame === "silver" || frame === "bronze";
  return (
    <span className={`fr fr-${frame} ${top ? "fr-top" : ""}`} title={`${FRAME_NAME[frame]} 테두리`}>
      {frame === "gold" && <span className="fr-rays" aria-hidden="true" />}
      {frame === "gold" && <FlameRing tone="gold" />}
      {frame === "bronze" && <FlameRing tone="fire" />}
      {frame === "silver" && <IceWings />}
      {frame === "gold" && (
        <svg className="fr-crown" viewBox="0 0 24 16" aria-hidden="true">
          <path d="M2 14 L1 4 L7 8 L12 1 L17 8 L23 4 L22 14 Z" />
          <circle cx="12" cy="9.5" r="1.8" className="gem" />
          <circle cx="1" cy="4" r="1.1" className="tip" />
          <circle cx="12" cy="1" r="1.1" className="tip" />
          <circle cx="23" cy="4" r="1.1" className="tip" />
        </svg>
      )}
      {top && <span className="fr-embers" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>}
      {(frame === "silver" || frame === "cosmic" || frame === "gold") && <span className="fr-spark" aria-hidden="true" />}
      <Avatar name={name} className={className} />
    </span>
  );
}

/** 관리자인지 (user_id나 별명으로) */
export function useAdmins() {
  useFrames(); // 같은 캐시를 불러오고 갱신되면 다시 그린다
  return (userId?: string | null, nickname?: string | null) =>
    !!cache && ((!!userId && cache.adminIds.has(userId)) || (!!nickname && cache.adminNicks.has(nickname)));
}

/** 이름 옆 'ADMIN' 배지 */
export function AdminChip({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return <span className="admin-chip" title="내신랩 관리자">ADMIN</span>;
}

/** 이름 옆에 붙이는 작은 테두리 이름표 */
export function FrameChip({ frame }: { frame: FrameKey | null }) {
  if (!frame) return null;
  return <span className={`fr-chip fr-chip-${frame}`}>{FRAME_NAME[frame]}</span>;
}
