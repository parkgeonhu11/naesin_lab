"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 연습장(그림판): 문제 옆에서 손으로 풀이를 끄적이는 칸.
 * - 펜(검정·파랑·빨강), 형광펜, 지우개, 굵기, 되돌리기/다시하기, 모두 지우기, 모눈
 * - 마우스·터치·펜 모두 됨. 펜을 쓰기 시작하면 손바닥 터치는 무시
 * - 그린 내용은 문제마다 따로, 이 탭을 닫기 전까지 남아 있음 (서버로는 안 보냄)
 */

type Tool = "pen" | "hl" | "eraser";
type Stroke = { tool: Tool; color: string; w: number; pts: number[] }; // pts: x,y 반복 (0~1로 정규화하지 않고 CSS px 기준)
type Pad = { strokes: Stroke[]; redo: Stroke[]; grid: boolean };

const COLORS = [
  { key: "ink", name: "기본" },
  { key: "#2f6bff", name: "파랑" },
  { key: "#e5383b", name: "빨강" },
];
const HL = "rgba(255, 214, 0, .38)";
const memory = new Map<string, Pad>();

function load(key: string): Pad {
  const m = memory.get(key);
  if (m) return m;
  try {
    const raw = sessionStorage.getItem("pad:" + key);
    if (raw) {
      const p = JSON.parse(raw) as Pad;
      memory.set(key, p);
      return p;
    }
  } catch {}
  const p: Pad = { strokes: [], redo: [], grid: true };
  memory.set(key, p);
  return p;
}
function save(key: string, p: Pad) {
  memory.set(key, p);
  try {
    const s = JSON.stringify({ strokes: p.strokes, redo: [], grid: p.grid });
    if (s.length < 1_500_000) sessionStorage.setItem("pad:" + key, s);
  } catch {}
}

export default function Scratchpad({ padKey, overlay = false, onClose }: { padKey: string; overlay?: boolean; onClose?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<Pad>({ strokes: [], redo: [], grid: true });
  const cur = useRef<Stroke | null>(null);
  const penSeen = useRef(false);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("ink");
  const [size, setSize] = useState<1 | 2>(1);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const inkColor = () => getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#111";

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ink = inkColor();
    const all = cur.current ? [...padRef.current.strokes, cur.current] : padRef.current.strokes;
    for (const s of all) {
      if (s.pts.length < 2) continue;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = s.w;
      if (s.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "#000";
      } else {
        ctx.strokeStyle = s.tool === "hl" ? HL : s.color === "ink" ? ink : s.color;
      }
      ctx.beginPath();
      ctx.moveTo(s.pts[0], s.pts[1]);
      if (s.pts.length === 2) ctx.lineTo(s.pts[0] + 0.01, s.pts[1]);
      // 부드러운 선: 중간점을 지나는 2차 곡선
      for (let i = 2; i < s.pts.length - 2; i += 2) {
        const mx = (s.pts[i] + s.pts[i + 2]) / 2, my = (s.pts[i + 1] + s.pts[i + 3]) / 2;
        ctx.quadraticCurveTo(s.pts[i], s.pts[i + 1], mx, my);
      }
      const n = s.pts.length;
      ctx.lineTo(s.pts[n - 2], s.pts[n - 1]);
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // 문제가 바뀌면 그 문제의 연습장을 불러온다
  useEffect(() => {
    padRef.current = load(padKey);
    cur.current = null;
    rerender();
    draw();
  }, [padKey, draw]);

  // 칸 크기에 맞춰 캔버스 해상도 조정 (선은 좌표로 저장돼 있어서 다시 그리면 됨)
  useEffect(() => {
    const wrap = wrapRef.current, c = canvasRef.current;
    if (!wrap || !c) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      c.style.width = r.width + "px";
      c.style.height = r.height + "px";
      draw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    // 밝은/어두운 화면이 바뀌면 기본 잉크 색을 다시 칠함
    const mo = new MutationObserver(draw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [draw]);

  const width = () => (tool === "eraser" ? (size === 1 ? 16 : 34) : tool === "hl" ? (size === 1 ? 14 : 24) : size === 1 ? 2.2 : 4.5);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "pen") penSeen.current = true;
    if (e.pointerType === "touch" && penSeen.current) return; // 펜 쓰는 중 손바닥 무시
    if (e.button > 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    cur.current = { tool, color, w: width(), pts: pos(e) };
    draw();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cur.current) return;
    const evs = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent];
    const r = canvasRef.current!.getBoundingClientRect();
    for (const ev of evs.length ? evs : [e.nativeEvent]) cur.current.pts.push(ev.clientX - r.left, ev.clientY - r.top);
    draw();
  };
  const up = () => {
    if (!cur.current) return;
    const p = padRef.current;
    p.strokes = [...p.strokes, cur.current];
    p.redo = [];
    cur.current = null;
    save(padKey, p);
    draw();
    rerender();
  };

  const undo = () => {
    const p = padRef.current;
    if (!p.strokes.length) return;
    p.redo = [...p.redo, p.strokes[p.strokes.length - 1]];
    p.strokes = p.strokes.slice(0, -1);
    save(padKey, p);
    draw();
    rerender();
  };
  const redo = () => {
    const p = padRef.current;
    if (!p.redo.length) return;
    p.strokes = [...p.strokes, p.redo[p.redo.length - 1]];
    p.redo = p.redo.slice(0, -1);
    save(padKey, p);
    draw();
    rerender();
  };
  const clear = () => {
    const p = padRef.current;
    if (!p.strokes.length) return;
    p.redo = [...p.strokes].reverse(); // 모두 지우기도 되돌리기로 살릴 수 있게
    p.strokes = [];
    save(padKey, p);
    draw();
    rerender();
  };
  const toggleGrid = () => {
    const p = padRef.current;
    p.grid = !p.grid;
    save(padKey, p);
    rerender();
  };

  // Ctrl+Z / Ctrl+Shift+Z (입력 칸에 글 쓰는 중이 아닐 때)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!wrapRef.current || wrapRef.current.offsetParent === null) return; // 화면에 안 보이는 연습장은 무시
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const p = padRef.current;
  return (
    <section className={`panel pad ${overlay ? "pad-overlay" : ""}`} aria-label="연습장">
      <div className="pad-bar">
        <b className="pad-title">연습장</b>
        <div className="pad-tools" role="toolbar" aria-label="그리기 도구">
          {COLORS.map((c) => (
            <button key={c.key} type="button" className={`pad-btn pad-color ${tool === "pen" && color === c.key ? "on" : ""}`} title={`펜 (${c.name})`} aria-label={`펜 ${c.name}`}
              onClick={() => { setTool("pen"); setColor(c.key); }}>
              <i style={{ background: c.key === "ink" ? "var(--text)" : c.key }} />
            </button>
          ))}
          <button type="button" className={`pad-btn ${tool === "hl" ? "on" : ""}`} title="형광펜" aria-label="형광펜" onClick={() => setTool("hl")}>
            <svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 20h7" stroke="#e8b400" strokeWidth="3" strokeLinecap="round" /><path d="M14.5 4.5l5 5L11 18H6v-5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className={`pad-btn ${tool === "eraser" ? "on" : ""}`} title="지우개" aria-label="지우개" onClick={() => setTool("eraser")}>
            <svg viewBox="0 0 24 24" width="17" height="17"><path d="M8 20h12M5.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 19H8.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="pad-btn" title={size === 1 ? "굵게" : "가늘게"} aria-label="굵기 바꾸기" onClick={() => setSize(size === 1 ? 2 : 1)}>
            <span className={`pad-size s${size}`} />
          </button>
          <span className="pad-sep" />
          <button type="button" className="pad-btn" title="되돌리기 (Ctrl+Z)" aria-label="되돌리기" disabled={!p.strokes.length} onClick={undo}>
            <svg viewBox="0 0 24 24" width="17" height="17"><path d="M9 14L4 9l5-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
          </button>
          <button type="button" className="pad-btn" title="다시하기 (Ctrl+Shift+Z)" aria-label="다시하기" disabled={!p.redo.length} onClick={redo}>
            <svg viewBox="0 0 24 24" width="17" height="17"><path d="M15 14l5-5-5-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 9H10a6 6 0 0 0 0 12h3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
          </button>
          <button type="button" className={`pad-btn ${p.grid ? "on" : ""}`} title="모눈 켜기/끄기" aria-label="모눈" onClick={toggleGrid}>
            <svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
          <button type="button" className="pad-btn pad-clear" title="모두 지우기" aria-label="모두 지우기" disabled={!p.strokes.length} onClick={clear}>지우기</button>
          {overlay && onClose && <button type="button" className="pad-btn pad-close" onClick={onClose}>닫기</button>}
        </div>
      </div>
      <div ref={wrapRef} className={`pad-area ${p.grid ? "grid" : ""} tool-${tool}`}>
        <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => { if (e.buttons === 0) up(); }} />
        {!p.strokes.length && !cur.current && <span className="pad-empty">여기에 풀이를 끄적여 봐 ✏️<br /><small>문제마다 따로 저장돼 · 서버로는 안 보내</small></span>}
      </div>
    </section>
  );
}
