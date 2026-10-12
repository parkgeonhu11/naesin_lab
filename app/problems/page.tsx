import { Suspense } from "react";
import ProblemList from "./ProblemList";

export const metadata = { title: "문제" };

export default function ProblemsPage() {
  return (
    <Suspense fallback={<p className="muted">불러오는 중…</p>}>
      <ProblemList />
    </Suspense>
  );
}
