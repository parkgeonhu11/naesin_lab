"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
let cache: {
  at: number; byId: Map<string, Entry>; byNick: Map<string, Entry>; adminIds: Set<string>; adminNicks: Set<string>;
  /** 과목 마스터 칭호 (user_id / 별명 → 과목 코드들, 'all'이면 전과목) */
  titlesById: Map<string, string[]>; titlesByNick: Map<string, string[]>;
} | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** 점수·칭호가 바뀌었을 때 바로 다시 불러오기 (예: 문제를 맞힌 뒤) */
export function refreshFrames() {
  refresh();
}

function refresh() {
  if (!isConfigured || inflight) return;
  inflight = (async () => {
    const [{ data }, { data: adm }, { data: tit }] = await Promise.all([
      sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 500 }),
      sb().rpc("admin_people"),
      sb().rpc("subject_masters"),
    ]);
    const titlesById = new Map<string, string[]>(), titlesByNick = new Map<string, string[]>();
    ((tit as { user_id: string; nickname: string | null; subject: string }[]) ?? []).forEach((r) => {
      titlesById.set(r.user_id, [...(titlesById.get(r.user_id) ?? []), r.subject]);
      if (r.nickname) titlesByNick.set(r.nickname, [...(titlesByNick.get(r.nickname) ?? []), r.subject]);
    });
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
    cache = { at: Date.now(), byId, byNick, adminIds, adminNicks, titlesById, titlesByNick };
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

/** 과목 마스터 칭호 목록 (user_id나 별명으로). 'all'이 있으면 전과목 마스터 */
export function useTitles() {
  useFrames();
  return (userId?: string | null, nickname?: string | null): string[] =>
    (userId && cache?.titlesById.get(userId)) || (nickname && cache?.titlesByNick.get(nickname)) || [];
}

const SUBJ_NAME: Record<string, string> = { ko: "국어", ma: "수학", sc: "과학", so: "사회", en: "영어", hi: "역사", hm: "한문" };
export const titleName = (s: string) => (s === "all" ? "전과목 마스터" : s === "acc" ? "정답률왕" : `${SUBJ_NAME[s] ?? s} 마스터`);
const titleDesc = (s: string) =>
  s === "acc" ? "정답률왕: 제출 정답률이 가장 높은 학생 (제출 50번 이상, 관리자 제외)" : `${titleName(s)}: 지금 있는 ${s === "all" ? "모든" : SUBJ_NAME[s] ?? ""} 문제를 전부 맞혔어`;

function Crown() {
  return (
    <svg viewBox="0 0 12 10" width="10" height="9" aria-hidden="true">
      <path d="M1 8.6h10L10.2 2.8 7.6 5 6 1.2 4.4 5 1.8 2.8z" fill="currentColor" />
    </svg>
  );
}

/** 과목 마스터 칭호 하나. 눌러도(폰) 설명이 화면 아래에 잠깐 떠 */
export function TitleChip({ subject }: { subject: string }) {
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => setTip(false), 3500);
    return () => clearTimeout(t);
  }, [tip]);
  const show = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTip(true);
  };
  return (
    <>
      <span
        className={`title-chip${subject === "all" ? " title-all" : subject === "acc" ? " title-acc" : ""}`}
        data-s={subject}
        title={titleDesc(subject)}
        role="button"
        tabIndex={0}
        onClick={show}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") show(e); }}
      >
        <Crown />
        {titleName(subject)}
      </span>
      {tip && typeof document !== "undefined" && createPortal(
        <div className="title-tip" role="status" onClick={() => setTip(false)}>
          <span className={`title-chip${subject === "all" ? " title-all" : subject === "acc" ? " title-acc" : ""}`} data-s={subject}><Crown />{titleName(subject)}</span>
          <span>{titleDesc(subject).replace(/^[^:]+:\s*/, "")}</span>
        </div>,
        document.body,
      )}
    </>
  );
}

/** 칭호 여러 개: 전과목이면 하나만, 많으면 2개 + 나머지 개수 */
export function TitleChips({ titles, max = 2 }: { titles: string[]; max?: number }) {
  if (!titles.length) return null;
  const acc = titles.includes("acc");
  if (titles.includes("all")) return <>{acc && <TitleChip subject="acc" />}<TitleChip subject="all" /></>;
  const order = ["acc", ...Object.keys(SUBJ_NAME)];
  const t = [...titles].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const rest = t.slice(max);
  return (
    <>
      {t.slice(0, max).map((s) => <TitleChip key={s} subject={s} />)}
      {rest.length > 0 && <span className="title-chip title-more" title={rest.map(titleName).join(", ")}>+{rest.length}</span>}
    </>
  );
}

/** 내가 새 칭호를 얻으면 축하 알림 (이 브라우저에서 처음 볼 때 한 번) */
export function TitleCelebrate({ userId }: { userId?: string | null }) {
  const titles = useTitles();
  const mine = userId ? titles(userId) : [];
  const key = [...mine].sort().join(",");
  const loaded = !!cache;
  const [fresh, setFresh] = useState<string[]>([]);
  useEffect(() => {
    if (!userId || !loaded) return;
    const k = `nl-titles-${userId}`;
    let prev: string[] = [];
    try { prev = JSON.parse(localStorage.getItem(k) ?? "[]"); } catch {}
    const now = key ? key.split(",") : [];
    try { localStorage.setItem(k, JSON.stringify(now)); } catch {}
    const got = now.filter((t) => !prev.includes(t));
    if (got.length) setFresh(got.includes("all") ? ["all"] : got);
  }, [userId, key, loaded]);
  useEffect(() => {
    if (!fresh.length) return;
    const t = setTimeout(() => setFresh([]), 9000);
    return () => clearTimeout(t);
  }, [fresh]);
  if (!fresh.length) return null;
  const all = fresh.includes("all");
  return (
    <div className="title-toast" role="status" data-s={fresh[0]}>
      <span className="title-toast-crown"><Crown /></span>
      <div className="grow">
        <b>{fresh.map(titleName).join(", ")} 칭호를 얻었어!</b>
        <small>{all ? "지금 있는 모든 과목 문제를 전부 맞혔어. 진짜 대단해" : fresh.length === 1 && fresh[0] === "acc" ? "지금 내신랩에서 정답률이 가장 높아. 이름 옆에 칭호가 붙어" : `지금 있는 ${fresh.filter((s) => s !== "acc").map((s) => SUBJ_NAME[s]).join("·")} 문제를 전부 맞혔어. 이제 이름 옆에 칭호가 붙어`}</small>
      </div>
      <button type="button" className="title-toast-x" aria-label="닫기" onClick={() => setFresh([])}>×</button>
    </div>
  );
}

/** 이름 옆 배지 묶음: ADMIN + 과목 마스터 칭호 */
export function NameBadges({ id, nick, max }: { id?: string | null; nick?: string | null; max?: number }) {
  const isAdmin = useAdmins();
  const titles = useTitles();
  return (
    <>
      <AdminChip show={isAdmin(id, nick)} />
      <TitleChips titles={titles(id, nick)} max={max} />
    </>
  );
}

/** 이름 옆에 붙이는 작은 테두리 이름표 */
export function FrameChip({ frame }: { frame: FrameKey | null }) {
  if (!frame) return null;
  return <span className={`fr-chip fr-chip-${frame}`}>{FRAME_NAME[frame]}</span>;
}
