"use client";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ensureUser, friendly, isConfigured, sb } from "./supabase";

/** 현재 사용자(익명 포함)와 닉네임을 불러온다. */
export function useMe() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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
        await loadNick(u.id);
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
  }, [loadNick]);

  const saveNickname = useCallback(async (n: string) => {
    const { error } = await sb().rpc("set_nickname", { p_nick: n });
    if (error) throw error;
    setNickname(n.trim());
  }, []);

  return { user, nickname, error, ready, saveNickname };
}
