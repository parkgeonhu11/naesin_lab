"use client";
import { useState } from "react";
import { friendly } from "@/lib/supabase";

export default function NicknameCard({
  current,
  onSave,
  title = "랭킹에 쓸 닉네임을 정해 줘",
}: {
  current: string | null;
  onSave: (n: string) => Promise<void>;
  title?: string;
}) {
  const [v, setV] = useState(current ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card row"
      onSubmit={async (e) => {
        e.preventDefault();
        const n = v.trim();
        if (!n) return setMsg("닉네임을 입력해 줘.");
        setBusy(true);
        try {
          await onSave(n);
          setMsg("저장했어.");
        } catch (err) {
          setMsg(friendly(err));
        }
        setBusy(false);
      }}
    >
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <b>{title}</b>
        <div className="small muted">실명 말고 별명을 써 줘. 순위표에 이 이름이 보여.</div>
      </div>
      <input id="nick" className="input" style={{ width: 180, maxWidth: "100%" }} maxLength={12} value={v} onChange={(e) => setV(e.target.value)} placeholder="수학천재민지" autoComplete="off" />
      <button className="btn" disabled={busy}>저장</button>
      {msg && <span className="small muted">{msg}</span>}
    </form>
  );
}
