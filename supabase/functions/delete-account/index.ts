// 회원 탈퇴: 로그인한 본인만. 내 기록을 지우고 로그인 계정까지 삭제한다.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out(405, { error: "POST만 돼" });
  const auth = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u, error: ue } = await asUser.auth.getUser();
  if (ue || !u.user) return out(401, { error: "로그인 세션이 없어" });

  const { data: isAdmin } = await asUser.rpc("is_admin");
  if (isAdmin) return out(400, { error: "관리자 계정은 여기서 탈퇴할 수 없어" });
  const me = u.user.id;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // 내 기록 지우기 (순서: 투표 → 답변 → 질문 … → 프로필). 공개된 내 문제는 남기고 작성자만 지운다.
  const mine = ["qna_votes", "qna_answers", "qna_threads", "question_opens", "question_reports", "solve_traces", "cheat_flags",
    "login_events", "score_events", "score_penalties", "attempts", "attempts_backup", "mock_attempts", "admin_grants"];
  for (const t of mine) {
    const { error } = await admin.from(t).delete().eq("user_id", me);
    if (error) return out(500, { error: `기록 삭제 중 문제가 생겼어 (${t})` });
  }
  const steps = [
    admin.from("questions").delete().eq("author", me).neq("status", "published"),
    admin.from("questions").update({ author: null, author_nick: "탈퇴한 학생" }).eq("author", me),
    admin.from("schools").update({ created_by: null }).eq("created_by", me),
    admin.from("profiles").delete().eq("user_id", me),
  ];
  for (const s of steps) { const { error } = await s; if (error) return out(500, { error: "기록 삭제 중 문제가 생겼어" }); }

  const { error: ae } = await admin.auth.admin.deleteUser(me);
  if (ae) return out(500, { error: "계정 삭제 중 문제가 생겼어. 잠시 뒤 다시 해 줘." });
  return out(200, { ok: true });
});
