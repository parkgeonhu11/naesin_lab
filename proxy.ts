import { NextResponse, type NextRequest } from "next/server";

/**
 * 미리보기(preview) 배포 잠금: 열쇠 링크(?key=…)로 한 번 들어온 브라우저만 볼 수 있다.
 * Vercel이 붙이는 VERCEL_ENV가 "preview"일 때만 작동해서, 실제 사이트(production)에는 영향이 없다.
 * 열쇠 자체는 저장소에 없고, 그 SHA-256 값만 둔다.
 */
const KEY_HASH = "2eb5ed00a4db31ead54fd84915ad060a829503b14f53d8f9494799f1b48bc5e7";
const COOKIE = "nl_gate";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const LOCKED = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>비공개</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f8f8f8;color:#0a0a0a;font-family:-apple-system,"Apple SD Gothic Neo",system-ui,sans-serif;word-break:keep-all}main{max-width:420px;padding:24px}h1{font-size:24px;margin:0 0 8px;letter-spacing:-.02em}p{margin:0;color:#3d3d3d;line-height:1.6}</style></head>
<body><main><h1>지금은 비공개 테스트 중이에요</h1><p>내신랩 예비 사이트는 운영자만 볼 수 있어요. 지금 쓰는 내신랩은 원래 주소에서 그대로 이용할 수 있어요.</p></main></body></html>`;

export async function proxy(req: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") return NextResponse.next();

  const key = req.nextUrl.searchParams.get("key");
  if (key && (await sha256(key)) === KEY_HASH) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("key");
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE, key, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
    return res;
  }
  const c = req.cookies.get(COOKIE)?.value;
  if (c && (await sha256(c)) === KEY_HASH) return NextResponse.next();

  return new NextResponse(LOCKED, { status: 401, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "no-store" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|icons/|manifest|sw.js|robots.txt).*)"],
};
