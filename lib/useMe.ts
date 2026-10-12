"use client";
import { createContext, createElement, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ensureUser, friendly, isConfigured, sb } from "./supabase";

type MeState = {
  user: User | null;
  nickname: string | null;
  points: number;
  rank: number | null;
  error: string | null;
  ready: boolean;
  saveNickname: (n: string) => Promise<void>;
  refreshScore: () => Promise<void>;
};

const Ctx = createContext<MeState | null>(null);

/** 앱 전체에서 한 번만 로그인(익명)하고, 닉네임·점수를 함께 쓴다. */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refreshScore = useCallback(async () => {
    const { data } = await sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 500 });
    const { data: s } = await sb().auth.getSession();
    const uid = s.session?.user.id;
    const mine = ((data as { user_id: string; points: number; rank: number }[]) ?? []).find((r) => r.user_id === uid);
    setPoints(mine?.points ?? 0);
    setRank(mine?.rank ?? null);
  }, []);

  const loadNick = useCallback(async (uid: string) => {
    const { data } = await sb().from("profiles").select("nickname").eq("user_id", uid).maybeSingle();
    setNickname(data?.nickname ?? null);
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setError("아직 Supabase 연결 정보가 없어. 설치 안내서 5단계(.env.local)를 확인해 줘.");
      setReady(true);
      return;
    }
    let alive = true;
    ensureUser()
      .then(async (u) => {
        if (!alive) return;
        setUser(u);
        await Promise.all([loadNick(u.id), refreshScore()]);
      })
      .catch((e) => alive && setError(friendly(e)))
      .finally(() => alive && setReady(true));
    const { data: sub } = sb().auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        loadNick(session.user.id);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadNick, refreshScore]);

  const saveNickname = useCallback(async (n: string) => {
    const { error } = await sb().rpc("set_nickname", { p_nick: n });
    if (error) throw error;
    setNickname(n.trim());
  }, []);

  return createElement(Ctx.Provider, { value: { user, nickname, points, rank, error, ready, saveNickname, refreshScore } }, children);
}

export function useMe(): MeState {
  const v = useContext(Ctx);
  if (!v) throw new Error("MeProvider가 필요해");
  return v;
}
