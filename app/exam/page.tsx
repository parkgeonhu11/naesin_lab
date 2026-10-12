import { Suspense } from "react";
import Exam from "./Exam";

export const metadata = { title: "시험지" };

export default function ExamPage() {
  return (
    <Suspense fallback={<p className="muted">불러오는 중…</p>}>
      <Exam />
    </Suspense>
  );
}
