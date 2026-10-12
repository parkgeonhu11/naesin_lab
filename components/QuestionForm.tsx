"use client";
import { useState } from "react";
import { DIFF, QTYPES, SUBJECTS, type QType } from "@/lib/data";
import { friendly } from "@/lib/supabase";
import { useCategories } from "@/lib/useProblems";

export type QuestionInput = {
  subject: string;
  unit: string;
  topic: string;
  qtype: QType;
  difficulty: number;
  body: string;
  choices: string[];
  answer: number | null;
  answerText: string | null;
  explanation: string;
  source: string;
};

/** 학생 제안과 관리자 직접 추가에 같이 쓰는 문제 입력 폼 */
export default function QuestionForm({
  maxDifficulty,
  submitLabel,
  showSource,
  onSubmit,
}: {
  maxDifficulty: number;
  submitLabel: string;
  showSource?: boolean;
  onSubmit: (q: QuestionInput) => Promise<string>;
}) {
  const [subject, setSubject] = useState("ko");
  const [qtype, setQtype] = useState<QType>("mc");
  const [diff, setDiff] = useState(Math.min(3, maxDifficulty));
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [opts, setOpts] = useState(["", "", "", "", ""]);
  const [ans, setAns] = useState(0);
  const [ansText, setAnsText] = useState("");
  const [exp, setExp] = useState("");
  const [source, setSource] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const { cats } = useCategories();
  // 고른 과목의 기존 분류를 입력 칸 추천 목록으로 보여 준다
  const unitOptions = Array.from(new Set(cats.filter((c) => c.subject === subject).map((c) => c.unit)));
  const topicOptions = Array.from(new Set(cats.filter((c) => c.subject === subject && (!unit || c.unit === unit)).map((c) => c.topic).filter(Boolean)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unit.trim()) return setMsg("대단원을 입력해 줘.");
    if (!body.trim()) return setMsg("문제를 입력해 줘.");
    let choices: string[] = [];
    let answer: number | null = null;
    if (qtype === "mc") {
      if (!opts[ans].trim()) return setMsg("정답으로 체크한 보기가 비어 있어.");
      opts.forEach((o, i) => {
        if (o.trim()) {
          if (i === ans) answer = choices.length;
          choices.push(o.trim());
        }
      });
      if (choices.length < 2) return setMsg("보기를 2개 이상 써 줘.");
    } else if (!ansText.trim()) {
      return setMsg("단답형 정답을 입력해 줘.");
    } else {
      choices = [];
    }
    setBusy(true);
    try {
      const done = await onSubmit({
        subject, unit: unit.trim(), topic: topic.trim(), qtype, difficulty: diff, body: body.trim(), choices, answer,
        answerText: qtype === "short" ? ansText.trim() : null, explanation: exp.trim(), source: source.trim(),
      });
      setMsg(done);
      setBody(""); setOpts(["", "", "", "", ""]); setExp(""); setAns(0); setAnsText("");
    } catch (err) {
      setMsg(friendly(err));
    }
    setBusy(false);
  }

  return (
    <form className="panel panel-body" style={{ display: "grid", gap: 12 }} onSubmit={submit}>
      <div className="row">
        <label className="field" htmlFor="fSub">과목
          <select id="fSub" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="fUnit">대단원
          <input id="fUnit" list="unit-options" maxLength={40} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="목록에서 고르거나 직접 입력" />
          <datalist id="unit-options">{unitOptions.map((u) => <option key={u} value={u} />)}</datalist>
        </label>
        <label className="field" htmlFor="fTopic">세부 유형 (선택)
          <input id="fTopic" list="topic-options" maxLength={40} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="목록에서 고르거나 직접 입력" />
          <datalist id="topic-options">{topicOptions.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
      </div>
      <div className="row">
        <label className="field" htmlFor="fType">형식
          <select id="fType" value={qtype} onChange={(e) => setQtype(e.target.value as QType)}>
            {QTYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="fDiff">난이도
          <select id="fDiff" value={diff} onChange={(e) => setDiff(+e.target.value)}>
            {DIFF.filter((d) => d.level <= maxDifficulty).map((d) => <option key={d.level} value={d.level}>{d.label} · {d.points}점</option>)}
          </select>
        </label>
        {showSource && (
          <label className="field" htmlFor="fSource">출처 (선택)
            <input id="fSource" maxLength={60} value={source} onChange={(e) => setSource(e.target.value)} placeholder="교과서 p.172 응용" />
          </label>
        )}
      </div>
      <label className="field" htmlFor="fBody">문제
        <textarea id="fBody" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="문제를 입력해" />
      </label>
      {qtype === "mc" ? (
        <div style={{ display: "grid", gap: 6 }}>
          <span className="small muted">보기 (2개 이상) · 정답에 체크</span>
          {opts.map((o, i) => (
            <div key={i} className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
              <input type="radio" name="fAns" id={`fAns${i}`} checked={ans === i} onChange={() => setAns(i)} aria-label={`${i + 1}번을 정답으로`} />
              <span className="badge subj">{i + 1}</span>
              <input id={`fOpt${i}`} className="input" maxLength={200} value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`보기 ${i + 1}`} />
            </div>
          ))}
        </div>
      ) : (
        <label className="field" htmlFor="fAnsText">정답
          <input id="fAnsText" maxLength={200} value={ansText} onChange={(e) => setAnsText(e.target.value)} placeholder="세종|세종대왕" />
          <span className="faint">맞다고 인정할 답이 여러 개면 | 로 구분해. 띄어쓰기·마침표는 자동으로 무시돼.</span>
        </label>
      )}
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
