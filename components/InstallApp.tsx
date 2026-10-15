"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { detectInApp } from "@/lib/inapp";

/**
 * 홈 화면 앱(PWA) 설치
 * - 안드로이드·컴퓨터 크롬: 브라우저가 주는 설치 창을 버튼으로 띄움
 * - 아이폰·아이패드: 설치 창이 없어서 '공유 → 홈 화면에 추가' 안내를 보여 줌
 * - 이미 앱으로 열었으면 아무것도 안 보여 줌
 */
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: BIP | null = null;
let installed = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIP;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIos = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1));

type Mode = "hidden" | "prompt" | "ios" | "inapp" | "manual";

function usePwa() {
  const [, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    subs.add(f);
    setReady(true);
    // 서비스 워커 등록 (인터넷이 끊겼을 때 안내 화면, 빠른 로딩)
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => { subs.delete(f); };
  }, []);
  let mode: Mode = "hidden";
  if (ready && !installed && !isStandalone()) {
    if (detectInApp()) mode = "inapp";
    else if (deferred) mode = "prompt";
    else if (isIos()) mode = "ios";
    else mode = "manual";
  }
  const install = async (): Promise<boolean> => {
    if (!deferred) return false;
    const d = deferred;
    await d.prompt();
    const { outcome } = await d.userChoice;
    deferred = null;
    if (outcome === "accepted") installed = true;
    emit();
    return true;
  };
  return { mode, install };
}

/** 설치 방법 안내 창 */
function Guide({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const steps: { icon: string; text: React.ReactNode }[] =
    mode === "ios"
      ? [
          { icon: "share", text: <>화면 아래(아이패드는 위)의 <b>공유 버튼</b>을 눌러.</> },
          { icon: "plusbox", text: <>목록을 조금 내려서 <b>홈 화면에 추가</b>를 눌러.</> },
          { icon: "logo", text: <>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 내신랩 앱이 생겨.</> },
        ]
      : mode === "inapp"
        ? [
            { icon: "dots", text: <>카카오톡·인스타 같은 앱 안에서는 설치가 안 돼. 오른쪽 위(또는 아래) <b>⋯ 메뉴</b>를 눌러.</> },
            { icon: "share", text: <><b>다른 브라우저로 열기</b>(크롬·사파리)를 골라.</> },
            { icon: "install", text: <>열린 화면에서 다시 <b>앱으로 설치</b>를 눌러 줘.</> },
          ]
        : [
            { icon: "dots", text: <>브라우저 오른쪽 위(또는 아래)의 <b>⋮ 메뉴</b>를 눌러.</> },
            { icon: "install", text: <><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 골라.</> },
            { icon: "logo", text: <>홈 화면에 생긴 내신랩 아이콘으로 열면 앱처럼 쓸 수 있어.</> },
          ];
  return (
    <div className="install-bg" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={onClose}>
      <div className="install-card" onClick={(e) => e.stopPropagation()}>
        <div className="install-top">
          <img src="/icons/icon-192.png" alt="" width={52} height={52} />
          <div>
            <b id="install-title">내신랩을 앱으로 설치하기</b>
            <small>{mode === "ios" ? "사파리나 크롬에서 3단계면 끝나" : "홈 화면에서 바로 열 수 있어"}</small>
          </div>
        </div>
        <ol className="install-steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="install-num">{i + 1}</span>
              <span className="install-ic"><Icon name={s.icon} /></span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
        <p className="small muted" style={{ margin: 0 }}>앱으로 열어도 점수·랭킹·로그인은 지금이랑 그대로 이어져.</p>
        <button type="button" className="btn" onClick={onClose}>알겠어</button>
      </div>
    </div>
  );
}

/** 사이드바(메뉴)의 '앱으로 설치' 버튼 */
export function InstallButton() {
  const { mode, install } = usePwa();
  const [guide, setGuide] = useState(false);
  if (mode === "hidden") return null;
  return (
    <>
      <button
        type="button"
        className="theme-btn install-btn"
        onClick={async () => { if (!(await install())) setGuide(true); }}
      >
        <Icon name="install" />
        앱으로 설치
      </button>
      {guide && <Guide mode={mode} onClose={() => setGuide(false)} />}
    </>
  );
}

/** 휴대폰 홈 화면 위쪽 안내 띠 (닫으면 2주 동안 안 보임) */
export function InstallBanner() {
  const { mode, install } = usePwa();
  const [guide, setGuide] = useState(false);
  const [hide, setHide] = useState(true);
  useEffect(() => {
    try {
      const t = Number(localStorage.getItem("nl-install-hide") ?? 0);
      setHide(Date.now() - t < 14 * 86400e3);
    } catch { setHide(false); }
  }, []);
  if (mode === "hidden" || hide) return null;
  const close = () => {
    setHide(true);
    try { localStorage.setItem("nl-install-hide", String(Date.now())); } catch {}
  };
  return (
    <>
      <div className="install-banner">
        <img src="/icons/icon-192.png" alt="" width={40} height={40} />
        <div className="grow">
          <b>내신랩을 앱으로 써 봐</b>
          <small>홈 화면에서 바로 열리고, 주소창 없이 넓게 보여.</small>
        </div>
        <button type="button" className="btn small-btn" onClick={async () => { if (!(await install())) setGuide(true); }}>설치</button>
        <button type="button" className="install-x" aria-label="닫기" onClick={close}>×</button>
      </div>
      {guide && <Guide mode={mode} onClose={() => setGuide(false)} />}
    </>
  );
}
