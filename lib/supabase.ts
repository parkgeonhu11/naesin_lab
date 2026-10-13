"use client";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isConfigured = url.startsWith("https://") && key.length > 10;

let client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (!client) {
    client = createClient(url || "https://example.supabase.co", key || "missing", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

let pending: Promise<User> | null = null;

/** 세션이 없으면 익명 사용자를 자동으로 만든다 (회원가입 없이 바로 이용). */
export function ensureUser(): Promise<User> {
  if (pending) return pending;
  pending = (async () => {
    const { data } = await sb().auth.getSession();
    if (data.session?.user) return data.session.user;
    const { data: anon, error } = await sb().auth.signInAnonymously();
    if (error || !anon.user) throw error ?? new Error("익명 로그인 실패");
    return anon.user;
  })();
  pending.catch(() => {
    pending = null;
  });
  return pending;
}

/** 로그인 후 돌아올 주소 (지금 보던 페이지) */
const backHere = () => `${location.origin}${location.pathname}${location.search}`;

/**
 * Google로 로그인.
 * - 지금 익명으로 쓰고 있으면, 이 계정에 Google을 "연결"해서 지금까지 푼 기록과 별명을 그대로 이어 간다.
 * - 그 Google 계정이 이미 다른 기록을 갖고 있으면(다른 기기에서 쓰던 계정) 그 계정으로 로그인한다.
 */
export async function signInWithGoogle(): Promise<void> {
  const { data } = await sb().auth.getSession();
  const u = data.session?.user;
  if (u?.is_anonymous) {
    const { error } = await sb().auth.linkIdentity({ provider: "google", options: { redirectTo: backHere() } });
    if (!error) return;
    if (!/manual linking|identity.*exists/i.test(error.message)) throw error;
  }
  const { error } = await sb().auth.signInWithOAuth({ provider: "google", options: { redirectTo: backHere() } });
  if (error) throw error;
}

/**
 * Google에서 돌아왔는데 "이미 다른 계정에 연결된 Google"이라는 오류가 있으면
 * 그 계정으로 로그인을 이어서 한다. (다른 기기에서 쓰던 계정으로 들어오는 경우)
 * 돌려주는 값: 화면에 띄울 안내 문장 (아무 일 없으면 null)
 */
export async function handleOAuthReturn(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(location.search + "&" + location.hash.replace(/^#/, ""));
  const code = params.get("error_code");
  if (!code) return null;
  const clean = () => history.replaceState(null, "", location.pathname);
  if ((code === "identity_already_exists" || code === "email_exists") && !sessionStorage.getItem("nl-oauth-retry")) {
    sessionStorage.setItem("nl-oauth-retry", "1");
    clean();
    await sb().auth.signInWithOAuth({ provider: "google", options: { redirectTo: backHere() } });
    return "이미 쓰던 계정으로 로그인하는 중…";
  }
  sessionStorage.removeItem("nl-oauth-retry");
  const desc = params.get("error_description")?.replace(/\+/g, " ") ?? code;
  clean();
  return `Google 로그인을 못 했어: ${desc}`;
}

/** 로그아웃. 로그인 필수가 아니면 새 임시(익명) 사용자로 다시 시작한다. */
export async function signOutUser(startAnon: boolean): Promise<User | null> {
  await sb().auth.signOut();
  pending = null;
  return startAnon ? ensureUser() : null;
}

/**
 * Supabase에 Google 로그인이 켜져 있는지.
 * 켜져 있으면 처음 들어올 때 Google 로그인을 꼭 하게 하고,
 * 아직 안 켜져 있으면(설정 전) 예전처럼 임시 계정으로 들어가게 해서 사이트가 멈추지 않게 한다.
 */
export async function googleEnabled(): Promise<boolean> {
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!r.ok) return false;
    const j = (await r.json()) as { external?: Record<string, boolean> };
    return !!j.external?.google;
  } catch {
    return false;
  }
}

/** Supabase 오류를 학생이 읽을 수 있는 문장으로 바꾼다. */
export function friendly(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/Anonymous sign-ins are disabled/i.test(msg)) return "Supabase에서 익명 로그인이 꺼져 있어. 설치 안내서 4단계를 확인해 줘.";
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return "아직 Google 로그인이 켜져 있지 않아. 관리자가 Supabase에서 Google 로그인을 설정해야 해.";
  if (/manual linking is disabled/i.test(msg)) return "Supabase에서 '계정 연결(Manual linking)'이 꺼져 있어. 관리자가 켜야 해.";
  if (/fetch|network/i.test(msg)) return "서버에 연결할 수 없어. 인터넷 연결을 확인하고 새로고침해 줘.";
  return msg;
}
