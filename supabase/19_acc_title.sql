-- 19. 정답률왕 칭호: 제출 정답률(맞은 제출 ÷ 전체 제출)이 가장 높은 한 명에게 'acc' 칭호를 준다.
--     제출이 50번 이상인 사람만 대상(몇 문제만 풀고 100%가 되는 걸 막으려고). 같으면 제출이 많은 사람.
--     기록이 바뀌면 칭호도 자동으로 옮겨 가. subject_masters()에 한 줄로 같이 내려보낸다.
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
  ), acc as (
    select a.user_id, count(*) as subs, count(*) filter (where a.is_correct) as ok
    from attempts a join profiles p on p.user_id = a.user_id and p.banned_at is null
    group by a.user_id
    having count(*) >= 50
    order by count(*) filter (where a.is_correct)::numeric / count(*) desc, count(*) desc
    limit 1
  )
  select m.user_id, p.nickname, m.subject
  from m join profiles p on p.user_id = m.user_id where p.banned_at is null
  union all
  select m.user_id, p.nickname, 'all'
  from m join profiles p on p.user_id = m.user_id where p.banned_at is null
  group by m.user_id, p.nickname
  having count(*) = (select count(*) from tot)
  union all
  select acc.user_id, p.nickname, 'acc'
  from acc join profiles p on p.user_id = acc.user_id
$$;
grant execute on function public.subject_masters() to anon, authenticated;
