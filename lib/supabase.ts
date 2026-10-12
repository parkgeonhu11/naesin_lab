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

/** Supabase 오류를 학생이 읽을 수 있는 문장으로 바꾼다. */
export function friendly(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/Anonymous sign-ins are disabled/i.test(msg)) return "Supabase에서 익명 로그인이 꺼져 있어. 설치 안내서 4단계를 확인해 줘.";
  if (/fetch|network/i.test(msg)) return "서버에 연결할 수 없어. 인터넷 연결을 확인하고 새로고침해 줘.";
  return msg;
}
