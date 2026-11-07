import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./welcome.css";

export const metadata: Metadata = {
  title: "내신랩 소개",
  description: "학교 시험 범위 문제를 풀고, 틀린 유형은 1일·3일·7일 뒤에 새 문제로 다시 풀어요. 하루 5문제, 10분.",
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
