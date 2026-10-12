"use client";
import { useState } from "react";
import { SUBJECTS } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";
import { useCategories } from "@/lib/useProblems";

/** 관리자용: 과목별 분류(대단원 → 세부 유형) 보기·추가·삭제 */
export default function CategoryManager() {
  const { cats, reload } = useCategories();
  const [subject, setSubject] = useState("ma");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState<string | null>(null);

  const mine = cats.filter((c) => c.subject === subject);
  const units = Array.from(new Set(mine.map((c) => c.unit)));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb().rpc("admin_add_category", { p_subject: subject, p_unit: unit, p_topic: topic });
    if (error) return setMsg(friendly(error));
    setMsg("추가했어.");
    setTopic("");
    reload();
  }

  async function remove(u: string, t: string) {
    const key = u + "|" + t;
    if (armed !== key) {
      setArmed(key);
      setTimeout(() => setArmed(null), 4000);
      return;
    }
    setArmed(null);
    const { error } = await sb().rpc("admin_remove_category", { p_subject: subject, p_unit: u, p_topic: t });
    setMsg(error ? friendly(error) : "삭제했어. (이미 있는 문제는 그대로 남아)");
    reload();
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>분류 관리</h2>
        <span className="small faint">문제가 없어도 학생 화면의 분류 목록에 보여.</span>
      </div>
      <div className="tabs">
        {SUBJECTS.map((s) => (
          <button key={s.code} aria-pressed={subject === s.code} onClick={() => { setSubject(s.code); setUnit(""); }}>{s.name}</button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>대단원</th><th>세부 유형</th><th className="c" style={{ width: 90 }}>삭제</th></tr></thead>
          <tbody>
            {mine.length === 0 && <tr><td colSpan={3} className="empty-cell">이 과목에는 아직 분류가 없어. 아래에서 추가해 줘.</td></tr>}
            {mine.map((c) => (
              <tr key={c.unit + "|" + c.topic}>
                <td>{c.unit}</td>
                <td className="muted">{c.topic || "(대단원 전체)"}</td>
                <td className="c">
                  <button className={`btn ${armed === c.unit + "|" + c.topic ? "danger" : "line"}`} style={{ padding: "3px 10px", fontSize: 12.5 }} onClick={() => remove(c.unit, c.topic)}>
                    {armed === c.unit + "|" + c.topic ? "한 번 더" : "삭제"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="panel-body row" onSubmit={add} style={{ borderTop: "1px solid var(--line)" }}>
        <label className="field" htmlFor="cUnit">대단원
          <input id="cUnit" list="c-units" value={unit} maxLength={40} onChange={(e) => setUnit(e.target.value)} placeholder="Ⅴ. 생식과 유전" />
          <datalist id="c-units">{units.map((u) => <option key={u} value={u} />)}</datalist>
        </label>
        <label className="field" htmlFor="cTopic">세부 유형 (선택)
          <input id="cTopic" value={topic} maxLength={40} onChange={(e) => setTopic(e.target.value)} placeholder="감수 분열" />
        </label>
        <button className="btn" style={{ alignSelf: "flex-end" }}>분류 추가</button>
        {msg && <span className="small muted" style={{ flexBasis: "100%" }}>{msg}</span>}
      </form>
    </section>
  );
}
