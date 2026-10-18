"use client";
import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { deviceInfo } from "./device";
import { ensureUser, friendly, googleEnabled, handleOAuthReturn, isConfigured, sb, signInWithGoogle, signOutUser } from "./supabase";

type MeState = {
  user: User | null;
  nickname: string | null;
  /** 관리자가 별명을 초기화했거나 금지어에 걸려서 새로 정해야 함 */
  mustRename: boolean;
  /** Google 계정에 연결 안 된 임시(익명) 계정인지 */
  isAnon: boolean;
  email: string | null;
  /** 내 학교·학년 (아직 안 골랐으면 null) */
  school: { id: string; name: string } | null;
  grade: number | null;
  /** 별명은 정했는데 학교·학년을 아직 안 골랐음 */
  needSchool: boolean;
  saveSchool: (name: string, grade: number) => Promise<void>;
  points: number;
  rank: number | null;
  error: string | null;
  ready: boolean;
  /** 로그인 상태 확인이 끝났는지 (이게 false면 아직 화면을 정하지 않음) */
  authChecked: boolean;
  /** 아직 계정이 없어서 로그인 화면(Google 또는 게스트)을 보여 줘야 함 */
  needLogin: boolean;
  /** Supabase에 Google 로그인이 켜져 있는지 (Google로 로그인한 사람은 항상 true) */
  googleOn: boolean;
  saveNickname: (n: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** 게스트(익명) 계정으로 들어가기. 이 브라우저에만 저장되고, 잃어버리면 되찾을 수 없음 */
  enterAsGuest: () => Promise<void>;
  notice: string | null;
  /** 너무 빨리 맞힌 답이 쌓여서 받은 경고 (아직 확인 안 함) */
  warned: boolean;
  /** 이용 정지 */
  banned: boolean;
  ackWarning: () => Promise<void>;
  /** 경고·정지 상태 다시 확인 (제출 뒤에 호출) */
  refreshStatus: () => Promise<void>;
  refreshScore: () => Promise<void>;
};

const Ctx = createContext<MeState | null>(null);

/** 앱 전체에서 한 번만 로그인하고(Google, 설정 전에는 임시 계정), 별명·점수를 함께 쓴다. */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [mustRename, setMustRename] = useState(false);
  const [school, setSchool] = useState<{ id: string; name: string } | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [warned, setWarned] = useState(false);
  const [banned, setBanned] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);

  const refreshScore = useCallback(async () => {
    // 머리글의 순위는 우리 학교·학년 안에서
    const { data } = await sb().rpc("leaderboard_v2", { p_subject: "all", p_period: "all", p_limit: 500, p_scope: "school" });
    const { data: s } = await sb().auth.getSession();
    const uid = s.session?.user.id;
    const mine = ((data as { user_id: string; points: number; rank: number }[]) ?? []).find((r) => r.user_id === uid);
    setPoints(mine?.points ?? 0);
    setRank(mine?.rank ?? null);
  }, []);

  // 접속 기록 (관리자 화면의 로그인 현황). 같은 계정은 이 탭에서 한 번만 보냄, 서버에서도 30분에 한 번만 저장
  const logged = useRef<string | null>(null);
  const logLogin = useCallback((u: User) => {
    const key = `${u.id}:${u.is_anonymous ? "a" : "g"}`;
    if (logged.current === key) return;
    logged.current = key;
    const d = deviceInfo();
    sb().rpc("log_login", { p_device: d.device, p_os: d.os, p_browser: d.browser }).then(() => {}, () => {});
  }, []);

  const loadNick = useCallback(async (uid: string) => {
    const { data } = await sb().from("profiles").select("nickname,must_rename").eq("user_id", uid).maybeSingle();
    const { data: sc } = await sb().rpc("my_scope");
    const row = ((sc as { school_id: string | null; school_name: string | null; grade: number | null }[]) ?? [])[0];
    setSchool(row?.school_id ? { id: row.school_id, name: row.school_name ?? "" } : null);
    setGrade(row?.grade ?? null);
    setNickname(data?.nickname ?? null);
    setMustRename(!!data?.must_rename);
    const { data: st } = await sb().rpc("my_status");
    setWarned(!!(st as { warned?: boolean } | null)?.warned);
    setBanned(!!(st as { banned?: boolean } | null)?.banned);
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
      logLogin(u);
      await Promise.all([loadNick(u.id), refreshScore()]);
    })()
      .catch((e) => alive && setError(friendly(e)))
      .finally(() => { if (alive) { setReady(true); setAuthChecked(true); } });
    const { data: sub } = sb().auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser(session.user);
        logLogin(session.user);
        loadNick(session.user.id);
        refreshScore();
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadNick, refreshScore, logLogin]);

  const saveNickname = useCallback(async (n: string) => {
    const { error } = await sb().rpc("set_nickname", { p_nick: n });
    if (error) throw error;
    setNickname(n.trim().replace(/\s+/g, " "));
    setMustRename(false);
  }, []);

  const saveSchool = useCallback(async (name: string, g: number) => {
    const { data, error } = await sb().rpc("set_my_school", { p_school_name: name, p_grade: g });
    if (error) throw error;
    const r = data as { school_id: string; school_name: string; grade: number };
    setSchool({ id: r.school_id, name: r.school_name });
    setGrade(r.grade);
    refreshScore();
  }, [refreshScore]);

  const refreshStatus = useCallback(async () => {
    const { data: st } = await sb().rpc("my_status");
    setWarned(!!(st as { warned?: boolean } | null)?.warned);
    setBanned(!!(st as { banned?: boolean } | null)?.banned);
  }, []);
  const ackWarning = useCallback(async () => {
    await sb().rpc("ack_warning");
    setWarned(false);
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
      logLogin(u);
      await Promise.all([loadNick(u.id), refreshScore()]);
    } catch (e) {
      setNotice(friendly(e));
    }
  }, [loadNick, refreshScore, logLogin]);

  const signOut = useCallback(async () => {
    const u = await signOutUser(false);
    setUser(u);
    setNickname(null);
    setMustRename(false);
    setSchool(null);
    setGrade(null);
    setPoints(0);
    setRank(null);
    if (u) await refreshScore();
  }, [refreshScore]);

  return createElement(Ctx.Provider, { value: {
    user, nickname, mustRename, isAnon: user?.is_anonymous ?? true, email: user?.email ?? null,
    school, grade, needSchool: !!nickname && (!school || !grade), saveSchool,
    points, rank, error, ready, authChecked, needLogin: !user, googleOn: loginRequired || (!!user && !user.is_anonymous), saveNickname, signInGoogle, signOut, enterAsGuest, notice, refreshScore,
    warned, banned, ackWarning, refreshStatus,
  } }, children);
}

export function useMe(): MeState {
  const v = useContext(Ctx);
  if (!v) throw new Error("MeProvider가 필요해");
  return v;
}
