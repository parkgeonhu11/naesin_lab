"use client";
import { useCallback, useEffect, useState } from "react";
import QuestionForm from "@/components/QuestionForm";
import { DiffGuide } from "@/components/Badges";
import { subjectName } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Mine = { id: string; subject: string; body: string; status: string };
const STATUS: Record<string, string> = { pending: "검토 중", published: "공개됨 (+5점)", rejected: "반려됨" };

export default function SuggestPage() {
  const { user, error } = useMe();
  const [mine, setMine] = useState<Mine[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await sb().from("questions").select("id,subject,body,status").eq("author", user.id).order("created_at", { ascending: false });
    setMine((data as Mine[]) ?? []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      <div className="page-title"><h1>문제 제안</h1></div>
      <div className="notice">
        <p className="small" style={{ margin: 0 }}>
          관리자가 확인하고 승인하면 모두가 풀 수 있게 공개되고, 승인된 문제마다 <b>+5점</b>을 받아 (최대 20문제).
          기초부터 최상위까지 모든 난이도를 제안할 수 있어. 어려움·최상위는 풀이 과정을 해설에 꼭 써 줘.
          관리자가 아래 기준에 맞춰 난이도를 조정할 수 있어. 학교 기출문제나 문제집 문제를 그대로 옮기면 저작권 위반이라 반려돼. 직접 만든 문제만 올려 줘.
        </p>
        <DiffGuide open />
      </div>
      <QuestionForm
        maxDifficulty={5}
        explainFrom={4}
        submitLabel="제안하기"
        onSubmit={async (q) => {
          const { error } = await sb().rpc("suggest_question", {
            p_subject: q.subject, p_unit: q.unit, p_topic: q.topic, p_qtype: q.qtype, p_difficulty: q.difficulty, p_body: q.body,
            p_choices: q.choices, p_answer: q.answer, p_answer_text: q.answerText, p_explanation: q.explanation,
          });
          if (error) throw error;
          await load();
          return "제안했어! 관리자가 승인하면 공개돼.";
        }}
      />
      <section className="panel">
        <div className="panel-head"><h2>내가 제안한 문제</h2></div>
        {mine.length === 0 ? (
          <p className="panel-body muted small" style={{ margin: 0 }}>아직 없어.</p>
        ) : (
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>과목</th><th>문제</th><th>상태</th></tr></thead>
            <tbody>
              {mine.map((m) => (
                <tr key={m.id}><td>{subjectName(m.subject)}</td><td>{m.body.slice(0, 40)}</td><td>{STATUS[m.status]}</td></tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
