"use client";
import katex from "katex";
import { useMemo, useState } from "react";

/** 수식 조각 */
function K({ t, block = false }: { t: string; block?: boolean }) {
  const html = useMemo(() => {
    try { return katex.renderToString(t, { throwOnError: false, displayMode: block, output: "html" }); } catch { return t; }
  }, [t, block]);
  return <span className={block ? "tex tex-block" : "tex"} dangerouslySetInnerHTML={{ __html: html }} />;
}

const sgn = (n: number, first = false) => (n < 0 ? "-" : first ? "" : "+");
/** 계수 배열(내림차순) → TeX */
function polyTex(cs: number[], v = "x") {
  const d = cs.length - 1;
  let s = "";
  cs.forEach((c, i) => {
    if (c === 0) return;
    const p = d - i;
    const a = Math.abs(c);
    const coef = p === 0 ? String(a) : a === 1 ? "" : String(a);
    const mono = p === 0 ? "" : p === 1 ? v : `${v}^{${p}}`;
    s += `${sgn(c, s === "")}${coef}${mono}`;
  });
  return s || "0";
}

// ---------- 1. 항·계수·차수 ----------
const TERMS = [
  { tex: "3x^2", coef: "3", deg: "2", note: "가장 차수가 높은 항이라서 이 식은 이차식이야." },
  { tex: "-5x", coef: "-5", deg: "1", note: "계수에는 부호까지 포함돼. 5가 아니라 −5야." },
  { tex: "+2", coef: "2", deg: "0", note: "문자가 없는 항 = 상수항. 차수는 0이야." },
];
function TermsVisual() {
  const [pick, setPick] = useState(0);
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const list = order === "desc" ? TERMS : [...TERMS].reverse();
  const t = TERMS[pick];
  return (
    <div className="viz viz-terms">
      <div className="viz-terms-row" role="group" aria-label="항 고르기">
        {list.map((x, i) => {
          const idx = TERMS.indexOf(x);
          const tex = i === 0 ? x.tex.replace(/^\+/, "") : /^[-+]/.test(x.tex) ? x.tex : `+${x.tex}`;
          return (
            <button key={x.tex} type="button" className={`term-chip${idx === pick ? " on" : ""}`} onClick={() => setPick(idx)}>
              <K t={tex} />
            </button>
          );
        })}
      </div>
      <div className="viz-info">
        <div><small>항</small><b><K t={t.tex.replace(/^\+/, "")} /></b></div>
        <div><small>계수</small><b>{t.coef}</b></div>
        <div><small>차수</small><b>{t.deg}</b></div>
      </div>
      <p className="viz-note">{t.note}</p>
      <div className="seg small" role="radiogroup" aria-label="정리 순서">
        <button type="button" role="radio" aria-checked={order === "desc"} onClick={() => setOrder("desc")}>내림차순</button>
        <button type="button" role="radio" aria-checked={order === "asc"} onClick={() => setOrder("asc")}>오름차순</button>
      </div>
    </div>
  );
}

// ---------- 2. 세로셈 (덧셈·뺄셈) ----------
function ColumnsVisual() {
  const A = [2, 3, -1];
  const B = [1, -1, 4];
  const [minus, setMinus] = useState(false);
  const Bs = minus ? B.map((c) => -c) : B;
  const R = A.map((c, i) => c + Bs[i]);
  const heads = ["x^2", "x", "\\text{상수}"];
  const cell = (c: number, i: number, flip = false) => (
    <td key={i} className={flip ? "flip" : ""}><K t={`${c < 0 ? "-" : "+"}${Math.abs(c)}${i === 2 ? "" : heads[i]}`} /></td>
  );
  return (
    <div className="viz viz-cols">
      <div className="seg small" role="radiogroup" aria-label="계산">
        <button type="button" role="radio" aria-checked={!minus} onClick={() => setMinus(false)}>A + B</button>
        <button type="button" role="radio" aria-checked={minus} onClick={() => setMinus(true)}>A − B</button>
      </div>
      <table className="cols-tbl">
        <thead><tr><th /><th><K t="x^2" /></th><th><K t="x" /></th><th>상수</th></tr></thead>
        <tbody>
          <tr><th>A</th>{A.map((c, i) => cell(c, i))}</tr>
          <tr><th>{minus ? "−B" : "+B"}</th>{Bs.map((c, i) => cell(c, i, minus))}</tr>
          <tr className="sum"><th>=</th>{R.map((c, i) => cell(c, i))}</tr>
        </tbody>
      </table>
      <p className="viz-note">
        {minus ? <>빼기는 <b>B의 부호를 전부 바꿔서 더하기</b>야. 노란 칸을 봐.</> : <>같은 열(같은 차수)끼리만 더해.</>}{" "}
        결과: <K t={polyTex(R)} />
      </p>
    </div>
  );
}

// ---------- 3. 넓이로 보는 (a+b)² ----------
function AreaVisual() {
  const [a, setA] = useState(4);
  const [b, setB] = useState(2);
  const S = 220;
  const u = S / (a + b);
  const A = a * u;
  return (
    <div className="viz viz-area">
      <svg viewBox={`0 0 ${S + 40} ${S + 40}`} role="img" aria-label={`한 변이 ${a}+${b}인 정사각형을 네 조각으로 나눈 그림`}>
        <g transform="translate(30,10)">
          <rect x={0} y={0} width={A} height={A} className="r-a" />
          <rect x={A} y={0} width={S - A} height={A} className="r-ab" />
          <rect x={0} y={A} width={A} height={S - A} className="r-ab" />
          <rect x={A} y={A} width={S - A} height={S - A} className="r-b" />
          <text x={A / 2} y={A / 2 + 5} textAnchor="middle">a² = {a * a}</text>
          <text x={A + (S - A) / 2} y={A / 2 + 5} textAnchor="middle">ab = {a * b}</text>
          <text x={A / 2} y={A + (S - A) / 2 + 5} textAnchor="middle">ab = {a * b}</text>
          <text x={A + (S - A) / 2} y={A + (S - A) / 2 + 5} textAnchor="middle">{S - A > 34 ? `b² = ${b * b}` : `${b * b}`}</text>
          <text x={A / 2} y={S + 20} textAnchor="middle" className="dim">a = {a}</text>
          <text x={A + (S - A) / 2} y={S + 20} textAnchor="middle" className="dim">b = {b}</text>
        </g>
      </svg>
      <div className="viz-sliders">
        <label>a <input type="range" min={1} max={6} value={a} onChange={(e) => setA(+e.target.value)} aria-label="a 값" /> <b>{a}</b></label>
        <label>b <input type="range" min={1} max={6} value={b} onChange={(e) => setB(+e.target.value)} aria-label="b 값" /> <b>{b}</b></label>
      </div>
      <p className="viz-note center">
        <K t={`(${a}+${b})^2=${(a + b) ** 2}`} /> 이고 <K t={`${a * a}+${a * b}+${a * b}+${b * b}=${a * a + 2 * a * b + b * b}`} />
        <br />주황색 직사각형이 <b>두 개</b>라서 가운데 항이 <K t="2ab" />야.
      </p>
    </div>
  );
}

// ---------- 4. 조립제법 한 칸씩 ----------
const SYN_SETS = [
  { cs: [2, -3, 0, 4], r: 1 },
  { cs: [1, -2, 0, 5], r: 2 },
  { cs: [1, 3, -2, 5], r: -2 },
];
function SyntheticVisual() {
  const [set, setSet] = useState(0);
  const [step, setStep] = useState(0);
  const { cs, r } = SYN_SETS[set];
  const bottom: number[] = [];
  const mid: (number | null)[] = [null];
  cs.forEach((c, i) => {
    if (i === 0) bottom.push(c);
    else { mid.push(bottom[i - 1] * r); bottom.push(c + bottom[i - 1] * r); }
  });
  const last = cs.length * 2 - 1; // 단계 수
  // step 0: 처음. 1: 첫 계수 내리기. 이후 (곱해서 올리기, 더해서 내리기) 반복
  const shownBottom = (i: number) => (i === 0 ? step >= 1 : step >= 2 * i + 1);
  const shownMid = (i: number) => i > 0 && step >= 2 * i;
  const say = (() => {
    if (step === 0) return `왼쪽에 ${r}, 오른쪽에 계수 ${cs.join(", ")}를 써. (빠진 차수는 0)`;
    if (step === 1) return `맨 앞 계수 ${cs[0]}를 그대로 내려.`;
    const i = Math.floor(step / 2);
    if (step % 2 === 0) return `내린 수 ${bottom[i - 1]} × ${r} = ${mid[i]} 을 다음 칸 위에 써.`;
    return `${cs[i]} + (${mid[i]}) = ${bottom[i]} 을 내려.` + (i === cs.length - 1 ? " 마지막 수가 나머지야!" : "");
  })();
  const done = step >= last;
  return (
    <div className="viz viz-syn">
      <div className="seg small" role="radiogroup" aria-label="예제 고르기">
        {SYN_SETS.map((s, i) => (
          <button key={i} type="button" role="radio" aria-checked={set === i} onClick={() => { setSet(i); setStep(0); }}>
            예제 {i + 1}
          </button>
        ))}
      </div>
      <p className="viz-note center"><K t={`(${polyTex(cs)})\\div(x${r > 0 ? "-" : "+"}${Math.abs(r)})`} /></p>
      <div className="syn-grid" style={{ gridTemplateColumns: `48px repeat(${cs.length}, 1fr)` }}>
        <div className="syn-r">{r}</div>
        {cs.map((c, i) => <div key={`c${i}`} className="syn-c">{c}</div>)}
        <div />
        {cs.map((_, i) => <div key={`m${i}`} className={`syn-m${shownMid(i) ? " on" : ""}`}>{shownMid(i) ? mid[i] : ""}</div>)}
        <div />
        {cs.map((_, i) => (
          <div key={`b${i}`} className={`syn-b${shownBottom(i) ? " on" : ""}${i === cs.length - 1 ? " rem" : ""}`}>{shownBottom(i) ? bottom[i] : ""}</div>
        ))}
      </div>
      <p className="viz-note" aria-live="polite">{say}</p>
      {done && (
        <p className="viz-note ok">
          몫 <K t={polyTex(bottom.slice(0, -1))} />, 나머지 <b>{bottom[bottom.length - 1]}</b>
        </p>
      )}
      <div className="viz-steps">
        <button type="button" className="btn line" onClick={() => setStep(0)} disabled={step === 0}>처음</button>
        <button type="button" className="btn line" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>이전</button>
        <button type="button" className="btn" onClick={() => setStep((s) => Math.min(last, s + 1))} disabled={done}>다음</button>
      </div>
    </div>
  );
}

// ---------- 5. 항등식 vs 방정식 ----------
function IdentityVisual() {
  const [x, setX] = useState(0);
  const rows = [
    { name: "항등식", l: "2(x+1)", r: "2x+2", lv: 2 * (x + 1), rv: 2 * x + 2 },
    { name: "방정식", l: "x+1", r: "3", lv: x + 1, rv: 3 },
  ];
  return (
    <div className="viz viz-ident">
      <label className="viz-x">
        <span><K t="x" /> =</span>
        <input type="range" min={-4} max={4} value={x} onChange={(e) => setX(+e.target.value)} aria-label="x 값" />
        <b>{x}</b>
      </label>
      {rows.map((r) => (
        <div key={r.name} className={`ident-row${r.lv === r.rv ? " eq" : " ne"}`}>
          <small>{r.name}</small>
          <span><K t={r.l} /> = <b>{r.lv}</b></span>
          <span className="ident-sign">{r.lv === r.rv ? "=" : "≠"}</span>
          <span><K t={r.r} /> = <b>{r.rv}</b></span>
        </div>
      ))}
      <p className="viz-note">항등식은 슬라이더를 어디에 둬도 초록색이야. 방정식은 <K t="x=2" />일 때만 초록색이 돼.</p>
    </div>
  );
}

// ---------- 6. 나머지 = P(a) ----------
function RemainderVisual() {
  const cs = [1, -2, -5, 6]; // (x-1)(x+2)(x-3)
  const [a, setA] = useState(2);
  const bottom: number[] = [];
  cs.forEach((c, i) => bottom.push(i === 0 ? c : c + bottom[i - 1] * a));
  const rem = bottom[bottom.length - 1];
  const pa = cs.reduce((s, c, i) => s + c * a ** (cs.length - 1 - i), 0);
  const pa_ = a < 0 ? `(${a})` : `${a}`;
  return (
    <div className="viz viz-rem">
      <p className="viz-note center"><K t={`P(x)=${polyTex(cs)}`} /></p>
      <label className="viz-x">
        <span><K t="a" /> =</span>
        <input type="range" min={-3} max={4} value={a} onChange={(e) => setA(+e.target.value)} aria-label="a 값" />
        <b>{a}</b>
      </label>
      <div className="rem-two">
        <div><small>조립제법으로 나눈 나머지</small><b>{rem}</b><span className="faint small">{bottom.join(" → ")}</span></div>
        <div><small>값을 넣은 <K t={`P(${a})`} /></small><b>{pa}</b><span className="faint small"><K t={`${pa_}^3-2\\cdot${pa_}^2-5\\cdot${pa_}+6`} /></span></div>
      </div>
      <p className={`viz-note center${rem === 0 ? " ok" : ""}`}>
        {rem === 0
          ? <>나머지가 0! 그러니까 <K t={`x${a > 0 ? "-" : a < 0 ? "+" : ""}${a === 0 ? "" : Math.abs(a)}`} />는 <b>인수</b>야 (인수정리).</>
          : <>두 값이 항상 같아. 나머지를 구할 땐 나누지 말고 <b>값을 넣어</b>.</>}
      </p>
    </div>
  );
}

// ---------- 7. 두 수 찾기 ----------
const FACT_SETS = [
  { b: 5, c: 6 }, { b: -1, c: -6 }, { b: 2, c: -15 }, { b: -7, c: 12 },
];
function FactorVisual() {
  const [set, setSet] = useState(0);
  const [pick, setPick] = useState<[number, number] | null>(null);
  const { b, c } = FACT_SETS[set];
  const pairs = useMemo(() => {
    const out: [number, number][] = [];
    for (let p = -Math.abs(c); p <= Math.abs(c); p++) {
      if (p === 0 || c % p !== 0) continue;
      const q = c / p;
      if (p <= q) out.push([p, q]);
    }
    return out;
  }, [c]);
  const ok = pick && pick[0] + pick[1] === b;
  const f = (n: number) => `(x${n < 0 ? "-" : "+"}${Math.abs(n)})`;
  return (
    <div className="viz viz-fact">
      <div className="seg small" role="radiogroup" aria-label="식 고르기">
        {FACT_SETS.map((s, i) => (
          <button key={i} type="button" role="radio" aria-checked={set === i} onClick={() => { setSet(i); setPick(null); }}>
            <K t={polyTex([1, s.b, s.c])} />
          </button>
        ))}
      </div>
      <p className="viz-note center">곱해서 <b>{c}</b>, 더해서 <b>{b}</b>인 두 수는?</p>
      <div className="pair-list">
        {pairs.map(([p, q]) => {
          const on = pick && pick[0] === p && pick[1] === q;
          const good = p + q === b;
          return (
            <button key={`${p},${q}`} type="button" className={`pair${on ? (good ? " good" : " bad") : ""}`} onClick={() => setPick([p, q])}>
              {p} , {q}
              {on && <small>합 {p + q}</small>}
            </button>
          );
        })}
      </div>
      <p className={`viz-note center${ok ? " ok" : ""}`} aria-live="polite">
        {ok && pick ? <>찾았어! <K t={`${polyTex([1, b, c])}=${f(pick[0])}${f(pick[1])}`} /></> : pick ? "합이 맞지 않아. 다른 짝을 눌러 봐." : "짝을 하나씩 눌러 봐."}
      </p>
    </div>
  );
}

const MAP: Record<string, () => React.JSX.Element> = {
  terms: TermsVisual,
  columns: ColumnsVisual,
  area: AreaVisual,
  synthetic: SyntheticVisual,
  identity: IdentityVisual,
  remainder: RemainderVisual,
  factor: FactorVisual,
};

export default function Visual({ name }: { name: string }) {
  const C = MAP[name];
  return C ? <C /> : null;
}
