"use client";
import { useCallback, useEffect, useState } from "react";
import { DiffBadge, TypeBadge } from "@/components/Badges";
import { reportKindName } from "@/components/ReportButton";
import { ago, DIFF, subjectName } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";

type Rep = { nickname: string; kind: string; detail: string; at: string };
type Item = {
  question_id: string; no: number; subject: string; unit: string; topic: string; qtype: string; difficulty: number; body: string;
  choices: string[]; answer: number | null; answer_text: string | null; explanation: string; q_status: string; reports: Rep[];
};

function ReportCard({ it, onDone }: { it: Item; onDone: () => void }) {
  const [body, setBody] = useState(it.body);
  const [choices, setChoices] = useState(it.choices.join("\n"));
  const [answer, setAnswer] = useState(it.answer ?? 0);
  const [answerText, setAnswerText] = useState(it.answer_text ?? "");
  const [explanation, setExplanation] = useState(it.explanation ?? "");
  const [difficulty, setDifficulty] = useState(it.difficulty);
  const [note, setNote] = useState("");
  const [reward, setReward] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const list = choices.split("\n").map((c) => c.trim()).filter(Boolean);
  const mc = it.qtype === "mc";

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try { setMsg(await fn()); onDone(); } catch (e) { setMsg(friendly(e)); }
    setBusy(false);
  };

  return (
    <article className="panel panel-body admin-report">
      <div className="row small muted" style={{ gap: 6 }}>
        <b className="num" style={{ color: "var(--text)" }}>{it.no}번</b>
        <span className="badge subj">{subjectName(it.subject)}</span>
        <TypeBadge type={it.qtype} /> <DiffBadge level={it.difficulty} />
        <span>{[it.unit, it.topic].filter(Boolean).join(" › ")}</span>
        {it.q_status !== "published" && <span className="badge lv4">공개 중지됨</span>}
        <a className="link push-right" href={`/problem/${it.no}`} target="_blank" rel="noreferrer">문제 화면 열기</a>
      </div>

      <ul className="report-list">
        {it.reports.map((r, i) => (
          <li key={i}>
            <b>{reportKindName(r.kind)}</b> <span className="faint small">· {r.nickname} · {ago(r.at)}</span>
            {r.detail && <div className="small">{r.detail}</div>}
          </li>
        ))}
      </ul>

      <details>
        <summary className="small" style={{ cursor: "pointer", fontWeight: 700 }}>문제 고치기 (지금 정답: {mc ? `${(it.answer ?? 0) + 1}번 ${it.choices[it.answer ?? 0] ?? ""}` : it.answer_text})</summary>
        <div className="admin-edit">
          <label className="small muted">문제<textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></label>
          {mc ? (
            <>
              <label className="small muted">보기 (한 줄에 하나)<textarea className="input" rows={Math.max(3, list.length + 1)} value={choices} onChange={(e) => setChoices(e.target.value)} /></label>
              <label className="small muted">정답
                <select className="input" value={answer} onChange={(e) => setAnswer(+e.target.value)}>
                  {list.map((c, i) => <option key={i} value={i}>{i + 1}번 · {c.slice(0, 40)}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label className="small muted">정답 (여러 개면 | 로 나누기)<input className="input" value={answerText} onChange={(e) => setAnswerText(e.target.value)} /></label>
          )}
          <label className="small muted">해설<textarea className="input" rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} /></label>
          <label className="small muted">난이도
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(+e.target.value)}>
              {DIFF.map((d) => <option key={d.level} value={d.level}>{d.label} · {d.points}점</option>)}
            </select>
          </label>
        </div>
      </details>

      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="신고한 친구에게 보일 한마디 (선택) 예: 정답을 3번으로 고쳤어" />
      <label className="small" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" checked={reward} onChange={(e) => setReward(e.target.checked)} />
        진짜 오류였으면 신고한 친구에게 보너스 주기 (먼저 신고한 사람 +5점, 다음 사람들 +2점)
      </label>
      <div className="row">
        <button className="btn" disabled={busy} onClick={() => run(async () => {
          const { error } = await sb().rpc("admin_update_question", {
            p_question: it.question_id, p_body: body, p_choices: mc ? list : [], p_answer: mc ? answer : null,
            p_answer_text: mc ? null : answerText, p_explanation: explanation, p_difficulty: difficulty,
          });
          if (error) throw error;
          const { data, error: e2 } = await sb().rpc("admin_close_reports", { p_question: it.question_id, p_status: "fixed", p_note: note, p_reward: reward });
          if (e2) throw e2;
          const got = ((data as { rewarded: { nickname: string; points: number }[] })?.rewarded ?? []).map((x) => `${x.nickname} +${x.points}`).join(", ");
          return `${it.no}번을 고치고 '반영됨'으로 처리했어.${got ? ` 보너스: ${got}` : ""}`;
        })}>고친 내용 저장 + 반영됨</button>
        <button className="btn line" disabled={busy} onClick={() => run(async () => {
          const { error } = await sb().rpc("admin_close_reports", { p_question: it.question_id, p_status: "dismissed", p_note: note, p_reward: false });
          if (error) throw error;
          return `${it.no}번 신고를 '문제 없음'으로 닫았어.`;
        })}>문제 없음</button>
        <button className="btn line" disabled={busy} onClick={() => run(async () => {
          const show = it.q_status !== "published";
          const { error } = await sb().rpc("admin_set_question_visible", { p_question: it.question_id, p_visible: show });
          if (error) throw error;
          return show ? `${it.no}번을 다시 공개했어.` : `${it.no}번을 공개 중지했어. 고친 뒤 다시 공개해 줘.`;
        })}>{it.q_status === "published" ? "일단 공개 중지" : "다시 공개"}</button>
        {msg && <span className="small muted">{msg}</span>}
      </div>
    </article>
  );
}

/** 관리자: 학생들이 신고한 문제 오류 */
export default function AdminReports() {
  const [items, setItems] = useState<Item[] | null>(null);
  const load = useCallback(async () => {
    const { data } = await sb().rpc("admin_reports");
    setItems((data as Item[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>문제 오류 신고 <span className="num muted">{items?.length ?? 0}</span></h2>
        <span className="small faint">고치면 신고한 친구 화면에 &lsquo;반영됨&rsquo;이 떠. 정답을 바꿔도 이미 채점된 기록은 그대로야.</span>
      </div>
      <div className="panel-body" style={{ display: "grid", gap: 10 }}>
        {items === null && <p className="muted small" style={{ margin: 0 }}>불러오는 중…</p>}
        {items?.length === 0 && <p className="muted small" style={{ margin: 0 }}>들어온 신고가 없어.</p>}
        {items?.map((it) => <ReportCard key={it.question_id} it={it} onDone={load} />)}
      </div>
    </section>
  );
}
