-- 12. 정지는 관리자만 + 풀이 기록(타임라인) + 부정행위 의심 확률
-- * 자동 정지 없앰 (경고만 자동). 정지는 관리자가 [정지]를 눌러야만 됨.
-- * 풀이 기록: 문제를 연 뒤 다른 탭/앱으로 나갔다 온 시간, 보기를 바꾼 횟수, 제출 결과를 시간순으로 저장.
--   (화면 녹화가 아니라 "언제 무엇을 했는지"만 기록)
-- * 의심 확률: 너무 빠른 정답, 나갔다 와서 맞힌 정답, 빠른 정답 비율, 어려운 문제 첫 시도 정답률을 합쳐 0~100%.

create or replace function public.check_solve_time()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  q questions%rowtype; opened timestamptz; secs numeric; need numeric; total int;
begin
  if not new.is_correct then return new; end if;
  select opened_at into opened from question_opens where user_id = new.user_id and question_id = new.question_id;
  if opened is null then return new; end if;
  select * into q from questions where id = new.question_id;
  secs := extract(epoch from (new.created_at - opened));
  need := min_solve_seconds(q);
  if secs >= need then return new; end if;
  insert into cheat_flags(user_id, question_id, seconds, needed) values (new.user_id, new.question_id, round(secs, 1), round(need, 1));
  select count(*) into total from cheat_flags where user_id = new.user_id and needed > 0;
  if total >= 3 then
    update profiles set warned_at = now(), warning_ack_at = null
    where user_id = new.user_id and warned_at is null and banned_at is null;
  end if;
  return new;
end $$;

create table if not exists public.solve_traces (
  id          bigserial primary key,
  user_id     uuid not null,
  question_id uuid,                 -- 시험지는 null
  mode        text not null default 'problem' check (mode in ('problem','exam')),
  session     text not null,        -- 한 번 열었을 때마다 새 값
  events      jsonb not null default '[]'::jsonb,   -- [{k:'open'|'leave'|'back'|'pick'|'submit', t: 연 뒤 ms, d: 보충}]
  away_ms     int not null default 0,
  away_count  int not null default 0,
  picks       int not null default 0,
  solved_ok   boolean not null default false,
  away_before_ok boolean not null default false,     -- 정답 전에 5초 넘게 나갔다 왔는지
  updated_at  timestamptz not null default now(),
  unique (user_id, session)
);
create index if not exists solve_traces_user_idx on public.solve_traces(user_id, updated_at desc);
alter table public.solve_traces enable row level security;
revoke all on public.solve_traces from anon, authenticated;

-- 학생 화면이 보내는 풀이 기록 (같은 session이면 덮어씀)
create or replace function public.log_trace(p_question uuid, p_mode text, p_session text, p_events jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  ev jsonb := case when jsonb_typeof(p_events) = 'array' then p_events else '[]'::jsonb end;
  e jsonb; away int := 0; cnt int := 0; pk int := 0; ok boolean := false; away_ok boolean := false;
  left_at numeric := null; t numeric;
begin
  if auth.uid() is null or coalesce(p_session, '') = '' then return; end if;
  if jsonb_array_length(ev) > 400 then ev := (select jsonb_agg(x) from (select x from jsonb_array_elements(ev) x limit 400) s); end if;
  for e in select * from jsonb_array_elements(ev) loop
    t := coalesce((e->>'t')::numeric, 0);
    case e->>'k'
      when 'leave' then left_at := t; cnt := cnt + 1;
      when 'back' then if left_at is not null then away := away + (t - left_at)::int; left_at := null; end if;
      when 'pick' then pk := pk + 1;
      when 'submit' then
        if (e->>'ok')::boolean then
          ok := true;
          if away >= 5000 then away_ok := true; end if;
        end if;
      else null;
    end case;
  end loop;
  insert into solve_traces(user_id, question_id, mode, session, events, away_ms, away_count, picks, solved_ok, away_before_ok, updated_at)
  values (auth.uid(), p_question, coalesce(nullif(p_mode, ''), 'problem'), left(p_session, 40), ev, away, cnt, pk, ok, away_ok, now())
  on conflict (user_id, session) do update set events = excluded.events, away_ms = excluded.away_ms, away_count = excluded.away_count,
    picks = excluded.picks, solved_ok = excluded.solved_ok, away_before_ok = excluded.away_before_ok, updated_at = now();
end $$;

-- 관리자: 학생별 의심 확률
create or replace function public.admin_fairplay()
returns table(user_id uuid, nickname text, email text, correct bigint, flags bigint, away_ok bigint, traced_ok bigint,
              fast2x bigint, hard_tried bigint, hard_first bigint, score int,
              warned_at timestamptz, warning_ack_at timestamptz, banned_at timestamptz, review boolean, last_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
  with u as (select distinct a.user_id from attempts a),
  base as (
    select u.user_id,
      (select count(*) from attempts a where a.user_id = u.user_id and a.is_correct) as correct,
      (select count(*) from cheat_flags f where f.user_id = u.user_id and f.needed > 0) as flags,
      (select count(*) from solve_traces t where t.user_id = u.user_id and t.away_before_ok) as away_ok,
      (select count(*) from solve_traces t where t.user_id = u.user_id and t.solved_ok) as traced_ok,
      (select count(*) from attempts a join question_opens o on o.user_id = a.user_id and o.question_id = a.question_id
         join questions q on q.id = a.question_id
       where a.user_id = u.user_id and a.is_correct
         and extract(epoch from (a.created_at - o.opened_at)) < 2 * min_solve_seconds(q)) as fast2x,
      (select count(distinct a.question_id) from attempts a join questions q on q.id = a.question_id
       where a.user_id = u.user_id and q.difficulty >= 4) as hard_tried,
      (select count(*) from (select distinct on (a.question_id) a.is_correct from attempts a join questions q on q.id = a.question_id
         where a.user_id = u.user_id and q.difficulty >= 4 order by a.question_id, a.created_at) f where f.is_correct) as hard_first,
      (select max(a.created_at) from attempts a where a.user_id = u.user_id) as last_at
    from u
  )
  select b.user_id, p.nickname, au.email::text, b.correct, b.flags, b.away_ok, b.traced_ok, b.fast2x, b.hard_tried, b.hard_first,
    least(100, round(100 * (
        0.35 * least(1, b.flags::numeric / greatest(b.correct, 1))
      + 0.35 * (case when b.traced_ok > 0 then b.away_ok::numeric / b.traced_ok else 0 end)
      + 0.15 * greatest(0, (b.fast2x::numeric / greatest(b.correct, 1) - 0.3) / 0.7)
      + 0.15 * (case when b.hard_tried >= 3 then greatest(0, (b.hard_first::numeric / b.hard_tried - 0.6) / 0.4) else 0 end)
    ) * b.correct::numeric / (b.correct + 5)))::int,
    p.warned_at, p.warning_ack_at, p.banned_at,
    (p.banned_at is null and p.warning_ack_at is not null and
      (select count(*) from cheat_flags f where f.user_id = b.user_id and f.needed > 0 and f.created_at > p.warning_ack_at) >= 2),
    b.last_at
  from base b
  left join profiles p on p.user_id = b.user_id
  left join auth.users au on au.id = b.user_id
  order by 11 desc, b.last_at desc;
end $$;

-- 관리자: 한 학생의 최근 풀이 기록
create or replace function public.admin_traces(p_user uuid, p_limit int default 30)
returns table(no int, title text, difficulty smallint, mode text, events jsonb, away_ms int, away_count int, picks int,
              solved_ok boolean, need numeric, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    select q.no, left(regexp_replace(split_part(q.body, E'\n', 1), '\s+', ' ', 'g'), 40), q.difficulty, t.mode, t.events,
           t.away_ms, t.away_count, t.picks, t.solved_ok, case when q.id is null then null else min_solve_seconds(q) end, t.updated_at
    from solve_traces t left join questions q on q.id = t.question_id
    where t.user_id = p_user
    order by t.updated_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100);
end $$;

grant execute on function public.log_trace(uuid, text, text, jsonb) to authenticated;
grant execute on function public.admin_fairplay(), public.admin_traces(uuid, int) to authenticated;
revoke execute on function public.log_trace(uuid, text, text, jsonb), public.admin_fairplay(), public.admin_traces(uuid, int) from anon, public;
