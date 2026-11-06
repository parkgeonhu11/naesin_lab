"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import StagePlay from "@/components/learn/StagePlay";
import { unitBySlug } from "@/lib/learn/units";

export default function Page() {
  const { unit } = useParams<{ unit: string }>();
  const u = unitBySlug(unit);
  if (!u) return <p className="muted">없는 단원이야. <Link className="link" href="/learn">수학 학습으로</Link></p>;
  return <StagePlay u={u} mode={{ kind: "basic" }} />;
}
