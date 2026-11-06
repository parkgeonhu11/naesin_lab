import "katex/dist/katex.min.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "수학 학습 · 내신랩" };

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <div className="learn">{children}</div>;
}
