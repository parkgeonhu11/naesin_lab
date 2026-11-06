-- 33. 수학 학습(커리큘럼) — 개념 → 기본 → 유형 → 실전 + 1·3·7일 오답 복습
--   문제 본문·보기·힌트는 앱 코드(lib/learn)에 있고, 정답·해설·분류만 여기(learn_items)에 둔다.
--   learn_items 는 아무도 직접 못 읽는다. 채점은 learn_submit 으로만.
--   (정답이 든 INSERT 는 저장소에 올리지 않고 DB에만 넣는다)

create table if not exists public.learn_items (
  key         text primary key,              -- 예: 'poly.b03'
  unit        text not null,                 -- 예: 'cm1.poly'
  stage       text not null check (stage in ('concept','basic','type','practical')),
  lesson      text,                          -- 개념 확인 문제가 속한 레슨
  type_tag    text not null,                 -- 오답 복습 때 같은 유형 새 문제를 고르는 기준
  qtype       text not null check (qtype in ('mc','short')),
  answer      smallint,                      -- 객관식 정답 (0부터)
  answer_text text,                          -- 단답형 정답 ('|'로 여러 답 허용)
  explanation text not null default ''
);
alter table public.learn_items enable row level security;

create table if not exists public.learn_attempts (
  id         bigserial primary key,
  user_id    uuid not null,
  item_key   text not null references public.learn_items(key) on delete cascade,
  correct    boolean not null,
  hints      smallint not null default 0,    -- 연 힌트 수 (3이면 맞혀도 통과 계산에서 빼고, 4 = 풀이 봄)
  mode       text not null default 'learn' check (mode in ('learn','review','practical')),
  created_at timestamptz not null default now()
);
create index if not exists learn_attempts_user_idx on public.learn_attempts(user_id, item_key, created_at desc);
alter table public.learn_attempts enable row level security;

create table if not exists public.learn_reviews (
  user_id     uuid not null,
  unit        text not null,
  type_tag    text not null,
  source_key  text not null,                 -- 처음 틀린 문제
  step        smallint not null default 1,   -- 1: 1일 뒤, 2: 3일 뒤, 3: 7일 뒤
  due_at      timestamptz not null,
  fail_streak smallint not null default 0,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  primary key (user_id, type_tag)
);
alter table public.learn_reviews enable row level security;

-- 단답 비교: 공백·곱하기 기호 무시
create or replace function public.learn_norm(t text)
returns text language sql immutable as $$
  select replace(replace(replace(replace(lower(coalesce(t,'')), ' ', ''), '×', '*'), '−', '-'), '^', '')
$$;

-- 채점. p_hints: 연 힌트 수(0~3), 4 = 풀이 보기(오답 처리). p_mode: learn / review / practical
create or replace function public.learn_submit(p_key text, p_choice int, p_text text, p_hints int default 0, p_mode text default 'learn')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); it learn_items; ok boolean; credited boolean; rv learn_reviews; nxt smallint;
  review_msg text := null;
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
    -- 처음 틀린(또는 풀이를 본) 유형은 1일 뒤 복습에 올린다. 이미 복습 중이면 그대로
    insert into learn_reviews(user_id, unit, type_tag, source_key, step, due_at)
    values (uid, it.unit, it.type_tag, p_key, 1, now() + interval '1 day')
    on conflict (user_id, type_tag) do update
      set step = 1, due_at = now() + interval '1 day', source_key = excluded.source_key, done_at = null
      where learn_reviews.done_at is not null;
    review_msg := 'queued';
  end if;

  return jsonb_build_object('correct', ok, 'credited', credited, 'answer', it.answer,
    'answer_text', split_part(coalesce(it.answer_text,''), '|', 1), 'explanation', it.explanation, 'review', review_msg);
end $$;
grant execute on function public.learn_submit(text, int, text, int, text) to authenticated;

-- 단원 진행 상황 한 번에: 레슨별 확인 문제, 기본, 유형별, 실전, 복습, 내가 본 문제
create or replace function public.learn_status(p_unit text)
returns jsonb language sql stable security definer set search_path = public as $$
  with a as (
    select la.*, li.stage, li.lesson, li.type_tag,
           row_number() over (partition by la.item_key order by la.created_at desc) rn_item
    from learn_attempts la join learn_items li on li.key = la.item_key
    where la.user_id = auth.uid() and li.unit = p_unit
  ),
  latest as (select * from a where rn_item = 1),
  -- 개념: 레슨별 확인 문제 최신 결과
  concept as (
    select lesson, count(*) filter (where correct) ok, count(*) n
    from latest where stage = 'concept' and mode = 'learn' group by lesson
  ),
  -- 기본: 최근 10번 시도
  basic as (
    select count(*) filter (where correct) ok, count(*) n from (
      select correct from a where stage = 'basic' and mode = 'learn' order by created_at desc limit 10
    ) t
  ),
  -- 유형: 유형별 최근 4번 시도
  typ as (
    select type_tag, count(*) filter (where correct) ok, count(*) n from (
      select type_tag, correct, row_number() over (partition by type_tag order by created_at desc) r
      from a where stage = 'type' and mode = 'learn'
    ) t where r <= 4 group by type_tag
  ),
  prac as (
    select count(*) filter (where correct) ok, count(*) n from latest where stage = 'practical'
  )
  select jsonb_build_object(
    'concept', coalesce((select jsonb_object_agg(lesson, jsonb_build_object('ok', ok, 'n', n)) from concept), '{}'::jsonb),
    'basic', (select jsonb_build_object('ok', ok, 'n', n) from basic),
    'types', coalesce((select jsonb_object_agg(type_tag, jsonb_build_object('ok', ok, 'n', n)) from typ), '{}'::jsonb),
    'practical', (select jsonb_build_object('ok', ok, 'n', n) from prac),
    'seen', coalesce((select jsonb_object_agg(item_key, correct) from latest), '{}'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('type_tag', type_tag, 'step', step, 'due_at', due_at, 'source', source_key, 'fails', fail_streak) order by due_at)
                         from learn_reviews where user_id = auth.uid() and unit = p_unit and done_at is null), '[]'::jsonb),
    'mastered', (select count(*) from learn_reviews where user_id = auth.uid() and unit = p_unit and done_at is not null)
  )
$$;
grant execute on function public.learn_status(text) to authenticated;
