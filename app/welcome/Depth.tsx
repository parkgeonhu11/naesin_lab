"use client";
import { useState } from "react";

type Level = { key: string; label: string; html: string };

/** 같은 개념을 세 가지 깊이로: 누르면 설명이 바뀐다 */
export default function Depth({ levels }: { levels: Level[] }) {
  const [lv, setLv] = useState("normal");
  const cur = levels.find((l) => l.key === lv) ?? levels[0];
  return (
    <div>
      <div role="tablist" aria-label="설명 깊이" className="inline-flex gap-1 rounded-xl bg-alt p-1">
        {levels.map((l) => (
          <button key={l.key} type="button" role="tab" aria-selected={lv === l.key} onClick={() => setLv(l.key)}
            className={`min-h-[40px] cursor-pointer rounded-lg border-0 px-4 text-[15px] font-medium transition-colors duration-200 ${lv === l.key ? "bg-ink text-paper!" : "bg-transparent text-sub! hover:text-ink!"}`}>
            {l.label}
          </button>
        ))}
      </div>
      <p role="tabpanel" className="mt-6 min-h-[150px] max-w-[34em] text-[18px] leading-[1.75] text-ink" dangerouslySetInnerHTML={{ __html: cur.html }} />
    </div>
  );
}
