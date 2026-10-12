"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import NicknameCard from "@/components/NicknameCard";
import Top5 from "@/components/Top5";
import { SUBJECTS, type BoardRow } from "@/lib/data";
import { sb } from "@/lib/supabase";
import { useMe } from "@/lib/useMe";

export default function Home() {
  const { user, nickname, error, ready, saveNickname } = useMe();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [me, setMe] = useState<{ points: number; rank: number | null }>({ points: 0, rank: null });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await sb().from("questions").select("subject").eq("status", "published");
      const c: Record<string, number> = {};
      (data ?? []).forEach((r: { subject: string }) => (c[r.subject] = (c[r.subject] ?? 0) + 1));
      setCounts(c);
      const { data: board } = await sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 500 });
      const mine = ((board as BoardRow[]) ?? []).find((r) => r.user_id === user.id);
      setMe({ points: mine?.points ?? 0, rank: mine?.rank ?? null });
    })();
  }, [user]);

  return (
    <div className="stack">
      {error && <div className="notice">{error}</div>}
      <section className="hero">
        <div className="card">
          <div className="eyebrow">STUDY · SOLVE · RANK UP</div>
          <h1>공부하고, 점수 따고, 랭킹 올리기</h1>
          <p className="muted" style={{ margin: 0 }}>
            회원가입 없이 바로 시작. 처음 맞히면 만점, 한 번 틀린 뒤 맞히면 절반 점수야. 어려운 문제일수록 점수가 커.
          </p>
          <div className="mystat">
            <div><b>{nickname ?? "–"}</b><small>내 닉네임</small></div>
            <div><b>{me.points}</b><small>내 점수</small></div>
            <div><b>{me.rank ? `${me.rank}위` : "–"}</b><small>전체 등수</small></div>
          </div>
        </div>
        <Top5 myId={user?.id} />
      </section>

      {ready && user && !nickname && <NicknameCard current={nickname} onSave={saveNickname} />}

      <section className="stack" style={{ gap: 10 }}>
        <h2 className="h2">어떤 과목을 풀까?</h2>
        <div className="subjects">
          {SUBJECTS.map((s) => (
            <Link key={s.code} href={`/subject/${s.code}`} className="subj">
              <b>{s.name}</b>
              <span>{s.desc}</span>
              <span className="num">{counts[s.code] ?? 0}문제</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card small muted">
        <b style={{ color: "var(--ink)" }}>점수표</b> · 매우 쉬움 5 · 쉬움 10 · 보통 20 · 어려움 35 · 최상위 50점. 같은 문제는 한 번만 점수를 받아.
        정답 확인과 점수 계산은 서버에서 해서, 화면을 조작해도 점수는 안 바뀌어.
      </section>
    </div>
  );
}
