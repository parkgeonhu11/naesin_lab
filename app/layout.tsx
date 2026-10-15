import type { Metadata, Viewport } from "next";
import Shell from "@/components/Shell";
import { MeProvider } from "@/lib/useMe";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "내신랩", template: "%s · 내신랩" },
  description: "시험 범위 문제 풀고 친구들이랑 랭킹 대결 · 서연중 3학년 2학기",
  openGraph: { title: "내신랩", description: "시험 범위 문제 풀고 친구들이랑 랭킹 대결", type: "website" },
  applicationName: "내신랩",
  icons: { icon: [{ url: "/icons/favicon-32.png", sizes: "32x32" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "내신랩", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f1d44" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 저장해 둔 밝은/어두운 화면 설정을 그리기 전에 적용 (깜빡임 방지) */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("nl-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body>
        <MeProvider>
          <Shell>{children}</Shell>
        </MeProvider>
      </body>
    </html>
  );
}
