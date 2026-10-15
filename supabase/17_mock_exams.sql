-- 17. 예상 시험: 과목별 시험지 한 세트를 제한 시간 안에 풀고, 시험마다 따로 랭킹을 매긴다.
--   · 문제(mock_items)와 정답(mock_keys)은 바로 읽을 수 없다. 시험을 시작해야(mock_start) 문제를 받고,
--     제출해야(mock_submit) 정답과 해설을 받는다.
--   · 시간은 서버 시계로 잰다. 시작한 순간부터 제한 시간이 흐르고, 답은 중간중간 서버에 저장된다.
--   · 랭킹에는 그 시험의 '첫 번째 응시'만 들어간다. 다시 풀기는 연습으로만 기록된다.
--   · 랭킹 점수 = 맞은 개수 × 100 + 시간 보너스
--       시간 보너스 = (남은 초 ÷ 15) × (맞은 개수 ÷ 문항 수)   → 다 맞히고 빨리 풀수록 최대 100점
-- (문제와 정답 데이터는 이 파일에 넣지 않는다.)

create table if not exists public.mock_exams (
  id          text primary key,
  subject     text not null references public.subjects(code),
  title       text not null,
  scope       text,
  time_limit  int  not null default 1500 check (time_limit between 60 and 7200),
  sort        int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.mock_items (
  exam_id text not null references public.mock_exams(id) on delete cascade,
  no      int  not null,
  pts     int  not null default 3,
  stem    text not null,
  bogi    jsonb,
  fig     text,
  choices jsonb not null,
  lay     text not null default 'one',
  primary key (exam_id, no)
);

create table if not exists public.mock_keys (
  exam_id text not null,
  no      int  not null,
  ans     int  not null,
  expl    text,
  primary key (exam_id, no),
  foreign key (exam_id, no) references public.mock_items(exam_id, no) on delete cascade
);

-- 서술형: 랭킹에는 안 들어가고, 시험이 끝난 뒤 연습용으로 보여 준다.
create table if not exists public.mock_essays (
  exam_id text not null references public.mock_exams(id) on delete cascade,
  no      int  not null,
  pts     int  not null default 6,
  stem    text not null,
  fig     text,
  subs    jsonb,
  model   text not null,
  rubric  text,
  primary key (exam_id, no)
);

create table if not exists public.mock_attempts (
  id           bigserial primary key,
  exam_id      text not null references public.mock_exams(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  ranked       boolean not null,
  started_at   timestamptz not null default now(),
  deadline     timestamptz not null,
  saved        jsonb not null default '[]'::jsonb,
  saved_at     timestamptz,
  status       text not null default 'running' check (status in ('running', 'done')),
  submitted_at timestamptz,
  answers      jsonb,
  correct      int,
  total        int,
  pts_earned   int,
  pts_total    int,
  elapsed      int,
  score        int,
  auto         boolean not null default false
);
create index if not exists mock_attempts_exam on public.mock_attempts (exam_id, ranked, status);
create index if not exists mock_attempts_user on public.mock_attempts (user_id, exam_id);
create unique index if not exists mock_attempts_one_ranked on public.mock_attempts (exam_id, user_id) where ranked;

alter table public.mock_exams    enable row level security;
alter table public.mock_items    enable row level security;
alter table public.mock_keys     enable row level security;
alter table public.mock_essays   enable row level security;
alter table public.mock_attempts enable row level security;

drop policy if exists mock_exams_read on public.mock_exams;
create policy mock_exams_read on public.mock_exams for select using (published or public.is_admin());
drop policy if exists mock_attempts_own on public.mock_attempts;
create policy mock_attempts_own on public.mock_attempts for select using (user_id = auth.uid());
-- mock_items, mock_keys, mock_essays: 정책 없음 → 아래 함수로만 읽는다.

-- 채점 (제출된 답 배열 → 결과 저장). 내부용.
create or replace function public.mock_grade(p_attempt bigint, p_answers jsonb, p_elapsed int, p_auto boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  a mock_attempts;
  lim int;
  n int; c int; pe int; pt int; bonus numeric;
begin
  select * into a from mock_attempts where id = p_attempt for update;
  if a.status = 'done' then return; end if;
  select time_limit into lim from mock_exams where id = a.exam_id;
  select count(*),
         count(*) filter (where (p_answers ->> (i.no - 1)) is not null and (p_answers ->> (i.no - 1))::int = k.ans),
         coalesce(sum(i.pts) filter (where (p_answers ->> (i.no - 1)) is not null and (p_answers ->> (i.no - 1))::int = k.ans), 0),
         coalesce(sum(i.pts), 0)
    into n, c, pe, pt
  from mock_items i join mock_keys k on k.exam_id = i.exam_id and k.no = i.no
  where i.exam_id = a.exam_id;
  p_elapsed := greatest(0, least(p_elapsed, lim));
  bonus := case when n > 0 then ((lim - p_elapsed) / 15.0) * (c::numeric / n) else 0 end;
  update mock_attempts set
    status = 'done', submitted_at = now(), answers = p_answers,
    correct = c, total = n, pts_earned = pe, pts_total = pt,
    elapsed = p_elapsed, score = c * 100 + round(bonus)::int, auto = p_auto
  where id = p_attempt;
end $$;
revoke all on function public.mock_grade(bigint, jsonb, int, boolean) from public, anon, authenticated;

-- 시간이 지났는데 제출하지 않은 응시를 마지막으로 저장된 답으로 채점
create or replace function public.mock_close_expired(p_exam text)
returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select id, saved, extract(epoch from (deadline - started_at))::int as lim
    from mock_attempts
    where status = 'running' and now() > deadline + interval '20 seconds' and (p_exam is null or exam_id = p_exam)
  loop
    perform mock_grade(r.id, r.saved, r.lim, true);
  end loop;
end $$;
revoke all on function public.mock_close_expired(text) from public, anon, authenticated;

-- 시험 목록 (내 기록 포함)
create or replace function public.mock_list()
returns table(id text, subject text, title text, scope text, time_limit int, items int, essays int,
              takers int, my_status text, my_correct int, my_total int, my_elapsed int, my_score int, my_rank int, my_tries int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform mock_close_expired(null);
  return query
  with board as (
    select ma.exam_id, ma.user_id, ma.correct, ma.total, ma.elapsed, ma.score,
           rank() over (partition by ma.exam_id order by ma.score desc, ma.correct desc, ma.elapsed asc)::int as rk
    from mock_attempts ma join profiles p on p.user_id = ma.user_id
    where ma.ranked and ma.status = 'done' and p.banned_at is null
  )
  select e.id, e.subject, e.title, e.scope, e.time_limit,
    (select count(*)::int from mock_items i where i.exam_id = e.id),
    (select count(*)::int from mock_essays s where s.exam_id = e.id),
    (select count(*)::int from board b where b.exam_id = e.id),
    (select ma.status from mock_attempts ma where ma.exam_id = e.id and ma.user_id = auth.uid() and ma.ranked),
    b.correct, b.total, b.elapsed, b.score, b.rk,
    (select count(*)::int from mock_attempts ma where ma.exam_id = e.id and ma.user_id = auth.uid())
  from mock_exams e
  left join board b on b.exam_id = e.id and b.user_id = auth.uid()
  where e.published or is_admin()
  order by e.sort, e.id;
end $$;
grant execute on function public.mock_list() to anon, authenticated;

-- 시험 시작 (진행 중인 응시가 있으면 이어서). 문제는 여기서만 받는다.
create or replace function public.mock_start(p_exam text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  e mock_exams;
  a mock_attempts;
  is_ranked boolean;
begin
  if uid is null then raise exception '로그인이 필요해'; end if;
  if exists (select 1 from profiles where user_id = uid and banned_at is not null) then
    raise exception '이용이 정지된 계정이야';
  end if;
  select * into e from mock_exams where id = p_exam and (published or is_admin());
  if not found then raise exception '없는 시험이야'; end if;
  perform mock_close_expired(p_exam);

  select * into a from mock_attempts
  where exam_id = p_exam and user_id = uid and status = 'running' and now() <= deadline + interval '20 seconds'
  order by id desc limit 1;
  if not found then
    is_ranked := not exists (select 1 from mock_attempts where exam_id = p_exam and user_id = uid and ranked);
    insert into mock_attempts (exam_id, user_id, ranked, deadline)
    values (p_exam, uid, is_ranked, now() + make_interval(secs => e.time_limit))
    returning * into a;
  end if;

  return jsonb_build_object(
    'attempt', a.id, 'ranked', a.ranked, 'started_at', a.started_at, 'deadline', a.deadline,
    'now', now(), 'time_limit', e.time_limit, 'saved', a.saved,
    'title', e.title, 'subject', e.subject,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('no', i.no, 'pts', i.pts, 'stem', i.stem, 'bogi', i.bogi,
                'fig', i.fig, 'choices', i.choices, 'lay', i.lay) order by i.no), '[]'::jsonb)
              from mock_items i where i.exam_id = p_exam)
  );
end $$;
grant execute on function public.mock_start(text) to authenticated;

-- 답 중간 저장 (제한 시간 안에서만)
create or replace function public.mock_save(p_attempt bigint, p_answers jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) > 100 then raise exception '잘못된 답안'; end if;
  update mock_attempts set saved = p_answers, saved_at = now()
  where id = p_attempt and user_id = auth.uid() and status = 'running' and now() <= deadline + interval '5 seconds';
  return found;
end $$;
grant execute on function public.mock_save(bigint, jsonb) to authenticated;

-- 결과 (내 응시만): 정답·해설·서술형·내 순위
create or replace function public.mock_result(p_attempt bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare a mock_attempts; rk int; takers int;
begin
  select * into a from mock_attempts where id = p_attempt and user_id = auth.uid();
  if not found then raise exception '응시 기록이 없어'; end if;
  if a.status <> 'done' then raise exception '아직 제출하지 않은 시험이야'; end if;
  select count(*) + 1 into rk
  from mock_attempts x join profiles p on p.user_id = x.user_id
  where x.exam_id = a.exam_id and x.ranked and x.status = 'done' and p.banned_at is null
    and (x.score > a.score or (x.score = a.score and (x.correct > a.correct or (x.correct = a.correct and x.elapsed < a.elapsed))));
  select count(*) into takers
  from mock_attempts x join profiles p on p.user_id = x.user_id
  where x.exam_id = a.exam_id and x.ranked and x.status = 'done' and p.banned_at is null;
  return jsonb_build_object(
    'attempt', a.id, 'exam_id', a.exam_id, 'ranked', a.ranked, 'auto', a.auto,
    'correct', a.correct, 'total', a.total, 'pts_earned', a.pts_earned, 'pts_total', a.pts_total,
    'elapsed', a.elapsed, 'score', a.score, 'answers', a.answers, 'submitted_at', a.submitted_at,
    'rank', case when a.ranked then rk end, 'takers', takers,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('no', i.no, 'pts', i.pts, 'stem', i.stem, 'bogi', i.bogi,
                'fig', i.fig, 'choices', i.choices, 'lay', i.lay, 'ans', k.ans, 'expl', k.expl) order by i.no), '[]'::jsonb)
              from mock_items i join mock_keys k on k.exam_id = i.exam_id and k.no = i.no where i.exam_id = a.exam_id),
    'essays', (select coalesce(jsonb_agg(jsonb_build_object('no', s.no, 'pts', s.pts, 'stem', s.stem, 'fig', s.fig,
                'subs', s.subs, 'model', s.model, 'rubric', s.rubric) order by s.no), '[]'::jsonb)
               from mock_essays s where s.exam_id = a.exam_id)
  );
end $$;
grant execute on function public.mock_result(bigint) to authenticated;

-- 제출 (시간 안이면 보낸 답으로, 시간이 지났으면 마지막으로 저장된 답으로 채점)
create or replace function public.mock_submit(p_attempt bigint, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare a mock_attempts; lim int;
begin
  select * into a from mock_attempts where id = p_attempt and user_id = auth.uid();
  if not found then raise exception '응시 기록이 없어'; end if;
  if a.status = 'running' then
    lim := extract(epoch from (a.deadline - a.started_at))::int;
    if now() <= a.deadline + interval '15 seconds' then
      if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) > 100 then raise exception '잘못된 답안'; end if;
      perform mock_grade(a.id, p_answers, ceil(extract(epoch from (now() - a.started_at)))::int, now() > a.deadline);
    else
      perform mock_grade(a.id, a.saved, lim, true);
    end if;
  end if;
  return mock_result(a.id);
end $$;
grant execute on function public.mock_submit(bigint, jsonb) to authenticated;

-- 내가 이 시험을 본 기록
create or replace function public.mock_my_attempts(p_exam text)
returns table(id bigint, ranked boolean, status text, correct int, total int, elapsed int, score int, submitted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, ranked, status, correct, total, elapsed, score, submitted_at
  from mock_attempts where exam_id = p_exam and user_id = auth.uid() order by id desc
$$;
grant execute on function public.mock_my_attempts(text) to authenticated;

-- 시험별 랭킹 (첫 응시만)
create or replace function public.mock_board(p_exam text, p_limit int default 200)
returns table(rank int, user_id uuid, nickname text, correct int, total int, elapsed int, score int, submitted_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform mock_close_expired(p_exam);
  return query
  select (rank() over (order by ma.score desc, ma.correct desc, ma.elapsed asc))::int,
         ma.user_id, p.nickname, ma.correct, ma.total, ma.elapsed, ma.score, ma.submitted_at
  from mock_attempts ma join profiles p on p.user_id = ma.user_id
  where ma.exam_id = p_exam and ma.ranked and ma.status = 'done' and p.banned_at is null
  order by ma.score desc, ma.correct desc, ma.elapsed asc, ma.submitted_at asc
  limit least(greatest(p_limit, 1), 500);
end $$;
grant execute on function public.mock_board(text, int) to anon, authenticated;
