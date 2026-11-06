"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import Rich from "@/components/learn/Rich";
import Runner, { type RunResult } from "@/components/learn/Runner";
import Visual from "@/components/learn/Visuals";
import { itemsOf, unitBySlug } from "@/lib/learn/units";
import { PASS, useLearn } from "@/lib/learn/useLearn";
import { LEVELS, type Card, type Level } from "@/lib/learn/types";

const KIND: Record<Card["kind"], string> = { why: "왜 배워?", picture: "비유와 그림", example: "쉬운 예제", try: "직접 해보기" };
const LV_KEY = "nl-learn-level";
const norm = (s: string) => s.replace(/\s+/g, "").replace(/[−–]/g, "-").toLowerCase();

/** 직접 해보기: 화면에서 바로 확인 (점수 없음) */
function Practice({ p }: { p: NonNullable<Card["practice"]> }) {
  const [v, setV] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "no">("idle");
  const [hint, setHint] = useState(false);
  const [sol, setSol] = useState(false);
  useEffect(() => { setV(""); setState("idle"); setHint(false); setSol(false); }, [p]);
  const check = () => setState(p.answers.some((a) => norm(a) === norm(v)) ? "ok" : "no");
  return (
    <div className={`practice ${state}`}>
      <Rich text={p.prompt} />
      <div className="practice-row">
        <input className="input" value={v} placeholder={p.placeholder ?? "답"} inputMode="text" onChange={(e) => { setV(e.target.value); setState("idle"); }} onKeyDown={(e) => { if (e.key === "Enter") check(); }} aria-label="답 입력" />
        <button type="button" className="btn" onClick={check} disabled={!v.trim()}>확인</button>
      </div>
      {state === "ok" && <p className="practice-msg ok">맞았어! 👏</p>}
      {state === "no" && <p className="practice-msg no">아직이야. 다시 해 봐.</p>}
      <div className="practice-more">
        {!hint && state !== "ok" && <button type="button" className="link-btn" onClick={() => setHint(true)}>힌트</button>}
        {hint && state !== "ok" && <span className="small"><Rich text={p.hint} /></span>}
        {!sol && <button type="button" className="link-btn" onClick={() => setSol(true)}>풀이 보기</button>}
      </div>
      {sol && <div className="practice-sol"><Rich text={p.solution} /></div>}
    </div>
  );
}

export default function LessonPage() {
  const { unit, n } = useParams<{ unit: string; n: string }>();
  const u = unitBySlug(unit);
  const lesson = u?.lessons.find((l) => String(l.no) === n) ?? null;
  const { status, reload } = useLearn(u);
  const [step, setStep] = useState(0);          // 0..cards.length-1 = 카드, cards.length = 확인 문제, +1 = 결과
  const [level, setLevel] = useState<Level>("normal");
  const [stuck, setStuck] = useState(0);        // 이 카드에서 '아직 모르겠어'를 누른 횟수
  const [quiz, setQuiz] = useState<RunResult[] | null>(null);
  const [quizRun, setQuizRun] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => { try { const v = localStorage.getItem(LV_KEY) as Level | null; if (v && LEVELS.some((l) => l.key === v)) setLevel(v); } catch {} }, []);
  useEffect(() => { setStep(0); setQuiz(null); }, [n]);
  useEffect(() => { setStuck(0); top.current?.scrollIntoView({ block: "start" }); }, [step]);

  if (!u || !lesson) return <p className="muted">없는 레슨이야. <Link className="link" href="/learn">수학 학습으로</Link></p>;
  const cards = lesson.cards;
  const quizItems = itemsOf(u, "concept", { lesson: lesson.id });
  const total = cards.length + 1;
  const card = step < cards.length ? cards[step] : null;
  const nextLesson = u.lessons.find((l) => l.no === lesson.no + 1);
  const passedBefore = (status?.concept[lesson.id]?.ok ?? 0) >= PASS.conceptOk;

  const pickLevel = (lv: Level) => { setLevel(lv); try { localStorage.setItem(LV_KEY, lv); } catch {} };
  const notYet = () => {
    setStuck((x) => x + 1);
    if (level === "deep") pickLevel("normal");
    else if (level === "normal") pickLevel("easy");
  };

  return (
    <div className="lesson" ref={top}>
      <div className="learn-crumb">
        <Link href={`/learn/${u.slug}`}><Icon name="back" size={16} /> {u.title}</Link>
        <span>개념 {lesson.no} / {u.lessons.length}</span>
      </div>
      <header className="lesson-head">
        <h1>{lesson.title}</h1>
        <p className="muted small">{lesson.goal}</p>
        <div className="lesson-steps" aria-label={`${Math.min(step + 1, total)} / ${total}`}>
          {cards.map((c, i) => (
            <button key={i} type="button" className={`ls${i < step ? " done" : i === step ? " now" : ""}`} onClick={() => setStep(i)} aria-label={KIND[c.kind]}>
              <span />{KIND[c.kind]}
            </button>
          ))}
          <button type="button" className={`ls${step >= cards.length ? " now" : ""}`} onClick={() => setStep(cards.length)}><span />확인 문제</button>
        </div>
      </header>

      {card && (
        <article className={`lcard k-${card.kind}`}>
          <div className="lcard-top">
            <span className="lcard-kind">{KIND[card.kind]}</span>
            <div className="lvl" role="radiogroup" aria-label="설명 깊이">
              {LEVELS.map((l) => (
                <button key={l.key} type="button" role="radio" aria-checked={level === l.key} title={l.desc} onClick={() => pickLevel(l.key)}>{l.label}</button>
              ))}
            </div>
          </div>
          <h2>{card.title}</h2>
          <div key={level} className="lcard-body fade-in"><Rich text={card.body[level]} /></div>
          {card.visual && <Visual name={card.visual} />}
          {card.practice && <Practice p={card.practice} />}
          {stuck > 0 && level === "easy" && (
            <div className="stuck-tip">
              <b>그래도 어렵다면</b>
              <ul>
                <li>{card.kind === "why" ? "일단 다음 카드로 넘어가도 괜찮아. 예제를 보면 감이 와." : "바로 다음 '쉬운 예제' 카드를 먼저 보고 다시 와도 돼."}</li>
                <li>앞 레슨이 흐릿하면 <Link className="link" href={`/learn/${u.slug}/lesson/${Math.max(1, lesson.no - 1)}`}>이전 레슨</Link>을 빠르게 다시 봐.</li>
              </ul>
            </div>
          )}
          <div className="lcard-actions">
            {step > 0 && <button type="button" className="btn line" onClick={() => setStep(step - 1)}>이전</button>}
            {level !== "easy" || stuck === 0
              ? <button type="button" className="btn line" onClick={notYet}>아직 모르겠어</button>
              : null}
            <button type="button" className="btn big grow" onClick={() => setStep(step + 1)}>
              {step + 1 < cards.length ? "이해했어, 다음" : "확인 문제 풀기"}
            </button>
          </div>
        </article>
      )}

      {step === cards.length && !quiz && (
        <article className="lcard quiz">
          <div className="lcard-top"><span className="lcard-kind">확인 문제</span>{passedBefore && <span className="ok small">이미 통과한 레슨이야</span>}</div>
          <h2>방금 배운 걸 확인해 보자</h2>
          <p className="muted small">5문제 중 {PASS.conceptOk}문제 이상 맞히면 이 레슨 통과! 틀려도 바로 다시 풀 수 있어.</p>
          <Runner key={quizRun} items={quizItems} mode="learn" compact label="확인" onDone={(r) => { setQuiz(r); reload(); }} />
        </article>
      )}

      {quiz && (() => {
        const ok = quiz.filter((r) => r.credited).length;
        const pts = quiz.reduce((t, r) => t + r.points, 0);
        const pass = ok >= PASS.conceptOk;
        return (
          <article className={`lcard result ${pass ? "pass" : "fail"}`}>
            <div className="result-big">{pass ? "통과!" : "조금만 더!"}</div>
            {pts > 0 && <div className="earn"><span className="earn-pts">+{pts}점</span></div>}
            <p><b>{quiz.length}문제 중 {ok}문제</b>를 맞혔어. {pass ? "이 레슨은 끝!" : `${PASS.conceptOk}문제 이상이면 통과야.`}</p>
            <div className="lcard-actions">
              {!pass && <button type="button" className="btn line" onClick={() => { setStep(0); setQuiz(null); }}>카드 다시 보기</button>}
              {!pass && <button type="button" className="btn" onClick={() => { setQuiz(null); setQuizRun((x) => x + 1); }}>확인 문제 다시 풀기</button>}
              {pass && nextLesson && <Link className="btn big grow" href={`/learn/${u.slug}/lesson/${nextLesson.no}`}>다음 레슨: {nextLesson.title} <Icon name="arrow" /></Link>}
              {pass && !nextLesson && <Link className="btn big grow" href={`/learn/${u.slug}`}>개념 끝! 기본 문제로 <Icon name="arrow" /></Link>}
              <Link className="btn line" href={`/learn/${u.slug}`}>단원으로</Link>
            </div>
          </article>
        );
      })()}
    </div>
  );
}
