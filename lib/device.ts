"use client";
/** 접속 기기를 짧게 요약 (관리자 로그인 기록용). 자세한 브라우저 정보는 저장하지 않음 */
export function deviceInfo(): { device: string; os: string; browser: string } {
  if (typeof navigator === "undefined") return { device: "", os: "", browser: "" };
  const ua = navigator.userAgent;
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const device = ipad || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "태블릿" : /Mobi|iPhone|Android/.test(ua) ? "휴대폰" : "컴퓨터";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) || ipad ? "iOS" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "기타";
  const browser = /KAKAOTALK/i.test(ua) ? "카카오톡" : /NAVER/i.test(ua) ? "네이버 앱" : /Instagram/i.test(ua) ? "인스타그램"
    : /SamsungBrowser/i.test(ua) ? "삼성 인터넷" : /Whale/i.test(ua) ? "웨일" : /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /Safari/.test(ua) ? "Safari" : "기타";
  return { device, os, browser };
}
