-- 34. 수학 학습도 점수로: score_events 에 reason = 'learn' (과목 '수학')으로 넣어서 총점·랭킹·레벨에 반영
--   - 문제마다 처음 '인정된 정답'일 때 한 번만: 개념 확인 2 · 기본 5 · 유형 8 · 실전 12
--   - 오답 복습 한 단계 성공 3 (같은 유형·같은 단계는 하루 한 번)
--   - 레슨 통과 10, 단계 통과 보너스: 개념 20 · 기본 20 · 유형 30 · 실전 50 (한 번만)
--   - 틀려도 감점 없음. 힌트 3개를 다 쓰거나 풀이를 보면 0점
--   중복 지급은 learn_rewards 의 (user_id, kind, ref) 로 막는다.

alter table public.score_events drop constraint if exists score_events_reason_check;
alter table public.score_events add constraint score_events_reason_check
  check (reason in ('solve', 'author', 'report', 'admin', 'learn'));

create table if not exists public.learn_rewards (
  user_id    uuid not null,
  kind       text not null,      -- item / review / lesson / stage
  ref        text not null,
  points     int  not null,
  event_id   bigint references public.score_events(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);
alter table public.learn_rewards enable row level security;

-- 한 번만 주는 점수. 새로 줬으면 점수, 이미 받았으면 0
create or replace function public.learn_give(uid uuid, p_kind text, p_ref text, p_points int)
returns int language plpgsql security definer set search_path = public as $$
declare ev bigint;
begin
  if p_points <= 0 then return 0; end if;
  insert into learn_rewards(user_id, kind, ref, points) values (uid, p_kind, p_ref, p_points)
  on conflict do nothing;
  if not found then return 0; end if;
  insert into score_events(user_id, question_id, reason, subject, points) values (uid, null, 'learn', 'ma', p_points)
  returning id into ev;
  update learn_rewards set event_id = ev where user_id = uid and kind = p_kind and ref = p_ref;
  return p_points;
end $$;
revoke all on function public.learn_give(uuid, text, text, int) from public, anon, authenticated;

-- 통과 보너스 확인 (learn_status 와 같은 기준)
create or replace function public.learn_bonus_check(uid uuid, p_unit text, p_lesson text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  out jsonb := '[]'::jsonb; g int; n_lessons int; n_lessons_ok int; b_ok int; n_types int; n_types_ok int; p_ok int; p_total int;
begin
  -- 레슨 통과: 그 레슨 확인 문제의 최신 결과 중 4개 이상 정답
  if p_lesson is not null then
    select count(*) filter (where t.correct) into g from (
      select distinct on (la.item_key) la.correct from learn_attempts la join learn_items li on li.key = la.item_key
      where la.user_id = uid and li.lesson = p_lesson and li.stage = 'concept' and la.mode = 'learn'
      order by la.item_key, la.created_at desc) t;
    if g >= 4 and learn_give(uid, 'lesson', p_lesson, 10) > 0 then
      out := out || jsonb_build_object('label', '레슨 통과 보너스', 'points', 10);
    end if;
  end if;

  -- 개념 단계: 모든 레슨 통과
  select count(distinct lesson) into n_lessons from learn_items where unit = p_unit and stage = 'concept';
  select count(*) into n_lessons_ok from learn_rewards where user_id = uid and kind = 'lesson'
    and ref in (select distinct lesson from learn_items where unit = p_unit and stage = 'concept');
  if n_lessons > 0 and n_lessons_ok >= n_lessons and learn_give(uid, 'stage', p_unit || ':concept', 20) > 0 then
    out := out || jsonb_build_object('label', '개념 단계 통과 보너스', 'points', 20);
  end if;

  -- 기본: 최근 10번 중 8개
  select count(*) filter (where t.correct) into b_ok from (
    select la.correct from learn_attempts la join learn_items li on li.key = la.item_key
    where la.user_id = uid and li.unit = p_unit and li.stage = 'basic' and la.mode = 'learn'
    order by la.created_at desc limit 10) t;
  if b_ok >= 8 and learn_give(uid, 'stage', p_unit || ':basic', 20) > 0 then
    out := out || jsonb_build_object('label', '기본 단계 통과 보너스', 'points', 20);
  end if;

  -- 유형: 모든 유형에서 최근 4번 중 3개
  select count(distinct type_tag) into n_types from learn_items where unit = p_unit and stage = 'type';
  select count(*) into n_types_ok from (
    select t.type_tag from (
      select li.type_tag, la.correct, row_number() over (partition by li.type_tag order by la.created_at desc) r
      from learn_attempts la join learn_items li on li.key = la.item_key
      where la.user_id = uid and li.unit = p_unit and li.stage = 'type' and la.mode = 'learn') t
    where t.r <= 4 group by t.type_tag having count(*) filter (where t.correct) >= 3) x;
  if n_types > 0 and n_types_ok >= n_types and learn_give(uid, 'stage', p_unit || ':type', 30) > 0 then
    out := out || jsonb_build_object('label', '유형 단계 통과 보너스', 'points', 30);
  end if;

  -- 실전: 문제별 최신 결과 70% 이상
  select count(*) into p_total from learn_items where unit = p_unit and stage = 'practical';
  select count(*) filter (where t.correct) into p_ok from (
    select distinct on (la.item_key) la.correct from learn_attempts la join learn_items li on li.key = la.item_key
    where la.user_id = uid and li.unit = p_unit and li.stage = 'practical'
    order by la.item_key, la.created_at desc) t;
  if p_total > 0 and p_ok >= ceil(p_total * 0.7) and learn_give(uid, 'stage', p_unit || ':practical', 50) > 0 then
    out := out || jsonb_build_object('label', '실전 통과! 단원 완주 보너스', 'points', 50);
  end if;
  return out;
end $$;
revoke all on function public.learn_bonus_check(uuid, text, text) from public, anon, authenticated;

-- 채점 + 점수. (33번 learn_submit 을 점수까지 주도록 바꾼 것)
create or replace function public.learn_submit(p_key text, p_choice int, p_text text, p_hints int default 0, p_mode text default 'learn')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); it learn_items; ok boolean; credited boolean; rv learn_reviews; nxt smallint;
  review_msg text := null; earned int := 0; bonus jsonb := '[]'::jsonb; base int;
begin
  if uid is null then raise exception '로그인 세션이 없어'; end if;
  select * into it from learn_items where key = p_key;
  if not found then raise exception '문제를 찾을 수 없어'; end if;
  if coalesce(p_hints, 0) >= 4 then
    ok := false;
  elsif it.qtype = 'mc' then
    ok := p_choice is not null and p_choice = it.answer;
  else
    ok := exists (select 1 from unnest(string_to_array(it.answer_text, '|')) a where learn_norm(a) = learn_norm(p_text));
  end if;
  credited := ok and coalesce(p_hints, 0) < 3;
  insert into learn_attempts(user_id, item_key, correct, hints, mode)
  values (uid, p_key, credited, least(greatest(coalesce(p_hints,0),0),4), case when p_mode in ('review','practical') then p_mode else 'learn' end);

  if p_mode = 'review' then
    select * into rv from learn_reviews where user_id = uid and type_tag = it.type_tag and done_at is null;
    if found then
      if credited then
        nxt := rv.step + 1;
        earned := earned + learn_give(uid, 'review', it.type_tag || ':' || rv.step || ':' || to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD'), 3);
        if nxt > 3 then
          update learn_reviews set done_at = now(), step = 3 where user_id = uid and type_tag = it.type_tag;
          review_msg := 'mastered';
        else
          update learn_reviews set step = nxt, due_at = now() + case nxt when 2 then interval '3 days' else interval '7 days' end
           where user_id = uid and type_tag = it.type_tag;
          review_msg := 'next';
        end if;
      else
        update learn_reviews set step = 1, due_at = now() + interval '1 day', fail_streak = fail_streak + 1
         where user_id = uid and type_tag = it.type_tag;
        review_msg := case when rv.fail_streak + 1 >= 2 then 'back_to_concept' else 'reset' end;
      end if;
    end if;
  elsif not credited and it.stage <> 'concept' then
    insert into learn_reviews(user_id, unit, type_tag, source_key, step, due_at)
    values (uid, it.unit, it.type_tag, p_key, 1, now() + interval '1 day')
    on conflict (user_id, type_tag) do update
      set step = 1, due_at = now() + interval '1 day', source_key = excluded.source_key, done_at = null
      where learn_reviews.done_at is not null;
    review_msg := 'queued';
  end if;

  -- 문제 점수: 처음 인정된 정답 한 번만 (복습 모드에서 처음 맞힌 문제도 포함)
  if credited then
    base := case it.stage when 'concept' then 2 when 'basic' then 5 when 'type' then 8 else 12 end;
    earned := earned + learn_give(uid, 'item', p_key, base);
    bonus := learn_bonus_check(uid, it.unit, it.lesson);
    earned := earned + coalesce((select sum((b->>'points')::int) from jsonb_array_elements(bonus) b), 0);
  end if;

  return jsonb_build_object('correct', ok, 'credited', credited, 'answer', it.answer,
    'answer_text', split_part(coalesce(it.answer_text,''), '|', 1), 'explanation', it.explanation, 'review', review_msg,
    'points', earned, 'bonus', bonus);
end $$;
grant execute on function public.learn_submit(text, int, text, int, text) to authenticated;

-- 단원에서 모은 학습 점수 (learn_status 에 덧붙여 보여 주기용)
create or replace function public.learn_points(p_unit text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(r.points), 0)::int from learn_rewards r
  where r.user_id = auth.uid() and (
    (r.kind = 'item' and r.ref in (select key from learn_items where unit = p_unit)) or
    (r.kind = 'lesson' and r.ref in (select lesson from learn_items where unit = p_unit)) or
    (r.kind = 'stage' and r.ref like p_unit || ':%') or
    (r.kind = 'review' and split_part(r.ref, ':', 1) in (select type_tag from learn_items where unit = p_unit)))
$$;
grant execute on function public.learn_points(text) to authenticated;
