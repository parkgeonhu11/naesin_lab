"use client";
import { useEffect, useRef, useState } from "react";
import { isConfigured, sb } from "@/lib/supabase";

/**
 * 광고 표시 영역.
 * - 공급 방식(직접 등록 배너 / 광고 네트워크)은 나중에 정할 수 있게, 화면에는 이 칸 하나만 둔다.
 * - 관리자가 광고를 켜고, 이 위치에 게시 중인 광고가 있을 때만 보인다. 없으면 빈칸도 남기지 않는다.
 * - 사용자 정보(학교·학년·성적·오답)는 광고를 고르는 데 쓰지 않는다. 위치만 보고 고른다.
 * - 문제 풀이 화면, 답 제출·다음 문제 버튼 옆에는 두지 않는다.
 */
export type AdPlacement = "home" | "list" | "ranking";
type Ad = { id: number; title: string; body: string; image_url: string; link_url: string; advertiser: string };

const cache: Partial<Record<AdPlacement, Promise<Ad | null>>> = {};
const load = (p: AdPlacement) =>
  (cache[p] ??= Promise.resolve(sb().rpc("ads_for", { p_placement: p })).then(
    ({ data }) => ((data as Ad[] | null) ?? [])[0] ?? null,
    () => null,
  ));
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

export default function AdSlot({ placement }: { placement: AdPlacement }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [reported, setReported] = useState(false);
  const box = useRef<HTMLElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    load(placement).then((a) => alive && setAd(a));
    return () => { alive = false; };
  }, [placement]);

  // 화면에 절반 이상 보였을 때 한 번만 노출로 센다
  useEffect(() => {
    const el = box.current;
    if (!ad || !el || seen.current) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !seen.current) {
        seen.current = true;
        sb().rpc("ad_hit", { p_ad: ad.id, p_kind: "view" }).then(() => {}, () => {});
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [ad]);

  if (!ad || reported) {
    return reported ? <p className="ad-thanks small faint">광고를 신고했어. 관리자가 확인할게.</p> : null;
  }
  const to = host(ad.link_url);
  return (
    <aside ref={box} className="ad-slot" aria-label="광고">
      <span className="ad-label">광고</span>
      <a
        className="ad-link"
        href={ad.link_url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={() => { sb().rpc("ad_hit", { p_ad: ad.id, p_kind: "click" }).then(() => {}, () => {}); }}
      >
        {ad.image_url && <img src={ad.image_url} alt="" className="ad-img" loading="lazy" />}
        <span className="ad-text">
          <b>{ad.title}</b>
          {ad.body && <small>{ad.body}</small>}
          <small className="ad-to">{ad.advertiser ? `${ad.advertiser} · ` : ""}{to} 로 이동</small>
        </span>
      </a>
      <button
        type="button"
        className="ad-report"
        onClick={() => { sb().rpc("ad_hit", { p_ad: ad.id, p_kind: "report" }).then(() => {}, () => {}); setReported(true); }}
      >
        부적절한 광고 신고
      </button>
    </aside>
  );
}
