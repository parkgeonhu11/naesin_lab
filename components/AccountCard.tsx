"use client";
import { useState } from "react";
import { GoogleButton } from "@/components/NicknameCard";
import { useMe } from "@/lib/useMe";

/** 내 계정: Google 연결 상태 + 로그인/로그아웃 */
export default function AccountCard({ compact = false }: { compact?: boolean }) {
  const { isAnon, email, signOut, ready, user, googleOn } = useMe();
  const [sure, setSure] = useState(false);
  if (!ready || !user) return null;
  if (isAnon && !googleOn) return null; // Google 로그인 설정 전

  if (isAnon) {
    return (
      <section className={`panel panel-body account-card warn${compact ? " compact" : ""}`}>
        <div className="grow">
          <b>지금은 게스트 계정이야 — 이 브라우저에만 저장돼</b>
          <div className="small muted">
            인터넷 기록을 지우거나 다른 기기·브라우저로 가면 이 계정은 <b>다시 찾을 수 없어</b>. Google로 로그인하면 지금까지 푼 기록·점수·별명이 그대로 Google 계정에 묶여.
          </div>
        </div>
        <GoogleButton label="Google로 로그인하고 기록 지키기" />
      </section>
    );
  }
  return (
    <section className="panel panel-body account-card">
      <div className="grow">
        <b>Google 계정으로 로그인됨</b>
        <div className="small muted">{email ?? "Google 계정"} · 다른 기기에서도 Google로 로그인하면 이 기록이 그대로 나와.</div>
      </div>
      <button
        type="button"
        className="btn line"
        onClick={async () => {
          if (!sure) return setSure(true);
          await signOut();
          setSure(false);
        }}
      >
        {sure ? "정말 로그아웃할래? (한 번 더 누르기)" : "로그아웃"}
      </button>
    </section>
  );
}
