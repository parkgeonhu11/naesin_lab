"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { GoogleButton } from "@/components/NicknameCard";
import { detectInApp, openExternal, type InApp } from "@/lib/inapp";
import { useMe } from "@/lib/useMe";

/** 게스트로 시작: 경고를 읽고 확인해야 들어갈 수 있음 */
function GuestStart({ onEnter }: { onEnter: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button type="button" className="btn line big gate-guest" onClick={() => setOpen(true)}>
        구글 계정이 없어? 게스트로 시작하기
      </button>
    );
  }
  return (
    <div className="gate-guest-box">
      <b>게스트로 시작하기 전에 꼭 읽어 줘</b>
      <ul>
        <li>문제 풀이·점수·랭킹은 Google 계정이랑 <b>똑같이 저장돼</b>.</li>
        <li>대신 계정이 <b>이 브라우저에만</b> 기억돼. 인터넷 기록·쿠키를 지우거나, 다른 휴대폰·컴퓨터·브라우저로 들어가면 <b>이 계정은 다시 찾을 수 없어</b>.</li>
        <li>잃어버린 게스트 계정은 관리자도 <b>되찾아 줄 수 없어</b>.</li>
        <li>나중에 Google로 로그인하면 지금까지 기록이 <b>그대로 옮겨져</b>.</li>
      </ul>
      <label className="gate-check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>잃어버리면 못 찾는다는 거 이해했어</span>
      </label>
      <div className="gate-guest-row">
        <button type="button" className="btn line" onClick={() => { setOpen(false); setOk(false); }}>취소</button>
        <button
          type="button"
          className="btn"
          disabled={!ok || busy}
          onClick={async () => { setBusy(true); await onEnter(); setBusy(false); }}
        >
          {busy ? "들어가는 중…" : "게스트로 시작"}
        </button>
      </div>
    </div>
  );
}

/** 처음 들어오면 보이는 로그인 화면 (Google 로그인 또는 게스트) */
export default function LoginGate() {
  const { notice, googleOn, enterAsGuest } = useMe();
  const [app, setApp] = useState<InApp>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const a = detectInApp();
    setApp(a);
    // 카카오톡이면 바로 기본 브라우저로 넘겨 준다 (한 번만)
    try {
      if (a?.kakao && !sessionStorage.getItem("nl-kakao-out")) {
        sessionStorage.setItem("nl-kakao-out", "1");
        openExternal(a);
      }
    } catch {}
  }, []);

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-brand">
          <span className="brand-mark"><Icon name="logo" /></span>
          <span><b>내신랩</b><small>중학생 내신 시험 대비</small></span>
        </div>
        <h1>Google 계정으로 시작해 줘</h1>
        <ul className="gate-points">
          <li>휴대폰, 컴퓨터 어디서 들어와도 <b>같은 기록·점수</b>가 이어져.</li>
          <li>순위표에는 <b>별명만</b> 보여. 이메일은 다른 친구에게 안 보여.</li>
        </ul>

        {notice && <div className="notice warn">{notice}</div>}

        {app ? (
          <div className="gate-inapp">
            <b>{app.name} 안에서는 Google 로그인이 막혀 있어</b>
            <p className="small">Google 정책 때문에 앱 안 브라우저에서는 로그인이 안 돼. 크롬이나 사파리로 열어 줘.</p>
            {(app.kakao || app.android) && (
              <button type="button" className="btn big" onClick={() => openExternal(app)}>
                {app.kakao ? "기본 브라우저로 열기" : "크롬으로 열기"}
              </button>
            )}
            {app.ios && !app.kakao && (
              <p className="small">오른쪽 아래(또는 위) <b>⋯ / 공유 버튼</b> → <b>Safari로 열기</b> 또는 <b>다른 브라우저로 열기</b>를 눌러 줘.</p>
            )}
            <button
              type="button"
              className="btn line"
              onClick={async () => {
                try { await navigator.clipboard.writeText(location.origin); setCopied(true); } catch {}
              }}
            >
              {copied ? "주소 복사했어! 브라우저 주소창에 붙여 넣어 줘" : "사이트 주소 복사하기"}
            </button>
          </div>
        ) : googleOn ? (
          <>
            <GoogleButton label="Google로 계속하기" className="big gate-google" />
            <div className="gate-or"><span>또는</span></div>
            <GuestStart onEnter={enterAsGuest} />
          </>
        ) : (
          <div className="gate-inapp">
            <b>Google 로그인은 관리자가 준비하는 중이야</b>
            <p className="small">준비되면 이 화면에서 바로 Google로 로그인할 수 있어. 그 전에는 게스트로 먼저 풀어 두고, 나중에 Google로 로그인하면 기록이 그대로 옮겨져.</p>
            <button type="button" className="btn google big gate-google" disabled aria-disabled="true">Google로 계속하기 (준비 중)</button>
          </div>
        )}
        {!app && !googleOn && <GuestStart onEnter={enterAsGuest} />}
        {app && (
          <>
            <div className="gate-or"><span>또는</span></div>
            <GuestStart onEnter={enterAsGuest} />
          </>
        )}

        <p className="gate-foot small faint">
          처음 로그인하면 랭킹에 쓸 별명을 정해. 욕설·19금·비하 표현이 든 별명은 쓸 수 없어.{" "}
          <a className="link" href="/terms">이용약관</a> · <a className="link" href="/privacy">개인정보처리방침</a>
        </p>
      </div>
    </div>
  );
}
