"use client";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { useEffect, useMemo, useState } from "react";
import { ResultText } from "@/components/Badges";
import AccountCard from "@/components/AccountCard";
import MockPromo from "@/components/MockPromo";
import { IS_PREVIEW } from "@/lib/supabase";
import { ADMIN_ACC, ago, stateOf, subjectName, type BoardRow, type MySummary, type Submission } from "@/lib/data";
import { isConfigured, sb } from "@/lib/supabase";
import { useAdmins } from "@/components/Framed";
import { useMe } from "@/lib/useMe";
import { useProblems } from "@/lib/useProblems";

/** 하루 분량: 이만큼 맞히면 "오늘은 여기까지" */
const DAILY = 5;
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
const DAYS = "일월화수목금토";

function Check() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13.5 9.5 19 20 5" /></svg>;
}

type Todo = { key: string; href: string; title: string; note: string; count?: string; done?: boolean };

export default function Home() {
  const isAdmin = useAdmins();
  const { user, nickname, error, isAnon, ready } = useMe();
  const { rows, prog } = useProblems();
  const [sum, setSum] = useState<MySummary | null>(null);
  const [week, setWeek] = useState<BoardRow[] | null>(null);
  const [live, setLive] = useState<Submission[] | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    const load = async () => {
      const [board, recent, me] = await Promise.all([
        sb().rpc("leaderboard_v2", { p_subject: "all", p_period: "week", p_limit: 100, p_scope: "all" }),
        sb().rpc("recent_submissions", { p_limit: 5, p_only_me: false }),
        user ? sb().rpc("my_summary") : Promise.resolve({ data: null }),
      ]);
      if (!alive) return;
      setLoadErr(!!(board.error || recent.error || ("error" in me && me.error)));
      setWeek((board.data as BoardRow[]) ?? []);
      setLive((recent.data as Submission[]) ?? []);
      setSum((me.data as MySummary) ?? null);
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user, tick]);

  const now = new Date();
  const dateLine = `${now.getMonth() + 1}월 ${now.getDate()}일 ${DAYS[now.getDay()]}요일`;
  const nextProblem = (rows ?? []).find((r) => stateOf(prog[r.id]) === "none");
  const wrongOpen = (rows ?? []).filter((r) => stateOf(prog[r.id]) === "tried").length;
  const today = Math.min(sum?.today_solved ?? 0, DAILY);
  const enough = today >= DAILY;
  const meAdmin = isAdmin(user?.id, nickname);
  const acc = sum ? (meAdmin ? ADMIN_ACC : pct(sum.correct_submissions, sum.submissions)) : 0;
  const weekAcc = sum ? pct(sum.week_ok, sum.week_subs) : 0;
  const growth = sum?.week_subs && sum?.last_subs ? weekAcc - pct(sum.last_ok, sum.last_subs) : null;

  // 오늘 할 것: 최대 세 줄, 합쳐서 5문제 안쪽
  const todos = useMemo<Todo[]>(() => {
    const t: Todo[] = [];
    if (wrongOpen > 0) {
      const n = Math.min(wrongOpen, 2);
      t.push({ key: "again", href: "/review", title: "틀렸던 문제 다시 풀기", note: wrongOpen > n ? `오답 노트에서 ${n}문제만. 나머지는 내일 해도 돼` : "오답 노트에 있는 문제", count: `${n}문제` });
    }
    if (IS_PREVIEW) t.push({ key: "learn", href: "/learn/poly", title: "다항식 이어서 공부하기", note: "고1 수학 미리 시작", count: "카드 몇 장" });
    if (nextProblem) t.push({ key: "next", href: `/problem/${nextProblem.no}`, title: `${subjectName(nextProblem.subject)} ${nextProblem.no}번 풀기`, note: nextProblem.title, count: "1문제" });
    if (!t.length) t.push({ key: "list", href: "/problems", title: "문제 고르기", note: "시험 범위 문제가 과목별로 있어" });
    return t.slice(0, 3);
  }, [wrongOpen, nextProblem]);

  // 이번 주 랭킹: 위 5명 + 나, 바로 위 사람과의 점수 차
  const myIdx = week?.findIndex((r) => r.user_id === user?.id) ?? -1;
  const me = myIdx >= 0 ? week![myIdx] : null;
  const above = myIdx > 0 ? week![myIdx - 1] : null;
  const top5 = (week ?? []).slice(0, 5);
  const showMe = me && myIdx >= 5;
  const name = nickname ?? "";

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      {loadErr && (
        <div className="notice warn row">
          <span className="grow">기록을 불러오지 못했어. 인터넷 연결을 확인하고 다시 시도해 줘.</span>
          <button className="btn line" type="button" onClick={() => setTick((t) => t + 1)}>다시 시도</button>
        </div>
      )}

      <div className="today">
        <div style={{ display: "grid", gap: 22, minWidth: 0 }}>
          <section aria-labelledby="today-title">
            <p className="today-date">{dateLine}</p>
            <div className="today-sheet">
              {enough ? (
                <div className="today-enough">
                  <h1 id="today-title">오늘은 여기까지 충분해</h1>
                  <p>오늘 {sum?.today_solved}문제를 맞혔어. 더 풀고 싶으면 풀어도 되지만, 안 해도 괜찮아.</p>
                  <Link href="/problems" className="btn line">문제 더 풀기</Link>
                </div>
              ) : (
                <>
                  <h1 id="today-title">{ready && user && name ? `${name}, 오늘은 이것만 하자` : "오늘은 이것만 해 보자"}</h1>
                  <p className="lead">5문제 맞히면 오늘 분량 끝. 10분이면 돼.</p>
                  <div className="today-meter" aria-label={`오늘 ${today}문제 맞힘, 목표 ${DAILY}문제`}>
                    {Array.from({ length: DAILY }, (_, i) => <i key={i} className={i < today ? "on" : ""} />)}
                    <span>{today ? `${today}문제 맞힘` : "아직 시작 전"}</span>
                  </div>
                  <ul className="todo">
                    {todos.map((t) => (
                      <li key={t.key} className={t.done ? "done" : ""}>
                        <Link href={t.href}>
                          <span className="todo-box">{t.done ? <Check /> : todos.indexOf(t) + 1}</span>
                          <span className="todo-t">{t.title}<small>{t.note}</small></span>
                          {t.count && <span className="todo-n">{t.count}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="today-go">
                    <Link href={todos[0].href} className="btn big">1번부터 시작하기</Link>
                  </div>
                </>
              )}
            </div>
          </section>

          {ready && nickname && isAnon && <AccountCard compact />}
          {ready && !user && (
            <section className="panel panel-body account-card compact welcome-card">
              <div className="grow">
                <b>회원가입 없이 바로 풀 수 있어</b>
                <div className="small muted">
                  문제를 풀면 게스트로 기록돼. Google로 로그인하면 휴대폰·컴퓨터 어디서든 같은 점수와 오답 노트가 이어지고, 게스트 기록도 그대로 옮겨져.
                </div>
              </div>
              <div className="welcome-actions">
                <Link href="/login" className="btn">로그인</Link>
              </div>
            </section>
          )}

          <nav className="shortcuts" aria-label="바로 가기">
            {IS_PREVIEW && <Link href="/learn"><b>공부</b><small>개념부터 차근차근</small></Link>}
            <Link href="/problems"><b>문제</b><small>과목·단원별로 골라 풀기</small></Link>
            <Link href="/exam"><b>시험지</b><small>범위를 골라 한 번에</small></Link>
            <Link href="/mock"><b>예상 시험</b><small>시간 재고 실전처럼</small></Link>
            <Link href="/review"><b>오답 노트</b><small>{wrongOpen ? `다시 풀 문제 ${wrongOpen}개` : "틀린 문제가 모이는 곳"}</small></Link>
            <Link href="/qna"><b>질문방</b><small>막힌 문제 물어보기</small></Link>
            {!IS_PREVIEW && <Link href="/suggest"><b>문제 제안</b><small>내가 만든 문제 올리기</small></Link>}
          </nav>
          <MockPromo compact />
        </div>

        <aside className="today-side" aria-label="내 기록과 랭킹">
          <section className="mini">
            <h2>내 기록 <Link href="/me">성적 분석</Link></h2>
            <div className="mini-stats">
              <div><b>{sum?.points ?? 0}<em>점</em></b><small>점수</small></div>
              <div><b>{sum?.rank ?? "–"}<em>위</em></b><small>전체 순위</small></div>
              <div><b>{acc}<em>%</em></b><small>정답률</small></div>
            </div>
            <p className="mini-week">
              {sum?.week_subs
                ? <>이번 주 정답률 {weekAcc}%{growth !== null && <>, 지난주보다 {growth >= 0 ? `${growth}%p 올랐어` : `${-growth}%p 낮아`}</>}</>
                : "이번 주는 아직 기록이 없어"}
            </p>
          </section>

          <section className="mini">
            <h2>이번 주 랭킹 <Link href="/ranking">전체 보기</Link></h2>
            {week === null && <p className="small faint">불러오는 중…</p>}
            {week?.length === 0 && <p className="small faint">이번 주 첫 문제를 맞히면 1위야.</p>}
            <ol className="mini-list">
              {top5.map((r) => (
                <li key={r.user_id} className={r.user_id === user?.id ? "me" : ""}>
                  <span className="r">{r.rank}</span>
                  <span className="nm">{r.nickname}{r.user_id === user?.id ? " (나)" : ""}</span>
                  <span className="pts">{r.points}점</span>
                </li>
              ))}
              {showMe && (
                <li className="me">
                  <span className="r">{me.rank}</span>
                  <span className="nm">{me.nickname} (나)</span>
                  <span className="pts">{me.points}점</span>
                </li>
              )}
            </ol>
            {me && above && <p className="mini-gap">{above.rank}위까지 {Math.max(1, above.points - me.points)}점</p>}
            {user && !me && week && week.length > 0 && <p className="mini-gap">이번 주에 한 문제 맞히면 순위에 들어가.</p>}
          </section>

          <section className="mini">
            <h2>친구들 최근 채점 <Link href="/status">채점 현황</Link></h2>
            <ul className="mini-list">
              {live === null && <li><span /><span className="faint">불러오는 중…</span><span /></li>}
              {live?.map((s) => (
                <li key={s.id}>
                  <span />
                  <Link href={`/problem/${s.problem_no}`} className="nm">{s.nickname} <span className="faint">{subjectName(s.subject)} {s.problem_no}번, {ago(s.created_at)}</span></Link>
                  <ResultText correct={s.is_correct} />
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
      <AdSlot placement="home" />
    </>
  );
}
