"use client";
/**
 * 카카오톡·인스타그램·네이버 앱 같은 "앱 안 브라우저"에서는 Google이 로그인을 막는다 (403 disallowed_useragent).
 * 그래서 이런 곳에서 열렸으면 크롬·사파리 같은 진짜 브라우저로 다시 열게 한다.
 */
export type InApp = { name: string; kakao: boolean; android: boolean; ios: boolean } | null;

export function detectInApp(): InApp {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const android = /Android/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const list: [RegExp, string][] = [
    [/KAKAOTALK/i, "카카오톡"],
    [/NAVER\(inapp|NAVER\//i, "네이버 앱"],
    [/Instagram/i, "인스타그램"],
    [/FBAN|FBAV|FB_IAB/i, "페이스북"],
    [/Line\//i, "라인"],
    [/everytimeApp/i, "에브리타임"],
    [/DaumApps/i, "다음 앱"],
    [/BAND\//i, "밴드"],
    [/; wv\)/i, "앱 안 브라우저"],
  ];
  for (const [re, name] of list) if (re.test(ua)) return { name, kakao: name === "카카오톡", android, ios };
  return null;
}

/** 진짜 브라우저로 다시 열기. 안 되면 false (iOS의 다른 앱은 직접 눌러야 함) */
export function openExternal(app: InApp): boolean {
  if (!app) return false;
  const here = location.href;
  if (app.kakao) {
    location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(here)}`;
    return true;
  }
  if (app.android) {
    const u = new URL(here);
    location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(here)};end`;
    return true;
  }
  return false;
}
