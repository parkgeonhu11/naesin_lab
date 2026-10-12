"use client";
import { useState } from "react";
import { DIFF, SUBJECTS } from "@/lib/data";
import { friendly } from "@/lib/supabase";

export type QuestionInput = {
  subject: string;
  unit: string;
  difficulty: number;
  body: string;
  choices: string[];
  answer: number;
  explanation: string;
};

/** 학생 제안과 관리자 직접 추가에 같이 쓰는 문제 입력 폼 */
export default function QuestionForm({
  maxDifficulty,
  submitLabel,
  onSubmit,
}: {
  maxDifficulty: number;
  submitLabel: string;
  onSubmit: (q: QuestionInput) => Promise<string>;
}) {
  const [subject, setSubject] = useState("ko");
  const [diff, setDiff] = useState(Math.min(3, maxDifficulty));
  const [unit, setUnit] = useState("");
  const [body, setBody] = useState("");
  const [opts, setOpts] = useState(["", "", "", "", ""]);
  const [ans, setAns] = useState(0);
  const [exp, setExp] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setMsg("문제를 입력해 줘.");
    if (!opts[ans].trim()) return setMsg("정답으로 체크한 보기가 비어 있어.");
    const choices: string[] = [];
    let answer = 0;
    opts.forEach((o, i) => {
      if (o.trim()) {
        if (i === ans) answer = choices.length;
        choices.push(o.trim());
      }
    });
    if (choices.length < 2) return setMsg("보기를 2개 이상 써 줘.");
    setBusy(true);
    try {
      const done = await onSubmit({ subject, unit: unit.trim(), difficulty: diff, body: body.trim(), choices, answer, explanation: exp.trim() });
      setMsg(done);
      setBody(""); setOpts(["", "", "", "", ""]); setExp(""); setAns(0);
    } catch (err) {
      setMsg(friendly(err));
    }
    setBusy(false);
  }

  return (
    <form className="card stack" style={{ gap: 12 }} onSubmit={submit}>
      <div className="row">
        <label className="field" htmlFor="fSub">과목
          <select id="fSub" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="fDiff">난이도
          <select id="fDiff" value={diff} onChange={(e) => setDiff(+e.target.value)}>
            {DIFF.filter((d) => d.level <= maxDifficulty).map((d) => <option key={d.level} value={d.level}>{d.label} · {d.points}점</option>)}
          </select>
        </label>
        <label className="field" htmlFor="fUnit">단원 (선택)
          <input id="fUnit" maxLength={30} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="삼각비" />
        </label>
      </div>
      <label className="field" htmlFor="fBody">문제
        <textarea id="fBody" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="문제를 입력해" />
      </label>
      <div className="stack" style={{ gap: 6 }}>
        <span className="small muted">보기 (2개 이상) · 정답에 체크</span>
        {opts.map((o, i) => (
          <div key={i} className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
            <input type="radio" name="fAns" id={`fAns${i}`} checked={ans === i} onChange={() => setAns(i)} aria-label={`${i + 1}번을 정답으로`} />
            <span className="bub">{i + 1}</span>
            <input id={`fOpt${i}`} className="input" maxLength={200} value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`보기 ${i + 1}`} />
          </div>
        ))}
      </div>
      <label className="field" htmlFor="fExp">해설 (선택)
        <textarea id="fExp" maxLength={500} value={exp} onChange={(e) => setExp(e.target.value)} placeholder="왜 그게 답인지 짧게" />
      </label>
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? "올리는 중…" : submitLabel}</button>
        {msg && <span className="small muted">{msg}</span>}
      </div>
    </form>
  );
}
