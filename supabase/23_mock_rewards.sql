-- 23. 비공개 예상 시험 보상: 첫 응시(ranked)에서 맞힌 문항 하나당 40점을 사이트 점수(score_events, reason='admin')로 지급.
--     mock_grade 끝에서 mock_reward(attempt) 호출. mock_rewards 로 한 응시당 한 번만 지급.
create table if not exists public.mock_rewards (
  attempt_id bigint primary key references public.mock_attempts(id) on delete cascade,
  user_id uuid not null, exam_id text not null, correct int not null, points int not null,
  event_id bigint, created_at timestamptz not null default now()
);
alter table public.mock_rewards enable row level security;

create or replace function public.mock_reward(p_attempt bigint)
returns void language plpgsql security definer set search_path = public as $$
declare a mock_attempts; e mock_exams; ev bigint; pts int;
begin
  select * into a from mock_attempts where id = p_attempt;
  if not found or a.status <> 'done' or not a.ranked or coalesce(a.correct, 0) <= 0 then return; end if;
  select * into e from mock_exams where id = a.exam_id;
  if e.published then return; end if;
  if exists (select 1 from mock_rewards where attempt_id = a.id) then return; end if;
  pts := a.correct * 40;
  insert into score_events(user_id, question_id, reason, subject, points)
  values (a.user_id, null, 'admin', e.subject, pts) returning id into ev;
  insert into mock_rewards(attempt_id, user_id, exam_id, correct, points, event_id)
  values (a.id, a.user_id, a.exam_id, a.correct, pts, ev);
end $$;
revoke all on function public.mock_reward(bigint) from public, anon, authenticated;
-- mock_grade: 마지막 줄에 perform mock_reward(p_attempt); 추가 (DB에 적용됨)

-- 문항당 점수는 시험마다 mock_exams.reward_per 로 정함 (실전 ② = 20, 최고난도 ③ = 40). null 이면 보상 없음.
alter table public.mock_exams add column if not exists reward_per int;
-- mock_reward: pts := a.correct * e.reward_per  (reward_per 가 없거나 공개 시험이면 지급 안 함)
