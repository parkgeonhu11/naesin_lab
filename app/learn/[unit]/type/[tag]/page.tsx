"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import StagePlay from "@/components/learn/StagePlay";
import { unitBySlug } from "@/lib/learn/units";

export default function Page() {
  const { unit, tag } = useParams<{ unit: string; tag: string }>();
  const u = unitBySlug(unit);
  const full = u ? `${u.slug}.${tag}` : "";
  if (!u || !u.types.some((t) => t.tag === full)) return <p className="muted">없는 유형이야. <Link className="link" href="/learn">수학 학습으로</Link></p>;
  return <StagePlay u={u} mode={{ kind: "type", tag: full }} />;
}
