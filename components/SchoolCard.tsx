"use client";
import { useEffect, useRef, useState } from "react";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type School = { id: string; name: string; region: string | null; students: number };

/** 학교·학년 고르기. 처음 들어온 사람(별명 다음 단계)과 내 정보 화면에서 같이 쓴다 */
export default function SchoolCard({ title = "학교와 학년을 골라 줘", compact = false }: { title?: string; compact?: boolean }) {
  const { school, grade, saveSchool } = useMe();
  const [q, setQ] = useState(school?.name ?? "");
  const [g, setG] = useState<number | null>(grade);
  const [list, setList] = useState<School[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  // 입력하는 동안 학교 찾기
  useEffect(() => {
    const my = ++seq.current;
    const t = setTimeout(async () => {
      const { data } = await sb().rpc("school_search", { p_q: q.trim() });
      if (my === seq.current) setList((data as School[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const name = q.trim().replace(/\s+/g, "");
  const full = /중$/.test(name) ? name + "학교" : name;
  const exact = list.some((s) => s.name === full);
  const changed = full !== (school?.name ?? "") || g !== grade;

  return (
    <form
      className={`panel panel-body nick-card school-card${compact ? " compact" : ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!full) return setMsg("학교 이름을 입력해 줘.");
        if (!/중학교$/.test(full)) return setMsg('학교 이름은 "○○중학교"처럼 써 줘.');
        if (!g) return setMsg("학년을 골라 줘.");
        setBusy(true);
        try {
          await saveSchool(full, g);
          setMsg("저장했어. 이제 우리 학교 랭킹과 우리 학교 문제 표시가 보여.");
          setOpen(false);
        } catch (err) {
          setMsg(friendly(err));
        }
        setBusy(false);
      }}
    >
      <div>
        <b>{title}</b>
        <div className="small muted">같은 학년 문제와 우리 학교 랭킹을 보여 줄게. 나중에 내 정보에서 바꿀 수 있어.</div>
      </div>
      <div className="school-row">
        <div className="school-pick">
          <label className="small muted" htmlFor="school-q">학교</label>
          <input
            id="school-q" className="input" value={q} maxLength={20} autoComplete="off" placeholder="예: ○○중학교"
            onChange={(e) => { setQ(e.target.value); setOpen(true); setMsg(""); }}
            onFocus={() => setOpen(true)}
            aria-autocomplete="list" aria-controls="school-list"
          />
          {open && (list.length > 0 || (full && !exact)) && (
            <ul className="school-list" id="school-list" role="listbox">
              {list.map((s) => (
                <li key={s.id}>
                  <button type="button" role="option" aria-selected={s.name === full} onClick={() => { setQ(s.name); setOpen(false); }}>
                    <b>{s.name}</b>
                    <small>{s.region ? `${s.region} · ` : ""}{s.students}명</small>
                  </button>
                </li>
              ))}
              {full && !exact && /중학교$/.test(full) && (
                <li>
                  <button type="button" className="school-new" onClick={() => setOpen(false)}>
                    <b>“{full}” 새로 추가</b>
                    <small>목록에 없으면 이 이름으로 만들어져</small>
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
        <div className="school-grade">
          <span className="small muted" id="grade-lab">학년</span>
          <div className="seg" role="radiogroup" aria-labelledby="grade-lab">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={g === n} onClick={() => { setG(n); setMsg(""); }}>{n}학년</button>
            ))}
          </div>
        </div>
        <button className="btn" disabled={busy || !changed}>{busy ? "저장 중…" : "저장"}</button>
      </div>
      <div className="nick-check" aria-live="polite">
        {msg && <span className={/저장했어/.test(msg) ? "ok" : "no"}>{msg}</span>}
      </div>
    </form>
  );
}
