-- =====================================================================
-- 내신 랭크전 데이터베이스 (Supabase SQL Editor에 통째로 붙여 넣고 Run)
-- 핵심 원칙
--   1) 정답은 question_answers 테이블에만 있고, 학생 브라우저는 절대 못 읽는다.
--   2) 채점과 점수 지급은 아래 서버 함수(submit_answer)만 할 수 있다.
--   3) 같은 문제로 점수를 두 번 받을 수 없다 (고유 제약 조건).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- 테이블 ----------
create table if not exists public.subjects (
  code  text primary key,
  name  text not null,
  sort  int  not null default 0
);

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null references public.subjects(code),
  unit        text not null default '',
  difficulty  smallint not null check (difficulty between 1 and 5),
  body        text not null check (char_length(body) between 1 and 1000),
  choices     jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) between 2 and 5),
  explanation text not null default '',
  status      text not null default 'published' check (status in ('pending','published','rejected')),
  author      uuid,
  author_nick text not null default '',
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists questions_subject_idx on public.questions(subject, status, sort);

-- 정답: 아무도 직접 못 읽음 (RLS 정책 없음). 서버 함수만 접근.
create table if not exists public.question_answers (
  question_id uuid primary key references public.questions(id) on delete cascade,
  answer      smallint not null
);

create table if not exists public.profiles (
  user_id    uuid primary key,
  nickname   text not null check (char_length(nickname) between 1 and 12),
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id          bigserial primary key,
  user_id     uuid not null,
  question_id uuid not null references public.questions(id) on delete cascade,
  choice      smallint not null,
  is_correct  boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.attempts(user_id, question_id);

-- 점수 지급 내역: reason = 'solve'(문제 풀이) | 'author'(출제 보너스)
create table if not exists public.score_events (
  id          bigserial primary key,
  user_id     uuid not null,
  question_id uuid references public.questions(id) on delete set null,
  reason      text not null check (reason in ('solve','author')),
  subject     text,
  points      int  not null,
  created_at  timestamptz not null default now(),
  unique (user_id, question_id, reason)          -- 같은 문제 중복 지급 방지
);
create index if not exists score_events_time_idx on public.score_events(created_at);

-- 관리자 이메일 목록 (아무도 직접 못 읽음)
create table if not exists public.admin_emails (
  email text primary key
);

-- ---------- 보안 규칙 (Row Level Security) ----------
alter table public.subjects         enable row level security;
alter table public.questions        enable row level security;
alter table public.question_answers enable row level security;
alter table public.profiles         enable row level security;
alter table public.attempts         enable row level security;
alter table public.score_events     enable row level security;
alter table public.admin_emails     enable row level security;

drop policy if exists "subjects read" on public.subjects;
create policy "subjects read" on public.subjects for select using (true);

drop policy if exists "questions read published" on public.questions;
create policy "questions read published" on public.questions for select
  using (status = 'published' or author = auth.uid());

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);

drop policy if exists "attempts read own" on public.attempts;
create policy "attempts read own" on public.attempts for select using (user_id = auth.uid());

drop policy if exists "score read own" on public.score_events;
create policy "score read own" on public.score_events for select using (user_id = auth.uid());
-- question_answers, admin_emails 에는 정책이 없으므로 브라우저에서 절대 읽거나 쓸 수 없다.
-- profiles/attempts/score_events/questions 쓰기도 정책이 없으므로 아래 함수로만 가능하다.

-- ---------- 공통 함수 ----------
create or replace function public.points_for(d smallint)
returns int language sql immutable as $$
  select case d when 1 then 5 when 2 then 10 when 3 then 20 when 4 then 35 else 50 end
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) and coalesce(auth.jwt() ->> 'email', '') <> ''
$$;

create or replace function public.week_start()
returns timestamptz language sql stable as $$
  -- 한국 시간 기준 이번 주 월요일 0시
  select (date_trunc('week', now() at time zone 'Asia/Seoul')) at time zone 'Asia/Seoul'
$$;

-- ---------- 학생용 함수 ----------
-- 닉네임 정하기/바꾸기
create or replace function public.set_nickname(p_nick text)
returns void language plpgsql security definer set search_path = public as $$
declare n text := btrim(coalesce(p_nick,''));
begin
  if auth.uid() is null then raise exception '로그인 세션이 없어'; end if;
  if char_length(n) < 1 or char_length(n) > 12 then raise exception '닉네임은 1~12자'; end if;
  insert into profiles(user_id, nickname) values (auth.uid(), n)
  on conflict (user_id) do update set nickname = excluded.nickname;
end $$;

-- 답안 제출 → 서버 채점 → 점수 지급
create or replace function public.submit_answer(p_question uuid, p_choice smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q   questions%rowtype;
  ans smallint;
  ok  boolean;
  tried int;
  pts int := 0;
  done boolean;
begin
  if uid is null then raise exception '로그인 세션이 없어'; end if;
  -- 같은 사람이 같은 문제를 동시에 여러 번 보내도 한 번씩 처리
  perform pg_advisory_xact_lock(hashtext(uid::text || p_question::text));

  select * into q from questions where id = p_question and status = 'published';
  if not found then raise exception '문제를 찾을 수 없어'; end if;
  select answer into ans from question_answers where question_id = p_question;

  ok := (p_choice = ans);
  select exists(select 1 from score_events where user_id = uid and question_id = p_question and reason = 'solve') into done;
  if done then
    return jsonb_build_object('correct', ok, 'already', true, 'points', 0,
                              'answer', ans, 'explanation', q.explanation);
  end if;

  select count(*) into tried from attempts where user_id = uid and question_id = p_question and not is_correct;
  insert into attempts(user_id, question_id, choice, is_correct) values (uid, p_question, p_choice, ok);

  if not ok then
    return jsonb_build_object('correct', false, 'points', 0, 'tried', tried + 1);
  end if;

  pts := points_for(q.difficulty);
  if tried > 0 then pts := pts / 2; end if;        -- 한 번이라도 틀렸으면 절반
  if q.author = uid then pts := 0; end if;          -- 내가 낸 문제는 0점
  insert into score_events(user_id, question_id, reason, subject, points)
  values (uid, p_question, 'solve', q.subject, pts)
  on conflict do nothing;
  return jsonb_build_object('correct', true, 'points', pts, 'answer', ans, 'explanation', q.explanation);
end $$;

-- 포기하고 정답 보기 (0점으로 기록)
create or replace function public.reveal_answer(p_question uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q questions%rowtype; ans smallint;
begin
  if uid is null then raise exception '로그인 세션이 없어'; end if;
  select * into q from questions where id = p_question and status = 'published';
  if not found then raise exception '문제를 찾을 수 없어'; end if;
  select answer into ans from question_answers where question_id = p_question;
  insert into score_events(user_id, question_id, reason, subject, points)
  values (uid, p_question, 'solve', q.subject, 0) on conflict do nothing;
  return jsonb_build_object('answer', ans, 'explanation', q.explanation);
end $$;

-- 내 풀이 상태 (문제별: 획득 점수 / 틀린 적 있는지 / 정답 번호는 푼 문제만)
create or replace function public.my_progress()
returns table(question_id uuid, points int, tried boolean, answer smallint)
language sql stable security definer set search_path = public as $$
  with s as (select question_id, points from score_events where user_id = auth.uid() and reason = 'solve'),
       a as (select question_id, bool_or(not is_correct) as tried from attempts where user_id = auth.uid() group by question_id)
  select coalesce(s.question_id, a.question_id), s.points, coalesce(a.tried, false),
         case when s.question_id is not null then qa.answer end
  from s full join a on a.question_id = s.question_id
  left join question_answers qa on qa.question_id = coalesce(s.question_id, a.question_id)
$$;

-- 랭킹: p_subject = 'all' 또는 과목 코드, p_period = 'all' 또는 'week'
create or replace function public.leaderboard(p_subject text default 'all', p_period text default 'all', p_limit int default 100)
returns table(rank bigint, user_id uuid, nickname text, points bigint, solved bigint)
language sql stable security definer set search_path = public as $$
  with e as (
    select se.user_id, se.points, se.reason
    from score_events se
    where (p_subject = 'all' or se.subject = p_subject)
      and (p_period <> 'week' or se.created_at >= week_start())
  ), t as (
    select e.user_id, sum(e.points)::bigint as points,
           count(*) filter (where e.reason = 'solve' and e.points > 0)::bigint as solved
    from e group by e.user_id
  )
  select rank() over (order by t.points desc), t.user_id, coalesce(p.nickname, '이름 없음'), t.points, t.solved
  from t left join profiles p on p.user_id = t.user_id
  where t.points > 0
  order by t.points desc, t.user_id
  limit greatest(1, least(p_limit, 500))
$$;

-- 문제 제안 (관리자가 승인해야 공개, 승인되면 출제 보너스 +5점, 최대 20문제)
create or replace function public.suggest_question(
  p_subject text, p_unit text, p_difficulty smallint, p_body text,
  p_choices jsonb, p_answer smallint, p_explanation text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); nid uuid; pend int; nick text;
begin
  if uid is null then raise exception '로그인 세션이 없어'; end if;
  if p_difficulty not between 1 and 3 then raise exception '난이도는 1~3만 가능'; end if;
  if p_answer < 0 or p_answer >= jsonb_array_length(p_choices) then raise exception '정답 번호가 보기 범위를 벗어났어'; end if;
  select count(*) into pend from questions where author = uid and status = 'pending';
  if pend >= 10 then raise exception '검토 대기 문제가 10개를 넘었어. 승인될 때까지 기다려 줘'; end if;
  select nickname into nick from profiles where user_id = uid;
  insert into questions(subject, unit, difficulty, body, choices, explanation, status, author, author_nick, sort)
  values (p_subject, left(coalesce(p_unit,''),30), p_difficulty, p_body, p_choices, left(coalesce(p_explanation,''),500),
          'pending', uid, coalesce(nick,''), 100000)
  returning id into nid;
  insert into question_answers(question_id, answer) values (nid, p_answer);
  return nid;
end $$;

-- ---------- 관리자 함수 (admin_emails 에 있는 이메일로 로그인해야 실행됨) ----------
create or replace function public.admin_pending()
returns table(id uuid, subject text, unit text, difficulty smallint, body text, choices jsonb,
              answer smallint, explanation text, author_nick text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    select q.id, q.subject, q.unit, q.difficulty, q.body, q.choices, qa.answer, q.explanation, q.author_nick, q.created_at
    from questions q join question_answers qa on qa.question_id = q.id
    where q.status = 'pending' order by q.created_at;
end $$;

create or replace function public.admin_review(p_question uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare q questions%rowtype; bonus_count int;
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  select * into q from questions where id = p_question for update;
  if not found then raise exception '문제를 찾을 수 없어'; end if;
  update questions set status = case when p_approve then 'published' else 'rejected' end where id = p_question;
  if p_approve and q.author is not null then
    select count(*) into bonus_count from score_events where user_id = q.author and reason = 'author';
    if bonus_count < 20 then
      insert into score_events(user_id, question_id, reason, subject, points)
      values (q.author, q.id, 'author', null, 5) on conflict do nothing;
    end if;
  end if;
end $$;

create or replace function public.admin_add_question(
  p_subject text, p_unit text, p_difficulty smallint, p_body text,
  p_choices jsonb, p_answer smallint, p_explanation text)
returns uuid language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  if p_answer < 0 or p_answer >= jsonb_array_length(p_choices) then raise exception '정답 번호가 보기 범위를 벗어났어'; end if;
  insert into questions(subject, unit, difficulty, body, choices, explanation, status, author_nick, sort)
  values (p_subject, coalesce(p_unit,''), p_difficulty, p_body, p_choices, coalesce(p_explanation,''), 'published', '관리자', 50000)
  returning id into nid;
  insert into question_answers(question_id, answer) values (nid, p_answer);
  return nid;
end $$;

create or replace function public.admin_hide_question(p_question uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  update questions set status = 'rejected' where id = p_question;
end $$;

create or replace function public.admin_stats()
returns table(user_id uuid, nickname text, total bigint, week bigint, answered bigint, correct bigint, gave_up bigint, wrong_tries bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    with u as (select distinct se.user_id from score_events se union select distinct a.user_id from attempts a)
    select u.user_id, coalesce(p.nickname,'이름 없음'),
      coalesce((select sum(points) from score_events s where s.user_id = u.user_id),0)::bigint,
      coalesce((select sum(points) from score_events s where s.user_id = u.user_id and s.created_at >= week_start()),0)::bigint,
      (select count(*) from score_events s where s.user_id = u.user_id and s.reason='solve')::bigint,
      (select count(*) from score_events s where s.user_id = u.user_id and s.reason='solve' and s.points > 0)::bigint,
      (select count(*) from score_events s where s.user_id = u.user_id and s.reason='solve' and s.points = 0)::bigint,
      (select count(*) from attempts a where a.user_id = u.user_id and not a.is_correct)::bigint
    from u left join profiles p on p.user_id = u.user_id
    order by 3 desc;
end $$;

create or replace function public.admin_reset_all()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  delete from score_events where reason = 'solve';
  delete from attempts where true;
end $$;

-- ---------- 실행 권한 ----------
revoke all on function public.admin_pending()          from public, anon;
revoke all on function public.admin_review(uuid,boolean) from public, anon;
revoke all on function public.admin_add_question(text,text,smallint,text,jsonb,smallint,text) from public, anon;
revoke all on function public.admin_hide_question(uuid) from public, anon;
revoke all on function public.admin_stats()            from public, anon;
revoke all on function public.admin_reset_all()        from public, anon;
grant execute on function public.admin_pending(), public.admin_review(uuid,boolean),
  public.admin_add_question(text,text,smallint,text,jsonb,smallint,text), public.admin_hide_question(uuid),
  public.admin_stats(), public.admin_reset_all() to authenticated;
grant execute on function public.set_nickname(text), public.submit_answer(uuid,smallint), public.reveal_answer(uuid),
  public.my_progress(), public.suggest_question(text,text,smallint,text,jsonb,smallint,text) to authenticated;
grant execute on function public.leaderboard(text,text,int) to anon, authenticated;
