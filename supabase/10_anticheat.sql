-- 10. 너무 빨리 맞히는 답 잡기 (AI·답 베끼기 의심) → 경고 → 이용 정지
-- 문제를 처음 연 시각부터 정답 제출까지 걸린 시간이 "읽기만 해도 걸리는 최소 시간"보다 짧으면 '의심'.
--   최소 시간 = 난이도별 기본(기초 3초 · 쉬움 5초 · 보통 8초 · 어려움 15초 · 최상위 25초) + 글자 수 ÷ 20초
-- 의심 3번 → 경고(그 학생에게만 보임). 경고를 확인한 뒤 의심 2번 더 → 이용 정지(랭킹에서 빠지고 제출 불가).
-- 관리자는 경고·정지를 풀 수 있다.

create table if not exists public.question_opens (
  user_id     uuid not null,
  question_id uuid not null,
  opened_at   timestamptz not null default now(),
  primary key (user_id, question_id)
);
alter table public.question_opens enable row level security;
revoke all on public.question_opens from anon, authenticated;

create table if not exists public.cheat_flags (
  id          bigserial primary key,
  user_id     uuid not null,
  question_id uuid not null,
  seconds     numeric not null,   -- 실제 걸린 시간
  needed      numeric not null,   -- 최소로 필요하다고 본 시간
  created_at  timestamptz not null default now()
);
create index if not exists cheat_flags_user_idx on public.cheat_flags(user_id, created_at);
alter table public.cheat_flags enable row level security;
revoke all on public.cheat_flags from anon, authenticated;

alter table public.profiles add column if not exists warned_at timestamptz;
alter table public.profiles add column if not exists warning_ack_at timestamptz;
alter table public.profiles add column if not exists banned_at timestamptz;

-- 문제를 열었을 때 (처음 연 시각만 남김)
create or replace function public.open_questions(p_ids uuid[])
returns void language sql security definer set search_path = public as $$
  insert into question_opens(user_id, question_id)
  select auth.uid(), x from unnest(p_ids) x
  where auth.uid() is not null and x is not null
  on conflict do nothing
$$;

-- 최소 필요 시간(초)
create or replace function public.min_solve_seconds(q questions)
returns numeric language sql immutable as $$
  select (case q.difficulty when 1 then 3 when 2 then 5 when 3 then 8 when 4 then 15 else 25 end)
         + char_length(coalesce(q.body, '')) / 20.0
$$;

-- 정지된 사람은 제출·정답 보기 불가
create or replace function public.block_banned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- 같은 제출 안에서 막 정지된 경우는 그 제출까지는 통과 (정지 기록이 같이 취소되지 않게)
  if exists (select 1 from profiles where user_id = new.user_id and banned_at is not null and banned_at < now()) then
    raise exception '이용이 정지된 계정이야. 관리자에게 문의해 줘.';
  end if;
  return new;
end $$;
create or replace trigger attempts_block_banned before insert on public.attempts for each row execute function public.block_banned();
create or replace trigger score_block_banned before insert on public.score_events for each row
  when (new.reason = 'solve') execute function public.block_banned();

-- 정답이 들어오면 걸린 시간 확인
create or replace function public.check_solve_time()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  q questions%rowtype;
  opened timestamptz;
  secs numeric;
  need numeric;
  pr profiles%rowtype;
  total int;
  after_ack int;
begin
  if not new.is_correct then return new; end if;
  select opened_at into opened from question_opens where user_id = new.user_id and question_id = new.question_id;
  if opened is null then return new; end if;              -- 연 기록이 없으면 판단하지 않음
  select * into q from questions where id = new.question_id;
  secs := extract(epoch from (new.created_at - opened));
  need := min_solve_seconds(q);
  if secs >= need then return new; end if;

  insert into cheat_flags(user_id, question_id, seconds, needed) values (new.user_id, new.question_id, round(secs, 1), round(need, 1));
  select * into pr from profiles where user_id = new.user_id;
  if not found then return new; end if;

  if pr.warned_at is null then
    select count(*) into total from cheat_flags where user_id = new.user_id and needed > 0;
    if total >= 3 then
      update profiles set warned_at = now(), warning_ack_at = null where user_id = new.user_id;
    end if;
  elsif pr.warning_ack_at is not null and pr.banned_at is null then
    select count(*) into after_ack from cheat_flags where user_id = new.user_id and needed > 0 and created_at > pr.warning_ack_at;
    if after_ack >= 2 then
      update profiles set banned_at = now() where user_id = new.user_id;
    end if;
  end if;
  return new;
end $$;
create or replace trigger attempts_check_time after insert on public.attempts for each row execute function public.check_solve_time();

-- 학생: 경고 확인
create or replace function public.ack_warning()
returns void language sql security definer set search_path = public as $$
  update profiles set warning_ack_at = now() where user_id = auth.uid() and warned_at is not null and warning_ack_at is null
$$;

-- 관리자: 의심 기록 목록
create or replace function public.admin_cheat_list()
returns table(user_id uuid, nickname text, email text, flags bigint, last_flag timestamptz,
              warned_at timestamptz, warning_ack_at timestamptz, banned_at timestamptz, recent jsonb)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    select f.user_id, p.nickname, u.email::text, count(*), max(f.created_at), p.warned_at, p.warning_ack_at, p.banned_at,
           (select jsonb_agg(jsonb_build_object('no', q.no, 'sec', x.seconds, 'need', x.needed, 'at', x.created_at) order by x.created_at desc)
            from (select * from cheat_flags c where c.user_id = f.user_id order by c.created_at desc limit 8) x
            join questions q on q.id = x.question_id)
    from cheat_flags f
    left join profiles p on p.user_id = f.user_id
    left join auth.users u on u.id = f.user_id
    group by f.user_id, p.nickname, u.email, p.warned_at, p.warning_ack_at, p.banned_at
    order by max(f.created_at) desc;
end $$;

-- 관리자: 경고·정지 풀기 (지난 의심 기록은 더 이상 세지 않음)
create or replace function public.admin_pardon(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  update profiles set warned_at = null, warning_ack_at = null, banned_at = null where user_id = p_user;
  update cheat_flags set needed = -abs(needed) where user_id = p_user and needed > 0;  -- 지난 기록은 세지 않게 표시
end $$;

-- 관리자: 바로 정지
create or replace function public.admin_ban(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  update profiles set banned_at = now() where user_id = p_user;
end $$;

grant execute on function public.open_questions(uuid[]), public.ack_warning() to authenticated;
grant execute on function public.admin_cheat_list(), public.admin_pardon(uuid), public.admin_ban(uuid) to authenticated;
revoke execute on function public.open_questions(uuid[]), public.ack_warning(), public.admin_cheat_list(),
  public.admin_pardon(uuid), public.admin_ban(uuid) from anon, public;
revoke execute on function public.block_banned(), public.check_solve_time() from anon, authenticated, public;

-- 정지된 사람은 랭킹에서 뺀다 (leaderboard 함수에 조건 추가)
create or replace function public.leaderboard(p_subject text default 'all', p_period text default 'all', p_limit int default 100)
returns table(rank bigint, user_id uuid, nickname text, points bigint, solved bigint, submissions bigint)
language sql stable security definer set search_path = public as $$
  with e as (
    select se.user_id, se.points, se.reason
    from score_events se
    where (p_subject = 'all' or se.subject = p_subject)
      and (p_period <> 'week' or se.created_at >= week_start())
    union all
    select sp.user_id, sp.points, 'penalty'
    from score_penalties sp
    where (p_subject = 'all' or sp.subject = p_subject)
      and (p_period <> 'week' or sp.created_at >= week_start())
  ), t as (
    select e.user_id, sum(e.points)::bigint as points,
           count(*) filter (where e.reason = 'solve' and e.points > 0)::bigint as solved
    from e group by e.user_id
  ), s as (
    select a.user_id, count(*)::bigint as submissions
    from attempts a join questions q on q.id = a.question_id
    where (p_subject = 'all' or q.subject = p_subject)
      and (p_period <> 'week' or a.created_at >= week_start())
    group by a.user_id
  )
  select rank() over (order by t.points desc), t.user_id, coalesce(p.nickname, '이름 없음'), t.points, t.solved,
         coalesce(s.submissions, 0)
  from t left join profiles p on p.user_id = t.user_id
         left join s on s.user_id = t.user_id
  where t.points > 0 and p.banned_at is null
  order by t.points desc, t.user_id
  limit greatest(1, least(p_limit, 500))
$$;

-- 경고·정지 여부는 본인만 보게: profiles는 공개 칸만 읽을 수 있게 하고, 본인 상태는 my_status()로
revoke select on public.profiles from anon, authenticated;
grant select (user_id, nickname, created_at, must_rename) on public.profiles to anon, authenticated;

create or replace function public.my_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'warned', p.warned_at is not null and p.warning_ack_at is null and p.banned_at is null,
    'banned', p.banned_at is not null,
    'flags', (select count(*) from cheat_flags f where f.user_id = p.user_id and f.needed > 0))
  from profiles p where p.user_id = auth.uid()
$$;
grant execute on function public.my_status() to authenticated;
revoke execute on function public.my_status() from anon, public;
