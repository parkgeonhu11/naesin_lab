import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import { MeProvider } from "@/lib/useMe";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "내신랩", template: "%s · 내신랩" },
  description: "시험 범위 문제 풀고 친구들이랑 랭킹 대결 · 서연중 3학년 2학기",
  openGraph: { title: "내신랩", description: "시험 범위 문제 풀고 친구들이랑 랭킹 대결", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body>
        <MeProvider>
          <Header />
          <main className="container">{children}</main>
          <footer className="site-foot container">
            <span>내신랩 · 서연중 3학년 2학기 시험 대비</span>
            <span>문제는 직접 만든 것만 올려 주세요. 학교 기출문제의 저작권은 학교와 출제 선생님께 있어요.</span>
          </footer>
        </MeProvider>
      </body>
    </html>
  );
}
