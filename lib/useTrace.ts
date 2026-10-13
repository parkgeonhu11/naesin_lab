"use client";
import { useCallback, useEffect, useRef } from "react";
import { sb } from "./supabase";

type Ev = { k: "open" | "leave" | "back" | "pick" | "submit" | "reveal"; t: number; d?: string | number; ok?: boolean };

/**
 * 풀이 기록: 문제를 연 뒤 다른 탭·앱으로 나갔다 온 때, 보기를 바꾼 때, 제출한 때를 시간순으로 모은다.
 * (화면을 녹화하지 않음. 관리자가 부정행위를 판단할 때 참고용)
 */
export function useTrace(key: string | null | undefined, questionId: string | null, mode: "problem" | "exam" = "problem") {
  const st = useRef<{ session: string; t0: number; ev: Ev[]; away: boolean; qid: string | null } | null>(null);

  const flush = useCallback(() => {
    const s = st.current;
    if (!s || s.ev.length < 2) return;
    sb().rpc("log_trace", { p_question: s.qid, p_mode: mode, p_session: s.session, p_events: s.ev }).then(() => {}, () => {});
  }, [mode]);

  const push = useCallback((e: Omit<Ev, "t">) => {
    const s = st.current;
    if (!s || s.ev.length >= 400) return;
    s.ev.push({ ...e, t: Math.round(performance.now() - s.t0) } as Ev);
  }, []);

  useEffect(() => {
    if (!key) return;
    st.current = { session: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, t0: performance.now(), ev: [{ k: "open", t: 0 }], away: false, qid: questionId };
    const leave = () => { const s = st.current; if (s && !s.away) { s.away = true; push({ k: "leave" }); } };
    const back = () => { const s = st.current; if (s && s.away) { s.away = false; push({ k: "back" }); } };
    const vis = () => (document.visibilityState === "hidden" ? leave() : back());
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", leave);
    window.addEventListener("focus", back);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", leave);
      window.removeEventListener("focus", back);
      window.removeEventListener("pagehide", flush);
      flush();
      st.current = null;
    };
  }, [key, questionId, push, flush]);

  return {
    pick: (d?: string | number) => push({ k: "pick", d }),
    submit: (ok: boolean, d?: string | number) => { push({ k: "submit", ok, d }); flush(); },
    reveal: () => { push({ k: "reveal" }); flush(); },
  };
}
