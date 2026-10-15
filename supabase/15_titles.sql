-- 15. 과목 마스터 칭호: 지금 공개된 문제를 그 과목에서 전부 맞힌 사람에게 칭호를 준다.
--     새 문제가 추가되면 그것까지 풀어야 다시 칭호가 붙는다. 모든 과목을 다 풀면 'all'(전과목 마스터).
create or replace function public.subject_masters()
returns table(user_id uuid, nickname text, subject text)
language sql stable security definer set search_path = public as $$
  with tot as (
    select q.subject, count(*) as n from questions q where q.status = 'published' group by q.subject
  ), s as (
    select se.user_id, q.subject, count(distinct q.id) as c
    from score_events se join questions q on q.id = se.question_id and q.status = 'published'
    where se.reason = 'solve'
    group by se.user_id, q.subject
  ), m as (
    select s.user_id, s.subject from s join tot on tot.subject = s.subject where s.c >= tot.n
  )
  select m.user_id, p.nickname, m.subject
  from m join profiles p on p.user_id = m.user_id where p.banned_at is null
  union all
  select m.user_id, p.nickname, 'all'
  from m join profiles p on p.user_id = m.user_id where p.banned_at is null
  group by m.user_id, p.nickname
  having count(*) = (select count(*) from tot)
$$;
grant execute on function public.subject_masters() to anon, authenticated;

-- 한 사람의 과목별 진행도 (칭호까지 몇 문제 남았는지)
create or replace function public.title_progress(p_user uuid)
returns table(subject text, solved bigint, total bigint)
language sql stable security definer set search_path = public as $$
  with tot as (
    select q.subject, count(*) as n from questions q where q.status = 'published' group by q.subject
  ), s as (
    select q.subject, count(distinct q.id) as c
    from score_events se join questions q on q.id = se.question_id and q.status = 'published'
    where se.reason = 'solve' and se.user_id = p_user
    group by q.subject
  )
  select tot.subject, coalesce(s.c, 0), tot.n from tot left join s on s.subject = tot.subject
$$;
grant execute on function public.title_progress(uuid) to anon, authenticated;
