// 내신랩 앱(PWA) 서비스 워커
// - 페이지는 항상 인터넷에서 새로 받아 와 (그래서 사이트를 고치면 앱도 바로 바뀌어)
// - 인터넷이 끊기면 '연결이 끊겼어' 화면을 보여 줘
// - 점수·랭킹 같은 데이터(Supabase)는 건드리지 않아
const VER = "nl-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > 160) await Promise.all(keys.slice(0, keys.length - 120).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
    return;
  }
  // 이름에 해시가 붙은 빌드 파일과 아이콘만 저장해 두고 재사용 (빠르게 열리도록)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(VER).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) { c.put(req, res.clone()); trim(c); }
        return res;
      }),
    );
  }
});
