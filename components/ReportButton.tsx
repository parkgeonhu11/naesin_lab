"use client";
import { useEffect, useRef, useState } from "react";
import { friendly, sb } from "@/lib/supabase";

export const REPORT_KINDS: { code: string; label: string; hint: string }[] = [
  { code: "answer", label: "정답이 틀린 것 같아", hint: "몇 번이 정답인 것 같은지, 왜 그런지 써 줘" },
  { code: "choices", label: "보기가 이상해", hint: "정답이 두 개, 정답이 없음, 보기 오타 등" },
  { code: "body", label: "문제에 오타·오류가 있어", hint: "어느 부분이 어떻게 이상한지 써 줘" },
  { code: "explanation", label: "해설이 틀렸어", hint: "해설의 어느 부분이 틀렸는지 써 줘" },
  { code: "difficulty", label: "난이도가 안 맞아", hint: "너무 쉽다/어렵다, 어느 정도가 맞을지" },
  { code: "other", label: "기타", hint: "무엇이 이상한지 5자 이상 써 줘" },
];
export const reportKindName = (k: string) => REPORT_KINDS.find((x) => x.code === k)?.label ?? k;

type Mine = { kind: string; detail: string; status: "open" | "fixed" | "dismissed"; admin_note: string | null; reward: number };

/** 문제 오류 신고 버튼 + 신고 창 */
export default function ReportButton({ questionId, no, className = "" }: { questionId: string; no: number; className?: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [kind, setKind] = useState("answer");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setMine(null); setMsg(""); setDetail(""); setKind("answer");
    sb().rpc("my_report_status", { p_question: questionId }).then(({ data }) => setMine(((data as Mine[]) ?? [])[0] ?? null));
  }, [questionId]);

  const open = () => {
    if (mine?.status === "open") { setKind(mine.kind); setDetail(mine.detail); }
    setMsg("");
    dlg.current?.showModal();
  };
  const hint = REPORT_KINDS.find((k) => k.code === kind)?.hint ?? "";
  const label =
    mine?.status === "open" ? "신고 접수됨 (확인 중)" : mine?.status === "fixed" ? `신고 반영됨 ✓${mine.reward ? ` +${mine.reward}점` : ""}` : "문제 오류 신고";

  return (
    <>
      <button type="button" className={`report-btn ${mine?.status ?? ""} ${className}`} onClick={open}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5" />
        </svg>
        {label}
      </button>

      <dialog
        ref={dlg}
        className="report-dlg"
        aria-labelledby={`rep-title-${no}`}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}
      >
        <form
          method="dialog"
          className="report-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { data, error } = await sb().rpc("report_question", { p_question: questionId, p_kind: kind, p_detail: detail });
            setBusy(false);
            if (error) return setMsg(friendly(error));
            setMsg(String(data));
            setMine({ kind, detail, status: "open", admin_note: null, reward: 0 });
            setTimeout(() => dlg.current?.close(), 1200);
          }}
        >
          <div className="report-head">
            <h2 id={`rep-title-${no}`}>{no}번 문제 오류 신고</h2>
            <button type="button" className="report-x" aria-label="닫기" onClick={() => dlg.current?.close()}>✕</button>
          </div>

          {mine && mine.status !== "open" && (
            <p className={`notice ${mine.status === "fixed" ? "" : "warn"}`} style={{ margin: 0 }}>
              지난 신고: {mine.status === "fixed" ? `관리자가 고쳤어.${mine.reward ? ` 보너스 +${mine.reward}점을 받았어!` : ""}` : "관리자가 확인했는데 문제가 없대."}
              {mine.admin_note ? ` (${mine.admin_note})` : ""}
            </p>
          )}

          <fieldset className="report-kinds">
            <legend className="small muted">어떤 오류야?</legend>
            {REPORT_KINDS.map((k) => (
              <label key={k.code} className={kind === k.code ? "on" : ""}>
                <input type="radio" name={`kind-${no}`} value={k.code} checked={kind === k.code} onChange={() => setKind(k.code)} />
                {k.label}
              </label>
            ))}
          </fieldset>

          <label className="small muted" htmlFor={`rep-detail-${no}`}>자세히 (선택, 500자까지)</label>
          <textarea
            id={`rep-detail-${no}`} className="input" rows={4} maxLength={500} value={detail}
            onChange={(e) => setDetail(e.target.value)} placeholder={hint}
          />
          <p className="small faint" style={{ margin: 0 }}>
            진짜 오류라서 관리자가 고치면 <b>보너스 점수</b>를 줘: 가장 먼저 신고한 사람 +5점, 같은 문제를 뒤이어 신고한 사람 +2점 (한 사람당 20번까지). 장난 신고는 점수 없어.
          </p>
          {msg && <p className={`small ${/했어|고쳤어/.test(msg) ? "res-ac" : "res-wa"}`} style={{ margin: 0 }}>{msg}</p>}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn line" onClick={() => dlg.current?.close()}>취소</button>
            <button className="btn" disabled={busy}>{busy ? "보내는 중…" : mine?.status === "open" ? "신고 내용 고치기" : "신고하기"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
