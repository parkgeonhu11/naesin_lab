"use client";
import { FramedAvatar, frameOf } from "@/components/Framed";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useQnaUnread } from "@/components/Qna";
import { BanScreen, WarningModal } from "@/components/FairPlay";
import LoginGate from "@/components/LoginGate";
import NicknameCard, { GoogleButton } from "@/components/NicknameCard";
import { levelOf } from "@/lib/data";
import { useMe } from "@/lib/useMe";

const NAV = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/problems", label: "문제", icon: "book" },
  { href: "/exam", label: "시험지", icon: "paper" },
  { href: "/review", label: "오답 노트", icon: "note" },
  { href: "/qna", label: "질문방", icon: "chat" },
  { href: "/ranking", label: "랭킹", icon: "trophy" },
  { href: "/status", label: "채점 현황", icon: "pulse" },
  { href: "/me", label: "성적 분석", icon: "chart" },
  { href: "/suggest", label: "문제 제안", icon: "idea" },
];
/** 휴대폰 아래 탭에 보이는 5개 */
const TABS = ["/", "/problems", "/exam", "/review", "/ranking"];

type Theme = "light" | "dark";

export function Avatar({ name, className = "" }: { name?: string | null; className?: string }) {
  return <span className={`avatar ${className}`} aria-hidden="true">{(name ?? "?").trim().slice(0, 1) || "?"}</span>;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { nickname, points, rank, ready, user, mustRename, isAnon, notice, saveNickname, authChecked, needLogin, googleOn, banned } = useMe();
  const qnaNew = useQnaUnread(!!user && authChecked && !needLogin);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = document.documentElement.dataset.theme as Theme | undefined;
    setTheme(t ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }, []);
  useEffect(() => setOpen(false), [path]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("nl-theme", next); } catch {}
  };

  const active = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(href + "/") || (href === "/problems" && path.startsWith("/problem/"));
  const score = `${points}점${rank ? ` · ${rank}위` : ""}`;
  const lv = levelOf(points).lv;

  const side = (
    <>
      <Link href="/" className="brand" aria-label="내신랩 홈">
        <span className="brand-mark"><Icon name="logo" /></span>
        <span><b>내신랩</b><small>서연중 3학년 2학기</small></span>
      </Link>
      <nav className="side-nav" aria-label="메뉴">
        {NAV.map((n, i) => (
          <span key={n.href} style={{ display: "contents" }}>
            {i === 6 && <span className="side-sep" />}
            <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}>
              <Icon name={n.icon} />
              {n.label}
              {n.href === "/qna" && qnaNew > 0 && <span className="nav-badge" aria-label={`새 답변 ${qnaNew}개`}>{qnaNew}</span>}
            </Link>
          </span>
        ))}
      </nav>
      <div className="side-foot">
        {ready && user && isAnon && googleOn && <GoogleButton className="side-google" />}
        <button type="button" className="theme-btn" onClick={toggleTheme}>
          <Icon name={theme === "dark" ? "sun" : "moon"} />
          {theme === "dark" ? "밝은 화면" : "어두운 화면"}
        </button>
        <Link href="/me" className="me-card">
          <FramedAvatar name={nickname} frame={frameOf(rank, points)} />
          <span><b>{nickname ?? "별명 정하기"} <span className="lv-chip">Lv.{lv}</span></b><small>{isAnon ? `${score} · 임시 계정` : score}</small></span>
        </Link>
      </div>
    </>
  );

  // 로그인 확인 중: 잠깐 로고만 / Google 로그인 필요: 로그인 화면 (관리자 페이지는 따로 로그인)
  if (path !== "/admin" && path !== "/privacy" && path !== "/terms") {
    if (!authChecked) {
      return (
        <div className="gate gate-wait" aria-busy="true">
          <span className="brand-mark"><Icon name="logo" /></span>
        </div>
      );
    }
    if (needLogin) return <LoginGate />;
    if (banned) return <BanScreen />;
  }

  return (
    <div className={`app ${path.startsWith("/problem/") ? "solving" : ""}`}>
      <aside className="side">{side}</aside>
      <div className="main">
        <header className="topbar">
          <Link href="/" className="brand" aria-label="내신랩 홈">
            <span className="brand-mark"><Icon name="logo" /></span>
            <b>내신랩</b>
          </Link>
          <Link href="/me" className="top-me">
            <FramedAvatar name={nickname} frame={frameOf(rank, points)} />
            {score}
          </Link>
          <button type="button" className="menu-btn" aria-label="전체 메뉴" onClick={() => setOpen(true)}>
            <Icon name="menu" size={24} />
            {qnaNew > 0 && <span className="menu-dot" aria-label="질문방에 새 답변" />}
          </button>
        </header>

        <main className="content">
          {notice && <div className="notice warn">{notice}</div>}
          <WarningModal />
          {ready && user && path !== "/admin" && (!nickname || mustRename) && (
            <NicknameCard
              current={nickname}
              onSave={saveNickname}
              firstTime={!nickname}
              title={mustRename ? "지금 별명은 쓸 수 없어서 바꿔야 해. 새 별명을 정해 줘" : "랭킹에 쓸 별명을 정해 줘"}
            />
          )}
          {children}
        </main>
        <footer className="site-foot">
          <span>내신랩 · 서연중 3학년 2학기 시험 대비</span>
          <span>문제는 직접 만든 것만 올려 주세요. 학교 기출문제의 저작권은 학교와 출제 선생님께 있어요. · <a className="link" href="/terms">이용약관</a> · <a className="link" href="/privacy">개인정보처리방침</a></span>
        </footer>

        <nav className="tabbar" aria-label="빠른 메뉴">
          {TABS.map((h) => {
            const n = NAV.find((x) => x.href === h)!;
            return (
              <Link key={h} href={h} aria-current={active(h) ? "page" : undefined}>
                <Icon name={n.icon} />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {open && (
        <>
          <div className="drawer-bg" onClick={() => setOpen(false)} />
          <aside className="side drawer" aria-label="전체 메뉴">
            <button type="button" className="close" aria-label="닫기" onClick={() => setOpen(false)}><Icon name="x" /></button>
            {side}
          </aside>
        </>
      )}
    </div>
  );
}
