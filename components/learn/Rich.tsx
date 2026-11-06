"use client";
import katex from "katex";
import { Fragment, useMemo } from "react";

/** $...$ 수식 하나를 KaTeX HTML로 */
function texHtml(src: string, display = false) {
  try {
    return katex.renderToString(src, { throwOnError: false, displayMode: display, strict: "ignore", output: "html" });
  } catch {
    return src;
  }
}

/** 한 줄 안의 $수식$과 **굵게** */
function Inline({ text }: { text: string }) {
  const parts = useMemo(() => {
    const out: { t: "text" | "math" | "bold"; v: string }[] = [];
    const re = /\$([^$]+)\$|\*\*([^*]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
      if (m[1] !== undefined) out.push({ t: "math", v: m[1] });
      else out.push({ t: "bold", v: m[2] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ t: "text", v: text.slice(last) });
    return out;
  }, [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.t === "math" ? <span key={i} className="tex" dangerouslySetInnerHTML={{ __html: texHtml(p.v) }} />
        : p.t === "bold" ? <b key={i}><Inline text={p.v} /></b>
        : <Fragment key={i}>{p.v}</Fragment>,
      )}
    </>
  );
}

/**
 * 짧은 학습용 서식: 빈 줄 = 문단, "- " = 목록, "1. " = 번호 목록, $..$ = 수식, **..** = 굵게.
 * (사용자 입력은 넣지 않는다. 콘텐츠는 앱에 들어 있는 것만)
 */
export default function Rich({ text, className = "" }: { text: string; className?: string }) {
  const blocks = useMemo(() => text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean), [text]);
  return (
    <div className={`rich ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^- /.test(l))) {
          return <ul key={i}>{lines.map((l, k) => <li key={k}><Inline text={l.slice(2)} /></li>)}</ul>;
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return <ol key={i}>{lines.map((l, k) => <li key={k}><Inline text={l.replace(/^\d+\. /, "")} /></li>)}</ol>;
        }
        // 제목 한 줄 + 목록
        if (lines.length > 1 && lines.slice(1).every((l) => /^- /.test(l))) {
          return (
            <div key={i}>
              <p><Inline text={lines[0]} /></p>
              <ul>{lines.slice(1).map((l, k) => <li key={k}><Inline text={l.slice(2)} /></li>)}</ul>
            </div>
          );
        }
        // 해설 머리말: **핵심** … / **풀이** / **주의** …
        const tag = /^\*\*(핵심|풀이|주의)\*\*\s*/.exec(b);
        if (tag) {
          const rest = b.slice(tag[0].length);
          const k = tag[1] === "핵심" ? "core" : tag[1] === "주의" ? "trap" : "step";
          if (!rest) return <p key={i} className="rk-head">{tag[1]}</p>;
          return <p key={i} className={`rk rk-${k}`}><span className="rk-tag">{tag[1]}</span><Inline text={rest} /></p>;
        }
        return <p key={i}>{lines.map((l, k) => <Fragment key={k}>{k > 0 && <br />}<Inline text={l} /></Fragment>)}</p>;
      })}
    </div>
  );
}

/** 보기 하나처럼 한 줄짜리 */
export function RichLine({ text }: { text: string }) {
  return <span className="rich-line"><Inline text={text} /></span>;
}
