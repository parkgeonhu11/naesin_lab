-- 09. 문제별 "풀어 본 사람 / 맞힌 사람" 수
-- 풀어 본 사람 = 한 번이라도 답을 냈거나 정답 보기를 한 사람 (같은 사람은 1명으로)
create or replace function public.problem_people()
returns table(question_id uuid, tried bigint, solved bigint)
language sql stable security definer set search_path = public as $$
  select u.question_id, count(distinct u.user_id),
         count(distinct u.user_id) filter (where u.ok)
  from (
    select a.question_id, a.user_id, a.is_correct as ok from attempts a
    union all
    select s.question_id, s.user_id, false from score_events s where s.reason = 'solve' and s.question_id is not null
  ) u
  join questions q on q.id = u.question_id and q.status = 'published'
  group by u.question_id
$$;
grant execute on function public.problem_people() to anon, authenticated;
