/**
 * 문제 그림: 좌표로 적은 "그림 설명(spec)"을 SVG로 그린다.
 * DB에는 짧은 JSON만 저장하고, 그리는 건 화면에서 한다 (밝은/어두운 화면 모두 currentColor로 맞춤).
 *
 * spec 예시 (수학 좌표, y가 위쪽):
 * {
 *   "p":   { "A": [0, 3], "B": [4, 0], "C": [0, 0, 225] },   // 점 [x, y, 이름표 방향(도, 선택)]
 *   "hide": ["O2"],                                          // 이름표를 안 붙일 점
 *   "dot":  ["P"],                                           // 점을 동그랗게 찍을 점
 *   "s":   [["A","B"], ["A","C"], ["C","H","d"]],            // 선분, "d" = 점선
 *   "ray": [["A","B", 1.6]],                                 // A→B 방향으로 길이 배수만큼 늘린 선
 *   "poly":[["A","B","C"]],                                  // 닫힌 다각형
 *   "c":   [["O", 5], ["O", 5, "d"]],                         // 원 [중심, 반지름, 점선]
 *   "len": [["A","B","13"], ["B","C","x","in"]],             // 선분 옆 길이 글자 ("in" = 안쪽에)
 *   "ang": [["B","A","C","30°"]],                             // A에서 AB와 AC 사이 각 표시
 *   "ra":  [["A","C","B"]],                                   // C에서 직각 표시
 *   "t":   [[x, y, "글자"]],                                  // 아무 데나 글자
 *   "pl":  [{"xy": [[x,y], ...], "d": true}],                   // 꺾은선(호를 잘게 나눈 것)
 *   "note": "그림은 실제 크기와 다를 수 있어"
 * }
 */
export type FigureSpec = {
  p: Record<string, [number, number] | [number, number, number]>;
  hide?: string[];
  dot?: string[];
  s?: (string[])[];
  ray?: [string, string, number][];
  poly?: string[][];
  c?: (string | number)[][];
  len?: string[][];
  ang?: string[][];
  ra?: string[][];
  t?: [number, number, string][];
  arc?: (string | number)[][]; // [중심, 반지름, 시작각, 끝각, 점선?]
  pl?: { d?: boolean; xy: [number, number][] }[]; // 꺾은선 (곡선을 잘게 나눈 것 등)
  note?: string;
  w?: number; // 최대 가로(px)
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f = (n: number) => (Math.round(n * 10) / 10).toString();

export function figureSvg(spec: FigureSpec): string {
  const P = spec.p ?? {};
  const names = Object.keys(P);
  if (!names.length) return "";
  // 그릴 범위: 점 + 원 둘레
  const xs: number[] = [], ys: number[] = [];
  names.forEach((n) => { xs.push(P[n][0]); ys.push(P[n][1]); });
  (spec.c ?? []).forEach(([o, r]) => {
    const c = P[o as string]; if (!c) return;
    xs.push(c[0] - (r as number), c[0] + (r as number)); ys.push(c[1] - (r as number), c[1] + (r as number));
  });
  (spec.ray ?? []).forEach(([a, b, k]) => {
    const A = P[a], B = P[b]; if (!A || !B) return;
    xs.push(A[0] + (B[0] - A[0]) * k); ys.push(A[1] + (B[1] - A[1]) * k);
  });
  (spec.t ?? []).forEach(([x, y]) => { xs.push(x); ys.push(y); });
  (spec.pl ?? []).forEach((l) => l.xy.forEach(([x, y]) => { xs.push(x); ys.push(y); }));
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const W = spec.w ?? 300, H = 230, pad = 30;
  const k = Math.min((W - 2 * pad) / Math.max(maxx - minx, 1e-6), (H - 2 * pad) / Math.max(maxy - miny, 1e-6));
  const vw = (maxx - minx) * k + 2 * pad, vh = (maxy - miny) * k + 2 * pad;
  const X = (x: number) => (x - minx) * k + pad;
  const Y = (y: number) => (maxy - y) * k + pad;
  const S = (n: string): [number, number] => [X(P[n][0]), Y(P[n][1])];
  // 그림 중심 (이름표를 바깥쪽으로 밀 때 기준)
  const cx = names.reduce((a, n) => a + S(n)[0], 0) / names.length;
  const cy = names.reduce((a, n) => a + S(n)[1], 0) / names.length;

  const out: string[] = [];
  const line = (a: [number, number], b: [number, number], dash?: boolean) =>
    out.push(`<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"${dash ? ' stroke-dasharray="5 4"' : ""}/>`);
  const text = (x: number, y: number, s: string, cls = "") =>
    out.push(`<text x="${f(x)}" y="${f(y)}"${cls ? ` class="${cls}"` : ""}>${esc(s)}</text>`);

  (spec.poly ?? []).forEach((ps) => {
    if (ps.some((n) => !P[n])) return;
    out.push(`<polygon points="${ps.map((n) => S(n).map(f).join(",")).join(" ")}"/>`);
  });
  (spec.c ?? []).forEach(([o, r, d]) => {
    if (!P[o as string]) return;
    const [x, y] = S(o as string);
    out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f((r as number) * k)}"${d ? ' stroke-dasharray="5 4"' : ""}/>`);
  });
  (spec.arc ?? []).forEach(([o, r, a0, a1, d]) => {
    if (!P[o as string]) return;
    const [x, y] = S(o as string), R = (r as number) * k;
    const t0 = ((a0 as number) * Math.PI) / 180, t1 = ((a1 as number) * Math.PI) / 180;
    const large = ((a1 as number) - (a0 as number) + 360) % 360 > 180 ? 1 : 0;
    out.push(`<path d="M${f(x + R * Math.cos(t0))} ${f(y - R * Math.sin(t0))} A${f(R)} ${f(R)} 0 ${large} 0 ${f(x + R * Math.cos(t1))} ${f(y - R * Math.sin(t1))}"${d ? ' stroke-dasharray="5 4"' : ""}/>`);
  });
  (spec.pl ?? []).forEach((l) =>
    out.push(`<polyline points="${l.xy.map(([x, y]) => `${f(X(x))},${f(Y(y))}`).join(" ")}"${l.d ? ' stroke-dasharray="5 4"' : ""}/>`));
  (spec.s ?? []).forEach(([a, b, d]) => { if (P[a] && P[b]) line(S(a), S(b), d === "d"); });
  (spec.ray ?? []).forEach(([a, b, kk]) => {
    if (!P[a] || !P[b]) return;
    const A = S(a), B = S(b);
    line(A, [A[0] + (B[0] - A[0]) * kk, A[1] + (B[1] - A[1]) * kk]);
  });

  // 직각 표시
  (spec.ra ?? []).forEach(([a, v, b]) => {
    if (!P[a] || !P[v] || !P[b]) return;
    const V = S(v), A = S(a), B = S(b), m = 11;
    const u = (q: [number, number]) => { const dx = q[0] - V[0], dy = q[1] - V[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    const [ux, uy] = u(A), [wx, wy] = u(B);
    out.push(`<polyline class="thin" points="${f(V[0] + ux * m)},${f(V[1] + uy * m)} ${f(V[0] + (ux + wx) * m)},${f(V[1] + (uy + wy) * m)} ${f(V[0] + wx * m)},${f(V[1] + wy * m)}"/>`);
  });

  // 각 표시 (작은 쪽 각)
  (spec.ang ?? []).forEach(([a, v, b, lab, rr]) => {
    if (!P[a] || !P[v] || !P[b]) return;
    const V = S(v), A = S(a), B = S(b);
    let t1 = Math.atan2(-(A[1] - V[1]), A[0] - V[0]);
    let t2 = Math.atan2(-(B[1] - V[1]), B[0] - V[0]);
    let d = t2 - t1;
    while (d <= -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    if (d < 0) { [t1, t2] = [t2, t1]; d = -d; }
    const R = rr ? +rr : 17;
    out.push(`<path class="thin" d="M${f(V[0] + R * Math.cos(t1))} ${f(V[1] - R * Math.sin(t1))} A${R} ${R} 0 0 0 ${f(V[0] + R * Math.cos(t1 + d))} ${f(V[1] - R * Math.sin(t1 + d))}"/>`);
    if (lab) {
      const deg = (d * 180) / Math.PI;
      const tm = t1 + d / 2, L = R + 13 + Math.max(0, 40 - deg) * 0.6; // 좁은 각은 글자를 더 멀리
      text(V[0] + L * Math.cos(tm), V[1] - L * Math.sin(tm) + 4, lab, "ang");
    }
  });

  // 길이 글자
  (spec.len ?? []).forEach(([a, b, lab, side]) => {
    if (!P[a] || !P[b]) return;
    const A = S(a), B = S(b);
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    let nx = -(B[1] - A[1]), ny = B[0] - A[0];
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const outward = (mx + nx - cx) ** 2 + (my + ny - cy) ** 2 > (mx - nx - cx) ** 2 + (my - ny - cy) ** 2;
    if (outward === (side === "in")) { nx = -nx; ny = -ny; }
    text(mx + nx * 13, my + ny * 13 + 4, lab, "len");
  });

  // 점과 이름표
  const hide = new Set(spec.hide ?? []);
  (spec.dot ?? []).forEach((n) => { if (P[n]) { const [x, y] = S(n); out.push(`<circle class="dot" cx="${f(x)}" cy="${f(y)}" r="2.6"/>`); } });
  names.forEach((n) => {
    if (hide.has(n)) return;
    const [x, y] = S(n);
    let dx = x - cx, dy = y - cy;
    const deg = P[n][2];
    if (deg !== undefined) { dx = Math.cos((deg * Math.PI) / 180); dy = -Math.sin((deg * Math.PI) / 180); }
    const l = Math.hypot(dx, dy) || 1;
    text(x + (dx / l) * 13, y + (dy / l) * 13 + 5, n.replace(/\d+$/, ""), "pt");
  });
  (spec.t ?? []).forEach(([x, y, s]) => text(X(x), Y(y) + 4, s, "len"));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(vw)} ${f(vh)}" width="${f(vw)}" height="${f(vh)}" role="img">`
    + `<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${out.filter((s) => !s.startsWith("<text") && !s.includes('class="dot"')).join("")}</g>`
    + `<g fill="currentColor" stroke="none">${out.filter((s) => s.includes('class="dot"')).join("")}</g>`
    + `<g fill="currentColor" stroke="none" font-family="Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, Malgun Gothic, sans-serif" font-size="13" text-anchor="middle">${out.filter((s) => s.startsWith("<text")).join("")}</g>`
    + `</svg>`;
}
