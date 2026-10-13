"use client";
import { QnaBoard } from "@/components/Qna";

export default function QnaPage() {
  return (
    <>
      <div className="page-title">
        <h1>질문방</h1>
        <span className="muted small">모르는 문제는 문제 화면 아래에서 질문하고, 아는 건 친구에게 알려 주자. 질문한 사람이 가장 도움 된 답변을 채택할 수 있어.</span>
      </div>
      <QnaBoard />
    </>
  );
}
