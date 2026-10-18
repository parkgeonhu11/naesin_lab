"use client";
import Link from "next/link";
import { useState } from "react";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

/** 회원 탈퇴: "탈퇴"를 직접 입력해야 버튼이 켜진다. 기록과 로그인 계정이 모두 지워진다. */
export default function DeleteAccount() {
  const { user, ready, signOut } = useMe();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!ready || !user) return null;

  return (
    <section className="panel panel-body del-card">
      {!open ? (
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className="small muted">계정과 기록을 완전히 지우고 싶으면 <Link href="/account-delete">탈퇴 안내</Link>를 봐.</span>
          <button type="button" className="btn line small" onClick={() => setOpen(true)}>회원 탈퇴</button>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (typed.trim() !== "탈퇴") return;
            setBusy(true); setMsg("");
            try {
              const { data, error } = await sb().functions.invoke("delete-account", { method: "POST" });
              if (error) {
                let m = "";
                try { m = (await (error as { context?: Response }).context?.json())?.error ?? ""; } catch {}
                throw new Error(m || error.message);
              }
              if (!(data as { ok?: boolean })?.ok) throw new Error("탈퇴를 끝내지 못했어");
              await signOut().catch(() => {});
              location.href = "/";
            } catch (err) {
              setMsg(friendly(err));
              setBusy(false);
            }
          }}
        >
          <b>정말 탈퇴할래?</b>
          <ul className="small muted del-list">
            <li>별명, 점수, 푼 기록, 오답 노트, 예상 시험 기록, 질문방 글이 <b>모두 지워지고 되돌릴 수 없어</b>.</li>
            <li>내가 제안해서 이미 공개된 문제는 남고, 작성자는 &ldquo;탈퇴한 학생&rdquo;으로 바뀌어.</li>
            <li>Google로 로그인했다면 내신랩 계정만 지워지고 Google 계정은 그대로야.</li>
          </ul>
          <div className="row" style={{ alignItems: "center" }}>
            <input id="del-confirm" className="input" style={{ width: 160 }} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="탈퇴 라고 입력" autoComplete="off" />
            <button className="btn danger" disabled={busy || typed.trim() !== "탈퇴"}>{busy ? "지우는 중…" : "계정 영구 삭제"}</button>
            <button type="button" className="btn line" onClick={() => { setOpen(false); setTyped(""); setMsg(""); }} disabled={busy}>취소</button>
          </div>
          {msg && <p className="small" style={{ color: "var(--bad, #d33)" }}>{msg}</p>}
        </form>
      )}
    </section>
  );
}
