"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 시험지 위에 바로 쓰는 필기 레이어.
 * - 필기를 켜면 펜(애플 펜슬·S펜)·마우스로 시험지 위에 그린다. 손가락은 스크롤.
 * - 필기 중에도 손가락으로 톡 누르면 아래 보기가 눌린다(답 고르기).
 * - 시험지가 길어서 캔버스를 4096px 조각으로 나눠 깐다.
 * - 그린 내용은 이 탭이 열려 있는 동안만 남는다(sessionStorage). 서버로는 안 보낸다.
 */

type Stroke = { c: string; w: number; h: boolean; e: boolean; p: [number, number][] };
const TILE = 4096;
const COLORS: { c: string; name: string; hl?: boolean }[] = [
  { c: "#e5383b", name: "빨강" },
  { c: "#2f6bff", name: "파랑" },
  { c: "ink", name: "검정" },
  { c: "#12965a", name: "초록" },
  { c: "#ffd400", name: "형광펜", hl: true },
];

export default function PageInk({ storageKey, children }: { storageKey: string; children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [color, setColor] = useState(0);
  const [width, setWidth] = useState(2.5);
  const [erase, setErase] = useState(false);
  const [finger, setFinger] = useState(false);
  const [count, setCount] = useState(0);
  const api = useRef<{ undo: () => void; clear: () => void } | null>(null);
  const tool = useRef({ color: 0, width: 2.5, erase: false, finger: false, on: false });
  tool.current = { color, width, erase, finger, on };

  useEffect(() => {
    const host = hostRef.current, layer = layerRef.current;
    if (!host || !layer) return;
    const key = "ink:" + storageKey;
    let strokes: Stroke[] = [];
    let baseW = 0;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) { const s = JSON.parse(raw); strokes = s.s ?? []; baseW = s.w ?? 0; }
    } catch {}
    const tiles: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y0: number; y1: number }[] = [];
    let W = 0, H = 0;
    let cur: { id: number; s: Stroke } | null = null;
    const ink = () => getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#111";
    const k = () => (baseW ? W / baseW : 1);
    const persist = () => { try { sessionStorage.setItem(key, JSON.stringify({ w: baseW, s: strokes })); } catch {} setCount(strokes.length); };

    const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke, kk: number) => {
      let pts = s.p; if (!pts.length) return; if (pts.length < 2) pts = [pts[0], pts[0]];
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (s.e) { ctx.globalCompositeOperation = "destination-out"; ctx.strokeStyle = "#000"; ctx.lineWidth = 20 * kk; }
      else { ctx.strokeStyle = s.c === "ink" ? ink() : s.c; ctx.globalAlpha = s.h ? 0.35 : 1; ctx.lineWidth = (s.h ? 16 : s.w) * kk; if (s.h) ctx.lineCap = "butt"; }
      ctx.beginPath(); ctx.moveTo(pts[0][0] * kk, pts[0][1] * kk);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = ((pts[i][0] + pts[i + 1][0]) / 2) * kk, my = ((pts[i][1] + pts[i + 1][1]) / 2) * kk;
        ctx.quadraticCurveTo(pts[i][0] * kk, pts[i][1] * kk, mx, my);
      }
      const l = pts[pts.length - 1]; ctx.lineTo(l[0] * kk, l[1] * kk); ctx.stroke(); ctx.restore();
    };
    const each = (s: Stroke, fn: (ctx: CanvasRenderingContext2D) => void) => {
      const kk = k(); let lo = Infinity, hi = -Infinity;
      for (const p of s.p) { const y = p[1] * kk; if (y < lo) lo = y; if (y > hi) hi = y; }
      tiles.forEach((t) => { if (hi + 24 >= t.y0 && lo - 24 <= t.y1) fn(t.ctx); });
    };
    const redraw = () => {
      tiles.forEach((t) => { t.ctx.save(); t.ctx.setTransform(1, 0, 0, 1, 0, 0); t.ctx.clearRect(0, 0, t.c.width, t.c.height); t.ctx.restore(); });
      const kk = k(); strokes.forEach((s) => each(s, (ctx) => drawStroke(ctx, s, kk)));
    };
    const fit = () => {
      const w = host.clientWidth, h = host.scrollHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === W && h === H) return;
      W = w; H = h;
      const n = Math.max(1, Math.ceil(h / TILE));
      while (tiles.length < n) { const c = document.createElement("canvas"); c.className = "ink-tile"; layer.appendChild(c); tiles.push({ c, ctx: c.getContext("2d")!, y0: 0, y1: 0 }); }
      while (tiles.length > n) tiles.pop()!.c.remove();
      tiles.forEach((t, i) => {
        const th = Math.min(TILE, h - i * TILE);
        t.c.width = Math.round(w * dpr); t.c.height = Math.round(th * dpr);
        t.c.style.top = i * TILE + "px"; t.c.style.height = th + "px";
        t.ctx.setTransform(dpr, 0, 0, dpr, 0, -i * TILE * dpr);
        t.y0 = i * TILE; t.y1 = i * TILE + th;
      });
      if (!baseW) baseW = w;
      redraw();
    };
    const pos = (e: PointerEvent): [number, number] => {
      const r = layer.getBoundingClientRect(), kk = k();
      return [Math.round(((e.clientX - r.left) / kk) * 10) / 10, Math.round(((e.clientY - r.top) / kk) * 10) / 10];
    };

    // 손가락: 스크롤 + 짧게 누르면 아래 요소 클릭
    let drag: { id: number; y: number; t: number; v: number; x0: number; y0: number; t0: number; moved: boolean } | null = null;
    const tapThrough = (x: number, y: number) => {
      layer.style.pointerEvents = "none";
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      layer.style.pointerEvents = "";
      const target = el?.closest("button, label, input, a, [role=button]") as HTMLElement | null;
      if (target) { target.focus?.(); target.click(); }
    };
    const finger = (e: PointerEvent) => {
      if (e.type === "pointerdown") {
        drag = { id: e.pointerId, y: e.clientY, t: e.timeStamp, v: 0, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, moved: false };
        try { layer.setPointerCapture(e.pointerId); } catch {}
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      if (e.type === "pointermove") {
        const dy = drag.y - e.clientY, dt = Math.max(1, e.timeStamp - drag.t);
        if (Math.abs(e.clientY - drag.y0) > 8 || Math.abs(e.clientX - drag.x0) > 8) drag.moved = true;
        window.scrollBy(0, dy); drag.v = 0.8 * drag.v + 0.2 * (dy / dt); drag.y = e.clientY; drag.t = e.timeStamp;
      } else {
        const d = drag; drag = null;
        if (e.type === "pointerup" && !d.moved && e.timeStamp - d.t0 < 400) { tapThrough(e.clientX, e.clientY); return; }
        let v = d.v * 16;
        const step = () => { if (Math.abs(v) < 0.5 || drag) return; window.scrollBy(0, v); v *= 0.94; requestAnimationFrame(step); };
        if (Math.abs(v) >= 1) requestAnimationFrame(step);
      }
    };

    const down = (e: PointerEvent) => {
      if (!tool.current.on) return;
      e.preventDefault();
      if (e.pointerType === "touch" && !tool.current.finger) return finger(e);
      if (cur || (e.button !== 0 && e.button !== -1)) return;
      try { layer.setPointerCapture(e.pointerId); } catch {}
      const t = tool.current, col = COLORS[t.color];
      const er = t.erase || (e.pointerType === "pen" && e.buttons === 32);
      cur = { id: e.pointerId, s: { c: col.c, w: t.width, h: !!col.hl && !er, e: er, p: [pos(e)] } };
    };
    const move = (e: PointerEvent) => {
      if (!tool.current.on) return;
      if (e.pointerType === "touch" && !tool.current.finger) { e.preventDefault(); return finger(e); }
      if (!cur || e.pointerId !== cur.id) return;
      e.preventDefault();
      const evs = (e.getCoalescedEvents?.() ?? []).length ? e.getCoalescedEvents() : [e];
      for (const ev of evs) cur.s.p.push(pos(ev));
      if (cur.s.e) { strokes.push(cur.s); redraw(); strokes.pop(); }
      else { const seg = { ...cur.s, p: cur.s.p.slice(-3) }; each(seg, (ctx) => drawStroke(ctx, seg, k())); }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType === "touch" && !tool.current.finger) return finger(e);
      if (!cur || e.pointerId !== cur.id) return;
      strokes.push(cur.s); cur = null; redraw(); persist();
    };
    layer.addEventListener("pointerdown", down);
    layer.addEventListener("pointermove", move);
    layer.addEventListener("pointerup", up);
    layer.addEventListener("pointercancel", up);
    const noMenu = (e: Event) => { if (tool.current.on) e.preventDefault(); };
    layer.addEventListener("contextmenu", noMenu);

    api.current = {
      undo: () => { if (strokes.length) { strokes.pop(); redraw(); persist(); } },
      clear: () => { strokes = []; redraw(); persist(); },
    };
    setCount(strokes.length);
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(host);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect(); window.removeEventListener("resize", fit);
      layer.removeEventListener("pointerdown", down); layer.removeEventListener("pointermove", move);
      layer.removeEventListener("pointerup", up); layer.removeEventListener("pointercancel", up);
      layer.removeEventListener("contextmenu", noMenu);
      tiles.forEach((t) => t.c.remove());
    };
  }, [storageKey]);

  return (
    <div className={`ink-host${on ? " ink-on" : ""}${on && finger ? " ink-finger" : ""}`} ref={hostRef}>
      {children}
      <div className="ink-layer" ref={layerRef} aria-hidden="true" />
      <div className={`ink-bar${on ? " open" : ""}`} role="toolbar" aria-label="필기 도구">
        {on && (
          <>
            {COLORS.map((c, i) => (
              <button key={c.c} type="button" title={c.name} aria-pressed={!erase && color === i} onClick={() => { setColor(i); setErase(false); }}>
                <span className={`ink-sw${c.hl ? " hl" : ""}`} style={{ background: c.c === "ink" ? "var(--text)" : c.c }} />
              </button>
            ))}
            <span className="ink-sep" />
            {[1.5, 2.5, 4.5].map((w) => (
              <button key={w} type="button" title={w < 2 ? "가는 펜" : w < 3 ? "보통 펜" : "굵은 펜"} aria-pressed={width === w} onClick={() => setWidth(w)}>
                <span className="ink-dot" style={{ width: w * 2.6, height: w * 2.6 }} />
              </button>
            ))}
            <span className="ink-sep" />
            <button type="button" title="지우개" aria-pressed={erase} onClick={() => setErase(!erase)}>지움</button>
            <button type="button" title="되돌리기" disabled={!count} onClick={() => api.current?.undo()}>↶</button>
            <button type="button" title="이 시험지 필기 전부 지우기" disabled={!count} onClick={() => { if (confirm("이 시험지에 쓴 필기를 전부 지울까?")) api.current?.clear(); }}>전체</button>
            <button type="button" title="켜면 손가락으로도 그려져 (끄면 손가락은 스크롤·보기 누르기)" aria-pressed={finger} onClick={() => setFinger(!finger)}>손</button>
          </>
        )}
        <button type="button" className="ink-toggle" aria-pressed={on} onClick={() => setOn(!on)}>
          {on ? "필기 끄기" : "✏️ 필기"}
        </button>
      </div>
      {on && <p className="ink-hint">펜으로 시험지에 바로 써. 손가락은 스크롤, 톡 누르면 보기 선택.</p>}
    </div>
  );
}
