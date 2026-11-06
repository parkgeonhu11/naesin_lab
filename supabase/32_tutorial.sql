-- 32. 처음 온 사람용 튜토리얼: 끝냈는지 기록하고 '첫걸음' 배지를 준다 (점수는 안 줌)
alter table public.profiles add column if not exists tutorial_done_at timestamptz;
alter table public.profiles add column if not exists tutorial_badge boolean not null default false;

-- 내 튜토리얼 상태: 끝냈는지, 배지 있는지, 지금까지 끝낸 문제 수(많이 푼 사람은 자동으로 안 띄움)
create or replace function public.my_tutorial()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'done',  (select pr.tutorial_done_at is not null from profiles pr where pr.user_id = auth.uid()),
    'badge', coalesce((select pr.tutorial_badge from profiles pr where pr.user_id = auth.uid()), false),
    'solved', (select count(*) from score_events s where s.user_id = auth.uid() and s.reason = 'solve')
  )
$$;
grant execute on function public.my_tutorial() to authenticated;

-- 튜토리얼 끝 (p_completed = 끝까지 했으면 true → 배지, 건너뛰었으면 false)
create or replace function public.finish_tutorial(p_completed boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인 세션이 없어'; end if;
  update profiles
     set tutorial_done_at = coalesce(tutorial_done_at, now()),
         tutorial_badge = tutorial_badge or coalesce(p_completed, false)
   where user_id = auth.uid();
  return public.my_tutorial();
end $$;
grant execute on function public.finish_tutorial(boolean) to authenticated;

-- 튜토리얼에서 같이 풀 첫 문제: 내 학년(없으면 공통) 기초 객관식 중 아직 안 끝낸 것, 많이 풀린 문제부터
create or replace function public.tutorial_problem()
returns int language sql stable security definer set search_path = public as $$
  with me as (
    select pr.grade g, pr.school_id s from profiles pr where pr.user_id = auth.uid()
  )
  select q.no
  from questions q
  left join me on true
  where q.status = 'published' and q.difficulty = 1 and q.qtype = 'mc'
    and (me.g is null or q.grade is null or q.grade = me.g)
    and (q.school_id is null or q.school_id = me.s)
    and not exists (select 1 from score_events e where e.user_id = auth.uid() and e.question_id = q.id and e.reason = 'solve')
  order by (select count(*) from score_events e where e.question_id = q.id and e.reason = 'solve' and e.points > 0) desc, q.no
  limit 1
$$;
grant execute on function public.tutorial_problem() to authenticated;
