"use client";
import DOMPurify from "dompurify";
import { useMemo } from "react";

/**
 * 해설 글. 글 안에 <svg>…</svg> 가 있으면 그 자리에 그림으로 보여 주고, 나머지는 글자 그대로 보여 준다.
 * 그림은 DOMPurify(SVG 전용 규칙)로 걸러서 스크립트·이벤트 같은 위험한 건 모두 빠진다.
 * 해설은 문제를 풀거나 정답을 확인한 뒤에만 서버에서 내려오니까 그림 속 답도 미리 새지 않는다.
 */
const SVG_RE = /(<svg[\s\S]*?<\/svg>)/i;

function clean(svg: string) {
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: false },
    FORBID_TAGS: ["foreignObject", "script", "style", "a", "image", "use", "animate", "set"],
    FORBID_ATTR: ["href", "xlink:href"],
  });
}

export default function Explain({ text, className = "statement", style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const parts = useMemo(() => text.split(SVG_RE).map((p, i) => (i % 2 === 1 ? { svg: clean(p) } : { t: p.replace(/^\n+|\n+$/g, "") })), [text]);
  if (parts.length === 1) return <p className={className} style={style}>{text}</p>;
  return (
    <div className="explain-body">
      {parts.map((p, i) =>
        "svg" in p ? (
          p.svg ? (
            <figure key={i} className="qfig">
              <div className="qfig-svg" dangerouslySetInnerHTML={{ __html: p.svg }} />
            </figure>
          ) : null
        ) : p.t ? (
          <p key={i} className={className} style={style}>{p.t}</p>
        ) : null,
      )}
    </div>
  );
}
