"use client";
import { useMemo } from "react";
import { figureSvg, type FigureSpec } from "@/lib/figure";

/** 문제 그림. spec(좌표 설명)을 SVG로 그려서 보여 준다. 글자는 모두 이스케이프돼 있어서 안전함 */
export default function Figure({ spec, className = "" }: { spec: FigureSpec | null | undefined; className?: string }) {
  const svg = useMemo(() => {
    if (!spec || typeof spec !== "object" || !spec.p) return "";
    try { return figureSvg(spec); } catch { return ""; }
  }, [spec]);
  if (!svg) return null;
  return (
    <figure className={`qfig ${className}`}>
      <div className="qfig-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      {spec?.note && <figcaption>{spec.note}</figcaption>}
    </figure>
  );
}
