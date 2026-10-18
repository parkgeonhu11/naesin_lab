"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { subjectLetter, subjectName } from "@/lib/data";
import { minsec, type MockExam } from "@/lib/mock";
import { friendly, isConfigured, sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function MockListPage() {
  const { user } = useMe();
  const [rows, setRows] = useState<MockExam[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    sb().rpc("mock_list_v2").then(({ data, error }) => {
      if (!alive) return;
      if (error) setErr(friendly(error));
      setRows((data as MockExam[]) ?? []);
    });
    return () => { alive = false; };
  }, [user]);

  return (
    <>
      <div className="page-title">
        <h1>예상 시험</h1>
        <span className="muted small">실제 시험처럼 제한 시간 안에 한 번에 풀어. 시험마다 랭킹이 따로 있어.</span>
      </div>
      <div className="notice">
        <b>규칙</b> 시작을 누르면 <b>25분</b> 타이머가 바로 돌아가고, 중간에 나가도 시간은 계속 흘러. 랭킹에는 <b>첫 번째 응시</b>만 들어가고, 그 뒤로는 연습으로 몇 번이든 다시 풀 수 있어.
        랭킹 점수는 <b>맞은 개수 × 100 + 시간 보너스</b>야. 시간 보너스는 남은 시간이 많을수록, 많이 맞힐수록 커져(최대 100점).
      </div>
      {err && <p className="small res-wa">{err}</p>}
      <div className="mock-grid">
        {rows === null && <div className="panel panel-body muted">불러오는 중…</div>}
        {rows?.length === 0 && <div className="panel panel-body muted">아직 올라온 예상 시험이 없어.</div>}
        {rows?.map((e) => {
          const done = e.my_status === "done";
          const running = e.my_status === "running";
          return (
            <section key={e.id} className={`panel mock-card sub-${e.subject}`}>
              <div className="mock-card-head">
                <span className="subject-badge" aria-hidden="true">{subjectLetter(e.subject)}</span>
                <div className="grow">
                  <b>{e.title}</b>
                  <small>{e.scope}</small>
                </div>
              </div>
              <div className="mock-meta small">
                <span><Icon name="paper" /> 선택형 {e.items}문항{e.essays ? ` · 서술형 ${e.essays}` : ""}</span>
                <span><Icon name="pulse" /> {minsec(e.time_limit)}</span>
                <span><Icon name="trophy" /> {e.takers}명 응시</span>
              </div>
              {done && e.my_correct !== null && (
                <div className="mock-mine">
                  <span>내 기록 <b>{e.my_correct}/{e.my_total}</b> · {minsec(e.my_elapsed ?? 0)}</span>
                  <span>{e.my_rank ? <><b>{e.my_rank}위</b> · {e.my_score}점</> : "랭킹 집계 중"}</span>
                </div>
              )}
              {running && <div className="mock-mine warn">시험이 진행 중이야. 시간이 계속 흐르고 있어!</div>}
              <div className="row">
                <Link className="btn" href={`/mock/${e.id}`}>
                  {running ? "이어서 풀기" : done ? "다시 풀기 (연습)" : "시험 시작"}
                </Link>
                <Link className="btn line" href={`/mock/${e.id}/rank`}>랭킹</Link>
                {done && <span className="small faint">{subjectName(e.subject)} · {e.my_tries}번 응시</span>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
