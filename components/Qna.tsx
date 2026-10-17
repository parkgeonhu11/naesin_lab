"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { NameBadges, FramedAvatar, useFrames } from "@/components/Framed";
import { ago, rpcAll, subjectName } from "@/lib/data";
import { friendly, sb } from "@/lib/supabase";

/**
 * 질문방
 * - 문제 화면 아래: 그 문제에 올라온 질문들 + 질문 쓰기
 * - /qna: 모든 문제의 질문 모아 보기
 * 답변에는 풀이·정답이 나올 수 있어서, 아직 안 푼 문제면 답변을 흐리게 가려 둔다 (눌러서 보기)
 */

export type ThreadRow = {
  id: number; question_id: string; no: number; subject: string; topic: string; title: string; body: string;
  nickname: string; user_id: string; is_mine: boolean; answers: number; accepted: boolean; created_at: string; last_at: string; unread: number;
};
type Answer = { id: number; body: string; created_at: string; user_id: string; nickname: string; is_mine: boolean; is_asker: boolean; votes: number; voted: boolean };
type Thread = { id: number; body: string; created_at: string; is_mine: boolean; user_id: string; nickname: string | null; accepted: number | null; answers: Answer[] };

const MAX = 1000;

function Composer({ placeholder, button, onSend }: { placeholder: string; button: string; onSend: (text: string) => Promise<string | null> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    if (busy || text.trim().length < 2) return;
    setBusy(true);
    setErr(null);
    const e = await onSend(text.trim());
    setBusy(false);
    if (e) setErr(e);
    else setText("");
  };
  return (
    <div className="qna-compose">
      <textarea
        value={text}
        maxLength={MAX}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation(); // 문제 화면의 1~5·Enter 단축키가 안 먹게
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
        }}
      />
      <div className="qna-compose-foot">
        <span className="small faint">{err ? <span className="res-wa">{err}</span> : `${text.length}/${MAX} · Ctrl+Enter로 올리기 · 욕설·비방은 막혀`}</span>
        <button type="button" className="btn" disabled={busy || text.trim().length < 2} onClick={send}>{busy ? "올리는 중…" : button}</button>
      </div>
    </div>
  );
}

export function QnaThread({ id, done, onChanged }: { id: number; done: boolean; onChanged?: () => void }) {
  const [t, setT] = useState<Thread | null | undefined>(undefined);
  const [peek, setPeek] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const frameFor = useFrames();

  const load = useCallback(async () => {
    const { data, error } = await sb().rpc("qna_thread", { p_thread: id });
    if (error) setErr(friendly(error));
    setT((data as Thread) ?? null);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: string, args: Record<string, unknown>) => {
    setErr(null);
    const { error } = await sb().rpc(fn, args);
    if (error) setErr(friendly(error));
    await load();
    onChanged?.();
  };

  if (t === undefined) return <div className="qna-loading small faint">불러오는 중…</div>;
  if (t === null) return <div className="small faint">지워진 질문이야.</div>;
  const hide = !done && !peek && t.answers.length > 0 && !t.is_mine;

  return (
    <div className="qna-thread">
      {t.answers.length === 0 && <p className="small faint qna-none">아직 답변이 없어. 아는 사람이 먼저 알려 줘!</p>}
      {hide && (
        <div className="qna-spoiler">
          <span>답변에 풀이나 정답이 나올 수 있어. 먼저 풀어 보고 볼래?</span>
          <button type="button" className="btn line" onClick={() => setPeek(true)}>그래도 답변 보기</button>
        </div>
      )}
      <ol className={`qna-answers ${hide ? "blur" : ""}`} aria-hidden={hide || undefined}>
        {t.answers.map((a) => {
          const best = t.accepted === a.id;
          return (
            <li key={a.id} className={`qna-answer ${best ? "best" : ""}`}>
              <FramedAvatar name={a.nickname} frame={frameFor(a.user_id)} />
              <div className="qna-a-main">
                <div className="qna-meta">
                  <b>{a.nickname}</b>
                  <NameBadges id={a.user_id} />
                  {a.is_asker && <span className="qna-tag">질문자</span>}
                  {best && <span className="qna-tag best">✓ 채택된 답변</span>}
                  <span className="faint">{ago(a.created_at)}</span>
                </div>
                <p className="qna-body">{a.body}</p>
                <div className="qna-actions">
                  <button type="button" className={`qna-mini ${a.voted ? "on" : ""}`} disabled={a.is_mine} title={a.is_mine ? "내 답변" : "도움돼요"} onClick={() => act("qna_vote", { p_answer: a.id })}>
                    👍 도움돼요 {a.votes > 0 ? a.votes : ""}
                  </button>
                  {t.is_mine && !a.is_asker && (
                    <button type="button" className={`qna-mini ${best ? "on" : ""}`} onClick={() => act("qna_accept", { p_thread: t.id, p_answer: a.id })}>
                      {best ? "채택 취소" : "이 답변 채택"}
                    </button>
                  )}
                  {a.is_mine && <button type="button" className="qna-mini danger" onClick={() => { if (confirm("이 답변을 지울까?")) act("qna_remove", { p_kind: "answer", p_id: a.id }); }}>지우기</button>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {err && <p className="small res-wa">{err}</p>}
      <Composer
        placeholder={t.is_mine ? "더 궁금한 걸 덧붙이거나, 알아낸 걸 적어 봐" : "아는 만큼 친절하게 알려 줘 (정답만 말고 푸는 방법도!)"}
        button="답변 올리기"
        onSend={async (text) => {
          const { error } = await sb().rpc("qna_reply", { p_thread: t.id, p_body: text });
          if (error) return friendly(error);
          setPeek(true);
          await load();
          onChanged?.();
          return null;
        }}
      />
    </div>
  );
}

function ThreadItem({ r, done, showProblem, open, onToggle, onChanged }: { r: ThreadRow; done: boolean; showProblem?: boolean; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const frameFor = useFrames();
  return (
    <li className={`qna-item ${open ? "open" : ""} ${r.is_mine ? "mine" : ""}`} id={`qna-${r.id}`}>
      <button type="button" className="qna-head" onClick={onToggle} aria-expanded={open}>
        <FramedAvatar name={r.nickname} frame={frameFor(r.user_id)} />
        <span className="qna-head-main">
          <span className="qna-meta">
            <b>{r.nickname}{r.is_mine ? " (나)" : ""}</b>
            <NameBadges id={r.user_id} />
            {showProblem && <span className="qna-prob">{subjectName(r.subject)} {r.no}번</span>}
            <span className="faint">{ago(r.created_at)}</span>
          </span>
          <span className="qna-q">{r.body}</span>
        </span>
        <span className="qna-count">
          {r.unread > 0 && <span className="qna-new">새 답변 {r.unread}</span>}
          {r.accepted ? <span className="qna-tag best">해결</span> : r.answers === 0 ? <span className="qna-tag wait">답변 기다리는 중</span> : null}
          <span className="faint small">답변 {r.answers}</span>
        </span>
      </button>
      {open && (
        <div className="qna-open">
          {showProblem && <Link className="link small" href={`/problem/${r.no}#qna`}>{r.no}번 문제로 가기 · {r.title}</Link>}
          <QnaThread id={r.id} done={done} onChanged={onChanged} />
          {r.is_mine && (
            <button type="button" className="qna-mini danger" style={{ marginTop: 6 }} onClick={async () => { if (confirm("이 질문을 지울까? 달린 답변도 같이 안 보이게 돼.")) { await sb().rpc("qna_remove", { p_kind: "thread", p_id: r.id }); onChanged(); } }}>질문 지우기</button>
          )}
        </div>
      )}
    </li>
  );
}

/** 문제 화면 아래에 붙는 질문·답변 */
export function ProblemQna({ questionId, done }: { questionId: string; done: boolean }) {
  const [rows, setRows] = useState<ThreadRow[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);

  const load = useCallback(async () => {
    const { data } = await sb().rpc("qna_list", { p_question: questionId, p_filter: "all", p_limit: 50 });
    setRows((data as ThreadRow[]) ?? []);
  }, [questionId]);
  useEffect(() => {
    setRows(null);
    setOpen(null);
    setAsking(false);
    load();
  }, [load]);

  return (
    <section className="section qna" id="qna">
      <div className="qna-title">
        <h2>질문 · 답변 {rows && rows.length > 0 ? <span className="faint">{rows.length}</span> : null}</h2>
        {!asking && <button type="button" className="btn line" onClick={() => setAsking(true)}>모르는 거 질문하기</button>}
      </div>
      {asking && (
        <Composer
          placeholder="어디서 막혔는지 적어 줘. 예) 보조선을 어디에 그어야 할지 모르겠어"
          button="질문 올리기"
          onSend={async (text) => {
            const { data, error } = await sb().rpc("qna_ask", { p_question: questionId, p_body: text });
            if (error) return friendly(error);
            setAsking(false);
            await load();
            setOpen(data as number);
            return null;
          }}
        />
      )}
      {rows === null && <p className="small faint">불러오는 중…</p>}
      {rows?.length === 0 && !asking && <p className="small faint">아직 이 문제에 올라온 질문이 없어.</p>}
      {rows && rows.length > 0 && (
        <ul className="qna-list">
          {rows.map((r) => (
            <ThreadItem key={r.id} r={r} done={done} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} onChanged={load} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** /qna 화면: 모든 질문 */
export function QnaBoard() {
  const [filter, setFilter] = useState<"all" | "open" | "mine">("all");
  const [rows, setRows] = useState<ThreadRow[] | null>(null);
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb().rpc("qna_list", { p_question: null, p_filter: filter, p_limit: 100 });
    setRows((data as ThreadRow[]) ?? []);
  }, [filter]);
  useEffect(() => {
    setRows(null);
    load();
  }, [load]);
  useEffect(() => {
    rpcAll(sb(), "my_progress").then((data) => {
      const s = new Set<string>();
      ((data as { question_id: string; points: number | null }[]) ?? []).forEach((p) => { if (p.points != null) s.add(p.question_id); });
      setDoneSet(s);
    });
  }, []);

  return (
    <section className="panel">
      <div className="tabs">
        <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>전체</button>
        <button aria-pressed={filter === "open"} onClick={() => setFilter("open")}>해결 안 된 질문</button>
        <button aria-pressed={filter === "mine"} onClick={() => setFilter("mine")}>내 질문</button>
      </div>
      <div className="panel-body">
        {rows === null && <p className="small faint">불러오는 중…</p>}
        {rows?.length === 0 && (
          <p className="small faint">
            {filter === "mine" ? "아직 올린 질문이 없어. 문제 화면 아래 '모르는 거 질문하기'를 눌러 봐." : "아직 질문이 없어. 모르는 문제가 있으면 문제 화면 아래에서 질문해 봐!"}
          </p>
        )}
        {rows && rows.length > 0 && (
          <ul className="qna-list">
            {rows.map((r) => (
              <ThreadItem key={r.id} r={r} showProblem done={doneSet.has(r.question_id)} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} onChanged={load} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** 메뉴에 띄우는 '새 답변' 숫자 (1분마다 확인) */
export function useQnaUnread(enabled: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const tick = async () => {
      const { data } = await sb().rpc("qna_unread");
      if (alive) setN(Number(data ?? 0));
    };
    tick();
    const t = setInterval(tick, 60000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled]);
  return n;
}
