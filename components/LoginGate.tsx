"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { GoogleButton } from "@/components/NicknameCard";
import { detectInApp, openExternal, type InApp } from "@/lib/inapp";
import { useMe } from "@/lib/useMe";

/** 로그인 · 회원가입 화면 (/login). 로그인은 선택이라, 안 해도 문제는 바로 풀 수 있다 */
export default function LoginGate({ next = "/" }: { next?: string }) {
  const { notice, googleOn, user, isAnon, points } = useMe();
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
        <h1>로그인 · 회원가입</h1>
        <p className="small muted" style={{ margin: "0 0 10px" }}>Google 계정으로 들어와. 처음이면 그대로 회원가입이 돼. <b>로그인 안 해도 문제는 바로 풀 수 있어.</b></p>
        <ul className="gate-points">
          <li>휴대폰, 컴퓨터 어디서 들어와도 <b>같은 기록·점수·오답 노트</b>가 이어져.</li>
          <li>{user && isAnon ? <>지금 게스트로 쌓은 기록{points ? ` (${points}점)` : ""}은 <b>그대로 옮겨져</b>.</> : <>게스트로 풀던 기록이 있으면 <b>그대로 옮겨져</b>.</>}</li>
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
          </>
        ) : (
          <div className="gate-inapp">
            <b>Google 로그인은 관리자가 준비하는 중이야</b>
            <p className="small">준비되면 이 화면에서 바로 Google로 로그인할 수 있어. 그 전에는 그냥 문제를 풀면 게스트로 기록되고, 나중에 Google로 로그인하면 기록이 그대로 옮겨져.</p>
            <button type="button" className="btn google big gate-google" disabled aria-disabled="true">Google로 계속하기 (준비 중)</button>
          </div>
        )}
        <div className="gate-or"><span>또는</span></div>
        <a className="btn line big gate-guest" href={next}>로그인 없이 계속 풀기</a>
        <p className="small faint" style={{ margin: "6px 0 0" }}>
          로그인 없이 풀면 <b>게스트</b>로 기록돼. 게스트 기록은 이 브라우저에만 연결돼 있어서, 인터넷 기록을 지우거나 기기를 바꾸면 다시 찾을 수 없어.
        </p>

        <p className="gate-foot small faint">
          별명은 내 정보에서 바꿀 수 있어. 욕설·19금·비하 표현이 든 별명은 쓸 수 없어.{" "}
          <a className="link" href="/terms">이용약관</a> · <a className="link" href="/privacy">개인정보처리방침</a>
        </p>
      </div>
    </div>
  );
}
