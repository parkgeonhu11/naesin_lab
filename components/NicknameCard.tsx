"use client";
import { useEffect, useRef, useState } from "react";
import { friendly, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

type Check = { ok: boolean; reason: string | null };

/** Google 공식 로그인 버튼 모양 (Google 로그인 버튼 가이드의 G 로고) */
export function GoogleButton({ label = "Google로 로그인", className = "" }: { label?: string; className?: string }) {
  const { signInGoogle } = useMe();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={`btn google ${className}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await signInGoogle(); } catch { setBusy(false); }
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {busy ? "Google로 이동 중…" : label}
    </button>
  );
}

export default function NicknameCard({
  current,
  onSave,
  title = "랭킹에 쓸 별명을 정해 줘",
  firstTime = false,
}: {
  current: string | null;
  onSave: (n: string) => Promise<void>;
  title?: string;
  /** 처음 들어온 사람: 'Google로 로그인' 안내도 같이 보여 줌 */
  firstTime?: boolean;
}) {
  const { isAnon, googleOn } = useMe();
  const [v, setV] = useState(current && current !== "별명 변경 중" ? current : "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const seq = useRef(0);

  // 입력하는 동안 서버에서 바로 검수 (비속어·19금·혐오 표현·중복)
  useEffect(() => {
    const n = v.trim();
    setMsg("");
    if (!n || n === current) { setCheck(null); setChecking(false); return; }
    setChecking(true);
    const my = ++seq.current;
    const t = setTimeout(async () => {
      const { data, error } = await sb().rpc("check_nickname", { p_nick: n });
      if (my !== seq.current) return;
      setChecking(false);
      setCheck(error ? null : (data as Check));
    }, 350);
    return () => clearTimeout(t);
  }, [v, current]);

  const bad = check && !check.ok;
  return (
    <form
      className={`panel panel-body nick-card${bad ? " bad" : ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        const n = v.trim();
        if (!n) return setMsg("별명을 입력해 줘.");
        if (bad) return setMsg(check!.reason ?? "다른 별명으로 해 줘.");
        setBusy(true);
        try {
          await onSave(n);
          setMsg("저장했어.");
          setCheck(null);
        } catch (err) {
          setMsg(friendly(err));
        }
        setBusy(false);
      }}
    >
      <div className="row">
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <b>{title}</b>
          <div className="small muted">실명 말고 별명을 써 줘. 순위표에 이 이름이 보여. (1~12자, 욕설·19금·비하 표현은 안 돼)</div>
        </div>
        <input
          id="nick" className="input" style={{ width: 200, maxWidth: "100%" }} maxLength={12} value={v}
          onChange={(e) => setV(e.target.value)} placeholder="수학천재민지" autoComplete="off"
          aria-invalid={!!bad} aria-describedby="nick-check"
        />
        <button className="btn" disabled={busy || !!bad || checking}>저장</button>
      </div>
      <div id="nick-check" className="nick-check" aria-live="polite">
        {msg ? <span className={/저장했어/.test(msg) ? "ok" : "no"}>{msg}</span>
          : checking ? <span className="muted">확인하는 중…</span>
          : check ? (check.ok ? <span className="ok">✓ 쓸 수 있는 별명이야</span> : <span className="no">✗ {check.reason}</span>)
          : null}
      </div>
      {firstTime && isAnon && googleOn && (
        <div className="nick-login">
          <span className="small">
            <b>전에 쓰던 계정이 있어?</b> Google로 로그인하면 다른 휴대폰·컴퓨터에서도 같은 계정으로 이어서 할 수 있어.
          </span>
          <GoogleButton />
        </div>
      )}
    </form>
  );
}
