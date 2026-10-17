-- 20. 관리자 전용 "올백 문제 모음": 고난도(난이도 4~5) + 과목별 필수 20 + 정답률 낮은 함정 문제를 정답·해설과 함께 한 번에.
--     관리자만 부를 수 있어(is_admin). 내 풀이 상태(맞힘/틀림/안 품)도 같이 준다.
create or replace function public.admin_allback()
returns table(no int, subject text, unit text, topic text, qtype text, difficulty smallint, body text, choices jsonb, figure jsonb,
              explanation text, answer smallint, answer_text text, submissions bigint, accuracy int, must boolean, reasons text[], my_state text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 볼 수 있어'; end if;
  return query
  with st as (
    select a.question_id, count(*) subs, round(100.0 * count(*) filter (where a.is_correct) / nullif(count(*), 0))::int acc
    from attempts a group by a.question_id
  ), me as (
    select a.question_id, bool_or(a.is_correct) ok from attempts a where a.user_id = auth.uid() group by a.question_id
  )
  select q.no, q.subject, q.unit, q.topic, q.qtype, q.difficulty, q.body, to_jsonb(q.choices), to_jsonb(q.figure),
         q.explanation, qa.answer, qa.answer_text, coalesce(st.subs, 0), st.acc, mp.question_id is not null,
         array_remove(array[
           case when q.difficulty >= 5 then '최고난도' when q.difficulty = 4 then '고난도' end,
           case when mp.question_id is not null then '필수 20' end,
           case when st.subs >= 5 and st.acc < 60 then '정답률 ' || st.acc || '%' end
         ], null),
         case when me.ok then 'solved' when me.question_id is not null then 'tried' else 'new' end
  from questions q
  left join question_answers qa on qa.question_id = q.id
  left join st on st.question_id = q.id
  left join must_picks mp on mp.question_id = q.id
  left join me on me.question_id = q.id
  where q.status = 'published'
    and (q.difficulty >= 4 or mp.question_id is not null or (st.subs >= 5 and st.acc < 60))
  order by q.subject, q.unit, q.topic, q.difficulty desc, q.no;
end $$;
revoke all on function public.admin_allback() from public, anon;
grant execute on function public.admin_allback() to authenticated;
