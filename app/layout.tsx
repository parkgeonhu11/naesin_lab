import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "내신랩 · 중3 내신 랭크전",
  description: "시험 범위 문제 풀고 친구들이랑 실시간 랭킹 대결",
  openGraph: {
    title: "내신랩 · 중3 내신 랭크전",
    description: "시험 범위 문제 풀고 친구들이랑 실시간 랭킹 대결",
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <div className="wrap">
          <Header />
          <main>{children}</main>
          <footer className="foot">
            <b>내신랩</b> · 문제와 해설은 직접 만든 것만 올려 주세요. 학교 기출문제는 저작권이 학교와 출제 선생님께 있어요.
          </footer>
        </div>
      </body>
    </html>
  );
}
