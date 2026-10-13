"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ResultText } from "@/components/Badges";
import Icon from "@/components/Icon";
import NicknameCard from "@/components/NicknameCard";
import { Avatar } from "@/components/Shell";
import { ago, levelOf, stateOf, SUBJECTS, subjectLetter, subjectName, type BoardRow, type MySummary, type Submission, type UnitStat } from "@/lib/data";
import { isConfigured, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";
import { useProblems } from "@/lib/useProblems";

const DAILY_GOAL = 10;
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export default function Home() {
  const { user, nickname, error, ready, saveNickname } = useMe();
  const { rows, prog } = useProblems();
  const [sum, setSum] = useState<MySummary | null>(null);
  const [top, setTop] = useState<BoardRow[] | null>(null);
  const [mine, setMine] = useState<Submission[] | null>(null);
  const [live, setLive] = useState<Submission[] | null>(null);
  const [units, setUnits] = useState<UnitStat[]>([]);
  const [loadErr, setLoadErr] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    const load = async () => {
      const [board, recent, me, my, us] = await Promise.all([
        sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 5 }),
        sb().rpc("recent_submissions", { p_limit: 6, p_only_me: false }),
        user ? sb().rpc("my_summary") : Promise.resolve({ data: null }),
        user ? sb().rpc("recent_submissions", { p_limit: 5, p_only_me: true }) : Promise.resolve({ data: [] }),
        user ? sb().rpc("my_unit_stats") : Promise.resolve({ data: [] }),
      ]);
      if (!alive) return;
      setLoadErr(!!(board.error || recent.error || ("error" in me && me.error)));
      setTop((board.data as BoardRow[]) ?? []);
      setLive((recent.data as Submission[]) ?? []);
      setSum((me.data as MySummary) ?? null);
      setMine((my.data as Submission[]) ?? []);
      setUnits((us.data as UnitStat[]) ?? []);
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user, tick]);

  // 과목별: 문제 수, 내가 맞힌 수, 내 정답률
  const bySubject = useMemo(() => {
    const m: Record<string, { total: number; solved: number; subs: number; ok: number }> = {};
    SUBJECTS.forEach((s) => (m[s.code] = { total: 0, solved: 0, subs: 0, ok: 0 }));
    (rows ?? []).forEach((r) => {
      m[r.subject] ??= { total: 0, solved: 0, subs: 0, ok: 0 };
      m[r.subject].total++;
      if (stateOf(prog[r.id]) === "solved") m[r.subject].solved++;
    });
    units.forEach((u) => {
      if (!m[u.subject]) return;
      m[u.subject].subs += +u.submissions;
      m[u.subject].ok += +u.correct_submissions;
    });
    return m;
  }, [rows, prog, units]);

  const total = rows?.length ?? 0;
  const subjects = SUBJECTS.filter((s) => s.code !== "hm" || bySubject.hm?.total);
  const nextProblem = (rows ?? []).find((r) => stateOf(prog[r.id]) === "none");
  const wrongOpen = (rows ?? []).filter((r) => stateOf(prog[r.id]) === "tried").length;
  const acc = sum ? pct(sum.correct_submissions, sum.submissions) : 0;
  const today = Math.min(sum?.today_solved ?? 0, DAILY_GOAL);
  const name = nickname ?? "친구";
  const lv = levelOf(sum?.points ?? 0);
  const weekSubj = sum?.week_subjects ?? 0;
  const weekAcc = sum ? pct(sum.week_ok, sum.week_subs) : 0;
  const growth = sum?.week_subs && sum?.last_subs ? weekAcc - pct(sum.last_ok, sum.last_subs) : null;
  const maxDaily = Math.max(1, ...(sum?.daily ?? []).map((x) => x.n));

  return (
    <>
      {error && <div className="notice warn">{error}</div>}
      {ready && user && !nickname && <NicknameCard current={nickname} onSave={saveNickname} />}
      {loadErr && (
        <div className="notice warn row">
          <span className="grow">기록을 불러오지 못했어. 인터넷 연결을 확인하고 다시 시도해 줘.</span>
          <button className="btn line" type="button" onClick={() => setTick((t) => t + 1)}>다시 시도</button>
        </div>
      )}

      {/* 인사 배너 */}
      <section className="hero">
        <h1>{name}, 오늘도 한 문제씩 올라가 보자</h1>
        <p>시험 범위 {total}문제가 준비돼 있어. 처음에 맞히면 만점, 찍으면 감점이야.</p>
        <div className="hero-meta">
          <span className="streak">
            <Icon name="flame" />
            {sum?.streak ? `${sum.streak}일 연속 공부 중` : "오늘 첫 문제를 풀면 연속 기록이 시작돼"}
          </span>
          <span className="level" title={`Lv.${lv.lv + 1}까지 ${lv.toNext}점`}>
            <b>Lv.{lv.lv}</b>
            <span className="level-bar"><span style={{ width: `${lv.pct}%` }} /></span>
            <small>다음 레벨까지 {lv.toNext}점</small>
          </span>
        </div>
        <div className="row">
          <Link href={nextProblem ? `/problem/${nextProblem.no}` : "/problems"} className="btn white">
            {nextProblem ? "안 푼 문제 바로 풀기" : "문제 목록 보기"}
          </Link>
          <Link href="/exam" className="btn ghost">시험지 만들기</Link>
          <Link href="/review" className="btn ghost">오답 노트{wrongOpen ? ` ${wrongOpen}` : ""}</Link>
        </div>
      </section>

      {/* 내 숫자 */}
      <section className="kpis" aria-label="내 기록">
        <div className="kpi">
          <span className="k-ic"><Icon name="rank" /></span>
          <div>
            <small>내 점수</small>
            <b>{sum?.points ?? 0}<em>점</em></b>
            <span className="k-sub">이번 주 {sum?.week ? `+${sum.week}` : 0}점</span>
          </div>
        </div>
        <Link href="/ranking" className="kpi">
          <span className="k-ic gold"><Icon name="trophy" /></span>
          <div>
            <small>내 랭킹</small>
            <b>{sum?.rank ?? "–"}<em>위</em></b>
            <span className="k-sub">{sum?.players ? `전체 ${sum.players}명 중` : "아직 점수 낸 사람이 없어"}</span>
          </div>
        </Link>
        <div className="kpi">
          <span className="k-ic green"><Icon name="check" /></span>
          <div>
            <small>맞힌 문제</small>
            <b>{sum?.solved ?? 0}<em>/ {total}</em></b>
            <span className="k-sub">{sum?.revealed ? `정답 보기 ${sum.revealed}문제` : `${pct(sum?.solved ?? 0, total)}% 정복`}</span>
          </div>
        </div>
        <div className="kpi">
          <span className="ring" style={{ ["--p" as string]: acc }}><span>{acc}%</span></span>
          <div>
            <small>정답률</small>
            <b>{acc}<em>%</em></b>
            <span className="k-sub">{sum?.submissions ? `제출 ${sum.submissions}번 중 ${sum.correct_submissions}번 정답` : "아직 제출이 없어"}</span>
          </div>
        </div>
      </section>

      <div className="dash">
        {/* 1열: 오늘 목표 + 내 최근 기록 */}
        <div className="dash-col">
          <section className="panel mission">
            <div className="mission-top">
              <span className="k-ic" style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--brand-soft)", color: "var(--brand)" }}><Icon name="target" /></span>
              <div className="grow">
                <h3>오늘의 목표</h3>
                <span className="count"><b>{today}</b> / {DAILY_GOAL}문제 맞히기</span>
              </div>
              <Link href={nextProblem ? `/problem/${nextProblem.no}` : "/problems"} className="btn">풀기</Link>
            </div>
            <div className="bar"><span style={{ width: `${pct(today, DAILY_GOAL)}%` }} /></div>
            <span className="small faint">
              {today >= DAILY_GOAL ? "오늘 목표 달성! 더 풀면 랭킹이 더 올라가." : sum?.today_submissions ? `오늘 ${sum.today_submissions}번 제출했어.` : "오늘은 아직 안 풀었어."}
            </span>
            <div className="week-box">
              <div className="week-row">
                <span>주간 미션 · 서로 다른 3과목 풀기</span>
                <b className={weekSubj >= 3 ? "res-ac" : ""}>{weekSubj >= 3 ? "달성!" : `${weekSubj} / 3`}</b>
              </div>
              <div className="week-row">
                <span>이번 주 정답률</span>
                <b>
                  {sum?.week_subs ? `${weekAcc}%` : "–"}
                  {growth !== null && <small className={growth >= 0 ? "res-ac" : "res-wa"}> 지난주보다 {growth >= 0 ? "+" : ""}{growth}%p</small>}
                </b>
              </div>
              <div className="spark" aria-label="최근 7일 맞힌 문제 수">
                {(sum?.daily ?? []).map((x) => (
                  <span key={x.d} className="spark-col" title={`${x.d.slice(5).replace("-", "/")} · ${x.n}문제`}>
                    <span className="spark-bar" style={{ height: `${Math.max(4, (100 * x.n) / maxDaily)}%` }} data-zero={x.n === 0 || undefined} />
                    <small>{"일월화수목금토"[new Date(x.d + "T00:00:00").getDay()]}</small>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>내 최근 기록</h2>
              <Link href="/status" className="more">전체 보기</Link>
            </div>
            <div className="list">
              {mine === null && <div className="list-empty">불러오는 중…</div>}
              {mine?.length === 0 && <div className="list-empty">아직 푼 문제가 없어. 첫 문제를 풀어 봐!</div>}
              {mine?.map((s) => (
                <Link key={s.id} href={`/problem/${s.problem_no}`} className="list-item" data-s={s.subject}>
                  <span className="subj-icon">{subjectLetter(s.subject)}</span>
                  <span className="li-main">
                    <b>{s.title}</b>
                    <small>{s.problem_no}번 · {ago(s.created_at)}</small>
                  </span>
                  <ResultText correct={s.is_correct} />
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* 2열: 과목별 정답률 */}
        <div className="dash-col">
          <section className="panel">
            <div className="panel-head">
              <h2>과목별 내 정답률</h2>
              <Link href="/me" className="more">성적 분석</Link>
            </div>
            <div className="subj-progress">
              {subjects.map((s) => {
                const v = bySubject[s.code];
                return (
                  <div key={s.code} className="sp-row" data-s={s.code}>
                    <span className="sp-name">{s.name}</span>
                    <div className="bar"><span style={{ width: `${pct(v.ok, v.subs)}%` }} /></div>
                    <span className="sp-num">{v.subs ? `${pct(v.ok, v.subs)}%` : "기록 없음"}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>친구들 최근 채점</h2>
              <Link href="/status" className="more">채점 현황</Link>
            </div>
            <div className="list">
              {live === null && <div className="list-empty">불러오는 중…</div>}
              {live?.length === 0 && <div className="list-empty">아직 제출이 없어. 첫 번째로 풀어 봐!</div>}
              {live?.map((s) => (
                <Link key={s.id} href={`/problem/${s.problem_no}`} className={`list-item ${s.is_me ? "mine" : ""}`}>
                  <Avatar name={s.nickname} />
                  <span className="li-main">
                    <b>{s.nickname}</b>
                    <small>{subjectName(s.subject)} {s.problem_no}번 · {ago(s.created_at)}</small>
                  </span>
                  <ResultText correct={s.is_correct} />
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* 3열: TOP 5 + 점수 규칙 */}
        <div className="dash-col">
          <section className="panel top5">
            <div className="panel-head">
              <h2><Icon name="trophy" /> 랭킹 TOP 5</h2>
              <Link href="/ranking" className="more">전체 랭킹</Link>
            </div>
            <div className="list">
              {top === null && <div className="list-empty">불러오는 중…</div>}
              {top?.length === 0 && <div className="list-empty">첫 문제를 맞히면 1위!</div>}
              {top?.map((r) => (
                <div key={r.user_id} className={`list-item ${r.user_id === user?.id ? "mine" : ""}`}>
                  <span className={`medal m${r.rank}`}>{r.rank}</span>
                  <span className="li-main">
                    <b>{r.nickname}{r.user_id === user?.id ? " (나)" : ""}</b>
                    <small>맞힌 문제 {r.solved}개</small>
                  </span>
                  <span className="pts">{r.points}점</span>
                </div>
              ))}
            </div>
            <div className="my-rank">
              <Avatar name={nickname} />
              <span className="grow">내 순위 <b>{sum?.rank ? `${sum.rank}위` : "–"}</b>{sum?.players ? ` / ${sum.players}명` : ""}</span>
              <span className="pts">{sum?.points ?? 0}점</span>
            </div>
          </section>

          <section className="panel pc-only">
            <div className="panel-head"><h2>점수 규칙</h2></div>
            <div className="panel-body">
              <ol className="howto">
                <li>처음에 맞히면 <b>만점</b>, 틀린 뒤 맞히면 <b>절반</b>.</li>
                <li>첫 오답은 봐주지만 <b>두 번째 오답부터 배점의 25%씩 감점</b>. 찍으면 손해야.</li>
                <li>배점: 매우 쉬움 5 · 쉬움 10 · 보통 20 · 어려움 35 · 최상위 50</li>
                <li>직접 만든 문제를 <b>제안</b>해서 승인되면 +5점.</li>
              </ol>
            </div>
          </section>
        </div>
      </div>

      {/* 과목 바로가기 */}
      <section className="subj-tiles" aria-label="과목 바로가기">
        {subjects.map((s) => {
          const v = bySubject[s.code];
          return (
            <Link key={s.code} href={`/problems?subject=${s.code}`} className="tile" data-s={s.code}>
              <span className="subj-icon">{subjectLetter(s.code)}</span>
              <b>{s.name}</b>
              <small>{v.solved} / {v.total}문제 맞힘</small>
              <div className="bar"><span style={{ width: `${pct(v.solved, v.total)}%` }} /></div>
            </Link>
          );
        })}
      </section>
    </>
  );
}
