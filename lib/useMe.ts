"use client";
import { createContext, createElement, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ensureUser, friendly, googleEnabled, handleOAuthReturn, isConfigured, sb, signInWithGoogle, signOutUser } from "./supabase";

type MeState = {
  user: User | null;
  nickname: string | null;
  /** 관리자가 별명을 초기화했거나 금지어에 걸려서 새로 정해야 함 */
  mustRename: boolean;
  /** Google 계정에 연결 안 된 임시(익명) 계정인지 */
  isAnon: boolean;
  email: string | null;
  points: number;
  rank: number | null;
  error: string | null;
  ready: boolean;
  /** 로그인 상태 확인이 끝났는지 (이게 false면 아직 화면을 정하지 않음) */
  authChecked: boolean;
  /** Google 로그인이 필요해서 로그인 화면을 보여 줘야 함 */
  needLogin: boolean;
  /** Supabase에 Google 로그인이 켜져 있는지 (Google로 로그인한 사람은 항상 true) */
  googleOn: boolean;
  saveNickname: (n: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Google 로그인 설정 전에만: 임시 계정으로 들어가기 */
  enterAsGuest: () => Promise<void>;
  notice: string | null;
  refreshScore: () => Promise<void>;
};

const Ctx = createContext<MeState | null>(null);

/** 앱 전체에서 한 번만 로그인하고(Google, 설정 전에는 임시 계정), 별명·점수를 함께 쓴다. */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [mustRename, setMustRename] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);

  const refreshScore = useCallback(async () => {
    const { data } = await sb().rpc("leaderboard", { p_subject: "all", p_period: "all", p_limit: 500 });
    const { data: s } = await sb().auth.getSession();
    const uid = s.session?.user.id;
    const mine = ((data as { user_id: string; points: number; rank: number }[]) ?? []).find((r) => r.user_id === uid);
    setPoints(mine?.points ?? 0);
    setRank(mine?.rank ?? null);
  }, []);

  const loadNick = useCallback(async (uid: string) => {
    const { data } = await sb().from("profiles").select("nickname,must_rename").eq("user_id", uid).maybeSingle();
    setNickname(data?.nickname ?? null);
    setMustRename(!!data?.must_rename);
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setError("아직 Supabase 연결 정보가 없어. 설치 안내서 5단계(.env.local)를 확인해 줘.");
      setReady(true);
      setAuthChecked(true);
      return;
    }
    let alive = true;
    handleOAuthReturn().then((m) => m && alive && setNotice(m));
    (async () => {
      const { data } = await sb().auth.getSession();
      let u = data.session?.user ?? null;
      // Google로 로그인한 사람은 바로 통과. 아니면 Google 로그인이 켜져 있는지 확인
      if (!u || u.is_anonymous) {
        const g = await googleEnabled();
        if (!alive) return;
        setLoginRequired(g);
        // 처음 온 사람(세션 없음)은 언제나 로그인 화면부터. 임시 계정은 만들지 않음
      }
      if (!alive) return;
      setAuthChecked(true);
      if (!u) return;
      if (!u.is_anonymous) try { sessionStorage.removeItem("nl-oauth-retry"); } catch {}
      setUser(u);
      await Promise.all([loadNick(u.id), refreshScore()]);
    })()
      .catch((e) => alive && setError(friendly(e)))
      .finally(() => { if (alive) { setReady(true); setAuthChecked(true); } });
    const { data: sub } = sb().auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        loadNick(session.user.id);
        refreshScore();
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
    setNickname(n.trim().replace(/\s+/g, " "));
    setMustRename(false);
  }, []);

  const signInGoogle = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      setNotice(friendly(e));
      throw e;
    }
  }, []);

  const enterAsGuest = useCallback(async () => {
    try {
      const u = await ensureUser();
      setUser(u);
      await Promise.all([loadNick(u.id), refreshScore()]);
    } catch (e) {
      setNotice(friendly(e));
    }
  }, [loadNick, refreshScore]);

  const signOut = useCallback(async () => {
    const u = await signOutUser(false);
    setUser(u);
    setNickname(null);
    setMustRename(false);
    setPoints(0);
    setRank(null);
    if (u) await refreshScore();
  }, [refreshScore]);

  return createElement(Ctx.Provider, { value: {
    user, nickname, mustRename, isAnon: user?.is_anonymous ?? true, email: user?.email ?? null,
    points, rank, error, ready, authChecked, needLogin: !user || (loginRequired && !!user.is_anonymous), googleOn: loginRequired || (!!user && !user.is_anonymous), saveNickname, signInGoogle, signOut, enterAsGuest, notice, refreshScore,
  } }, children);
}

export function useMe(): MeState {
  const v = useContext(Ctx);
  if (!v) throw new Error("MeProvider가 필요해");
  return v;
}
