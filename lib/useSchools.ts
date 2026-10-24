"use client";
import { useEffect, useState } from "react";
import { isConfigured, sb } from "./supabase";

/** 학교 id → 짧은 이름("연북중"). 한 번만 불러와서 화면끼리 같이 쓴다. */
let cache: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;

export const shortSchool = (name: string) => name.replace(/학교$/, "");

function load(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = Promise.resolve(sb().from("schools").select("id,name")).then(({ data }) => {
      const m: Record<string, string> = {};
      ((data as { id: string; name: string }[]) ?? []).forEach((s) => (m[s.id] = shortSchool(s.name)));
      cache = m;
      return m;
    }, () => ({}));
  }
  return pending;
}

export function useSchoolNames() {
  const [names, setNames] = useState<Record<string, string>>(cache ?? {});
  useEffect(() => {
    if (!isConfigured || cache) return;
    let alive = true;
    load().then((m) => alive && setNames(m));
    return () => { alive = false; };
  }, []);
  return names;
}
