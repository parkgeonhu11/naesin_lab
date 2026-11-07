"use client";
import { GrantNotice } from "@/components/AdminGrant";
import { InstallBanner, InstallButton } from "@/components/InstallApp";
import { NameBadges, FramedAvatar, frameOf, TitleCelebrate, useAdmins } from "@/components/Framed";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useQnaUnread } from "@/components/Qna";
import { BanScreen, WarningModal } from "@/components/FairPlay";
import NicknameCard from "@/components/NicknameCard";
import SchoolCard from "@/components/SchoolCard";
import Tutorial from "@/components/Tutorial";
import { levelOf } from "@/lib/data";
import { useMe } from "@/lib/useMe";
import { IS_PREVIEW } from "@/lib/supabase";

/** 큰 메뉴 4개(예비 사이트가 아니면 3개). 각 메뉴 아래 작은 메뉴가 붙는다 */
type NavItem = { href: string; label: string; icon: string; sub?: { href: string; label: string }[]; also?: string[] };
const NAV: NavItem[] = [
  { href: "/", label: "홈", icon: "home" },
  ...(IS_PREVIEW ? [{ href: "/learn", label: "공부", icon: "learn" }] : []),
  {
    href: "/problems", label: "시험 대비", icon: "paper", also: ["/problem"],
    sub: [
      { href: "/problems", label: "문제" },
      { href: "/exam", label: "시험지" },
      { href: "/mock", label: "예상 시험" },
      { href: "/review", label: "오답 노트" },
      { href: "/qna", label: "질문방" },
      { href: "/suggest", label: "문제 제안" },
    ],
  },
  { href: "/ranking", label: "랭킹", icon: "trophy", sub: [{ href: "/ranking", label: "랭킹" }, { href: "/status", label: "채점 현황" }] },
];

type Theme = "light" | "dark";

export function Avatar({ name, className = "" }: { name?: string | null; className?: string }) {
  return <span className={`avatar ${className}`} aria-hidden="true">{(name ?? "?").trim().slice(0, 1) || "?"}</span>;
}

/** 게스트 안내: 한 번 닫으면 이 브라우저에서는 다시 안 보임 */
function GuestTip({ loginHref }: { loginHref: string }) {
  const [hide, setHide] = useState(true);
  useEffect(() => {
    try { setHide(localStorage.getItem("nl-guest-tip") === "1"); } catch { setHide(false); }
  }, []);
  if (hide) return null;
  return (
    <div className="guest-tip" role="status">
      <span><b>게스트로 기록 중이야.</b> 이 브라우저에만 저장돼서 기록을 지우거나 기기를 바꾸면 못 찾아. 로그인하면 그대로 옮겨져.</span>
      <Link href={loginHref} className="btn small-btn">로그인</Link>
      <button type="button" className="close" aria-label="안내 닫기" onClick={() => { setHide(true); try { localStorage.setItem("nl-guest-tip", "1"); } catch {} }}><Icon name="x" /></button>
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdminOf = useAdmins();
  const { nickname, points, rank, ready, user, mustRename, isAnon, notice, saveNickname, authChecked, needLogin, banned, school, grade, needSchool } = useMe();
  const scopeLabel = school ? `${school.name.replace(/학교$/, "")} ${grade ?? ""}학년` : "중학생 내신 대비";
  const amAdmin = !!user && !user.is_anonymous && isAdminOf(user.id);
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

  const loginHref = `/login${path && path !== "/" ? `?next=${encodeURIComponent(path)}` : ""}`;
  const on = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  const group = NAV.find((n) => n.href !== "/" && (on(n.href) || n.sub?.some((x) => on(x.href)) || n.also?.some((a) => on(a))));
  const active = (href: string) => (href === "/" ? path === "/" : group?.href === href);
  const subNav = group?.sub && !path.startsWith("/problem/") ? group.sub : null;
  const score = `${points}점${rank ? ` · ${rank}위` : ""}`;
  const lv = levelOf(points).lv;

  const side = (
    <>
      <Link href="/" className="brand" aria-label="내신랩 홈">
        <b>내신랩</b><small>{scopeLabel}</small>
      </Link>
      <nav className="side-nav" aria-label="메뉴">
        {NAV.map((n) => (
          <div key={n.href} className="side-group">
            <Link href={n.href} className="side-main" aria-current={active(n.href) ? "page" : undefined}>
              <Icon name={n.icon} />
              <span className="lbl">{n.label}</span>
            </Link>
            {n.sub && (
              <div className="side-sub">
                {n.sub.map((x) => (
                  <Link key={x.href} href={x.href} aria-current={on(x.href) || (x.href === "/problems" && path.startsWith("/problem/")) ? "page" : undefined}>
                    {x.label}
                    {x.href === "/qna" && qnaNew > 0 && <span className="nav-badge" aria-label={`새 답변 ${qnaNew}개`}>{qnaNew}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {amAdmin && (
          <Link href="/admin/allback" className="side-admin" aria-current={path === "/admin/allback" ? "page" : undefined}>
            올백 문제 모음
          </Link>
        )}
      </nav>
      <div className="side-foot">
        {authChecked && (!user || isAnon) && <Link href={loginHref} className="btn side-google">로그인 · 회원가입</Link>}
        <InstallButton />
        <button type="button" className="theme-btn" onClick={toggleTheme}>
          <Icon name={theme === "dark" ? "sun" : "moon"} />
          {theme === "dark" ? "밝은 화면" : "어두운 화면"}
        </button>
        <Link href="/me" className="me-card">
          <FramedAvatar name={nickname} frame={frameOf(rank, points)} />
          <span><b>{nickname ?? (user ? "별명 정하기" : "게스트")} <span className="lv-chip">Lv.{lv}</span><NameBadges id={user?.id} max={1} /></b><small>{!user ? "문제를 풀면 기록이 시작돼" : isAnon ? `${score} · 게스트` : score}</small></span>
        </Link>
      </div>
    </>
  );

  // 로그인은 선택: 처음 온 사람도 바로 둘러보고 풀 수 있다. 로그인 화면은 메뉴 없이 전체 화면으로
  if (path === "/login" || path === "/welcome") return <>{children}</>;
  if (banned && path !== "/admin" && path !== "/privacy" && path !== "/terms") return <BanScreen />;

  return (
    <div className={`app ${path.startsWith("/problem/") ? "solving" : ""}`}>
      <aside className="side">{side}</aside>
      <div className="main">
        <header className="topbar">
          <Link href="/" className="brand" aria-label="내신랩 홈">
            <b>내신랩</b>
          </Link>
          {authChecked && (!user || isAnon) && <Link href={loginHref} className="top-login">로그인</Link>}
          {user && (
            <Link href="/me" className="top-me">
              <FramedAvatar name={nickname} frame={frameOf(rank, points)} />
              {points}점{rank ? <span className="top-rank"> · {rank}위</span> : null}
            </Link>
          )}
          <button type="button" className="menu-btn" aria-label="전체 메뉴" onClick={() => setOpen(true)}>
            <Icon name="menu" size={24} />
            {qnaNew > 0 && <span className="menu-dot" aria-label="질문방에 새 답변" />}
          </button>
        </header>

        <main className="content">
          {IS_PREVIEW && <div className="preview-bar" role="note"><b>예비 사이트</b> 테스트 전용 DB라 여기서 푼 기록은 실제 랭킹에 안 들어가.</div>}
          {subNav && (
            <nav className="sub-nav" aria-label={`${group!.label} 메뉴`}>
              {subNav.map((x) => (
                <Link key={x.href} href={x.href} aria-current={on(x.href) ? "page" : undefined}>
                  {x.label}
                  {x.href === "/qna" && qnaNew > 0 && <span className="nav-badge" aria-label={`새 답변 ${qnaNew}개`}>{qnaNew}</span>}
                </Link>
              ))}
            </nav>
          )}
          {notice && <div className="notice warn">{notice}</div>}
          <WarningModal />
          {path === "/" && <InstallBanner />}
          {user && isAnon && path !== "/" && path !== "/me" && <GuestTip loginHref={loginHref} />}
          {ready && user && path !== "/admin" && ((!nickname && !isAnon) || mustRename) && (
            <NicknameCard
              current={nickname}
              onSave={saveNickname}
              firstTime={!nickname}
              title={mustRename ? "지금 별명은 쓸 수 없어서 바꿔야 해. 새 별명을 정해 줘" : "랭킹에 쓸 별명을 정해 줘"}
            />
          )}
          {ready && user && !isAnon && path !== "/admin" && nickname && !mustRename && needSchool && <SchoolCard />}
          {children}
        </main>
        {ready && user && <TitleCelebrate userId={user.id} />}
        {ready && user && <GrantNotice />}
        <Tutorial />
        <footer className="site-foot">
          <span>내신랩</span>
          <span>문제는 직접 만든 것만 올려 주세요. 학교 기출문제의 저작권은 학교와 출제 선생님께 있어요.</span>
          <span><a className="link" href="/terms">이용약관</a> <a className="link" href="/privacy">개인정보처리방침</a></span>
        </footer>

        <nav className="tabbar" aria-label="메뉴" style={{ ["--n" as string]: NAV.length }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
              <Icon name={n.icon} />
              {n.label}
            </Link>
          ))}
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
