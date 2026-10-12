"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/useMe";

const NAV = [
  { href: "/problems", label: "문제" },
  { href: "/exam", label: "시험지" },
  { href: "/review", label: "오답 노트" },
  { href: "/status", label: "채점 현황" },
  { href: "/ranking", label: "랭킹" },
  { href: "/suggest", label: "문제 제안" },
];

export default function Header() {
  const path = usePathname();
  const { nickname, points, rank } = useMe();
  const active = (href: string) => path === href || path.startsWith(href + "/") || (href === "/problems" && path.startsWith("/problem/"));
  return (
    <header className="gnb">
      <div className="container gnb-in">
        <Link href="/" className="logo">
          내신<b>랩</b>
        </Link>
        <nav className="gnb-nav" aria-label="메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/me" className="gnb-me" aria-current={active("/me") ? "page" : undefined}>
          <span className="gnb-nick">{nickname ?? "닉네임 정하기"}</span>
          <span className="gnb-pts">
            {points}점{rank ? ` · ${rank}위` : ""}
          </span>
        </Link>
      </div>
    </header>
  );
}
