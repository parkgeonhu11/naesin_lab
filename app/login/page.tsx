"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import LoginGate from "@/components/LoginGate";
import { useMe } from "@/lib/useMe";

/** 돌아갈 주소는 이 사이트 안의 경로만 허용 */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/login") ? v : "/");

function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get("next"));
  const { user, isAnon, authChecked } = useMe();
  // Google로 로그인돼 있으면 원래 보던 화면으로 돌려보낸다
  useEffect(() => {
    if (authChecked && user && !isAnon) router.replace(next);
  }, [authChecked, user, isAnon, next, router]);
  return <LoginGate next={next} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
