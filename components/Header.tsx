"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/ranking", label: "랭킹" },
  { href: "/suggest", label: "문제 제안" },
  { href: "/me", label: "내 기록" },
];

export default function Header() {
  const path = usePathname();
  return (
    <header className="top">
      <Link href="/" className="brand">
        <span className="brand-name">내신랩</span>
        <span className="brand-sub">서연중 3학년 · 2학기</span>
      </Link>
      <nav className="nav" aria-label="메뉴">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
