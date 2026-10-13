"use client";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";

/**
 * 최상위 문제 복사 방지.
 * - 글자 사이사이에 눈에 안 보이는 가짜 글자(숫자·기호)를 끼워 넣는다.
 *   드래그해서 끌어다 놓거나, 화면 글자를 읽어 가는 프로그램이 가져가면 숫자가 뒤죽박죽이 된다.
 * - 복사(Ctrl+C, 길게 눌러 복사)하면 클립보드에 뒤섞인 글자와 안내 문구만 들어간다.
 * - 사진(스크린샷)을 찍어 가는 건 막을 수 없다. 그건 풀이 기록(시간·화면 이탈)으로 잡는다.
 */

export const isGuarded = (q: { difficulty?: number | null }) => (q.difficulty ?? 0) >= 5;

const JUNK = "0123456789+-=×÷√π²³/()ABCDHOPxy가나다라마바사";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Part = { t: string; junk: boolean };

/** 진짜 글자 조각과 가짜 글자 조각을 번갈아 만든다 (같은 문제는 항상 같은 모양 → 화면 깜빡임 없음) */
function split(text: string, seed: string): Part[] {
  const r = rng(hash(seed + "|" + text));
  const out: Part[] = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    const isNum = /[0-9]/.test(ch);
    // 숫자 바로 뒤에는 거의 항상, 그 밖에는 가끔 가짜 글자를 끼운다
    if (ch !== "\n" && (isNum ? r() < 0.85 : r() < 0.28)) {
      out.push({ t: buf, junk: false });
      buf = "";
      let j = "";
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) j += JUNK[Math.floor(r() * JUNK.length)];
      out.push({ t: j, junk: true });
    }
  }
  if (buf) out.push({ t: buf, junk: false });
  return out;
}

const NOTICE = "\n\n[내신랩] 최상위 문제는 복사할 수 없어. 직접 풀어 보자!";

export function GuardedText({
  text,
  seed,
  on,
  as = "p",
  className,
  style,
  hookCopy = as === "p",
}: {
  text: string;
  seed: string;
  on: boolean;
  as?: "p" | "span";
  className?: string;
  style?: CSSProperties;
  /** 복사 가로채기 (문제 본문에서만; 보기는 가짜 글자만) */
  hookCopy?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const parts = useMemo(() => (on ? split(text, seed) : []), [on, text, seed]);
  const garbled = useMemo(() => parts.map((p) => p.t).join(""), [parts]);

  // 선택 범위에 이 문제가 조금이라도 걸쳐 있으면 클립보드를 뒤섞인 글자로 바꾼다 (전체 선택 후 복사 포함)
  useEffect(() => {
    if (!on || !hookCopy) return;
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      const el = ref.current;
      if (!sel || !el || sel.isCollapsed || !sel.containsNode(el, true)) return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", garbled + NOTICE);
      e.clipboardData?.setData("text/html", "");
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
    };
  }, [on, hookCopy, garbled]);

  const Tag = as;
  if (!on) return <Tag className={className} style={style}>{text}</Tag>;
  return (
    <Tag
      ref={ref as never}
      className={(className ? className + " " : "") + "guarded"}
      style={style}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {parts.map((p, i) =>
        p.junk ? (
          <span key={i} className="gz" aria-hidden="true">{p.t}</span>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </Tag>
  );
}
