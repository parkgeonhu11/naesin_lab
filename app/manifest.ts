import type { MetadataRoute } from "next";

/** 홈 화면에 설치했을 때 앱처럼 보이게 하는 설정 (PWA) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "내신랩",
    short_name: "내신랩",
    description: "시험 범위 문제 풀고 친구들이랑 랭킹 대결 · 서연중 3학년 2학기",
    lang: "ko",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    background_color: "#0f1d44",
    theme_color: "#0f1d44",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "문제 풀기", url: "/problems", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "랭킹", url: "/ranking", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "질문방", url: "/qna", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
