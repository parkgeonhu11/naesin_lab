-- 11. 랭킹에서 친구 이름을 누르면: 그 친구가 맞힌 문제 목록 (틀린 문제·낸 답은 안 보임, 정지된 사람은 안 보임)
create or replace function public.user_solved(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when p.banned_at is not null then null else jsonb_build_object(
    'nickname', coalesce(p.nickname, '이름 없음'),
    'is_me', p.user_id = auth.uid(),
    'points', coalesce((select sum(s.points) from score_events s where s.user_id = p.user_id), 0)
            + coalesce((select sum(sp.points) from score_penalties sp where sp.user_id = p.user_id), 0),
    'submissions', (select count(*) from attempts a where a.user_id = p.user_id),
    'correct', (select count(*) from attempts a where a.user_id = p.user_id and a.is_correct),
    'solved', coalesce((
      select jsonb_agg(jsonb_build_object('no', q.no, 'subject', q.subject, 'unit', q.unit, 'topic', q.topic,
               'difficulty', q.difficulty, 'title', left(regexp_replace(split_part(q.body, E'\n', 1), '\s+', ' ', 'g'), 50),
               'points', s.points, 'at', s.created_at) order by s.created_at desc)
      from score_events s join questions q on q.id = s.question_id
      where s.user_id = p.user_id and s.reason = 'solve' and s.points > 0 and q.status = 'published'), '[]'::jsonb)
  ) end
  from profiles p where p.user_id = p_user
$$;
grant execute on function public.user_solved(uuid) to authenticated;
revoke execute on function public.user_solved(uuid) from anon, public;
