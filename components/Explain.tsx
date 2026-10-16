import { EXPLAIN_FIGS } from "@/lib/explainFigs";

/** 해설 글. [[그림:키]] 자리에는 lib/explainFigs.ts의 그림을 넣고, 나머지는 글자 그대로 보여 준다. */
export default function Explain({ text, className = "statement", style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const parts = text.split(/\[\[그림:([\w-]+)\]\]/);
  if (parts.length === 1) return <p className={className} style={style}>{text}</p>;
  return (
    <div className="explain-body">
      {parts.map((p, i) => {
        if (i % 2 === 1) {
          const svg = EXPLAIN_FIGS[p];
          return svg ? (
            <figure key={i} className="qfig">
              <div className="qfig-svg" dangerouslySetInnerHTML={{ __html: svg }} />
            </figure>
          ) : null;
        }
        const t = p.replace(/^\n+|\n+$/g, "");
        return t ? <p key={i} className={className} style={style}>{t}</p> : null;
      })}
    </div>
  );
}
