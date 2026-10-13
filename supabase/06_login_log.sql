-- 06. 로그인 기록 + 관리자 계정 현황

create table if not exists public.login_events (
  id         bigserial primary key,
  user_id    uuid not null,
  provider   text not null,              -- google / email / anonymous
  device     text,                       -- 휴대폰 / 태블릿 / 컴퓨터
  os         text,                       -- Android / iOS / Windows / macOS ...
  browser    text,                       -- Chrome / Safari / 카카오톡 ...
  created_at timestamptz not null default now()
);
create index if not exists login_events_user_idx on public.login_events(user_id, created_at desc);
create index if not exists login_events_time_idx on public.login_events(created_at desc);
alter table public.login_events enable row level security;   -- 정책 없음 → 학생은 못 읽음
revoke all on public.login_events from anon, authenticated;

-- 학생 화면이 열릴 때 호출. 같은 사람·같은 기기는 30분에 한 번만 기록
create or replace function public.log_login(p_device text, p_os text, p_browser text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  prov text;
  d text := left(coalesce(p_device, ''), 20);
  o text := left(coalesce(p_os, ''), 20);
  b text := left(coalesce(p_browser, ''), 20);
begin
  if uid is null then return; end if;
  select case when u.is_anonymous then 'anonymous'
              else coalesce((select i.provider from auth.identities i where i.user_id = u.id and i.provider <> 'email'
                             order by i.created_at desc limit 1), 'email') end
    into prov from auth.users u where u.id = uid;
  if exists (select 1 from login_events e where e.user_id = uid and e.device = d and e.browser = b
             and e.provider = coalesce(prov, 'anonymous') and e.created_at > now() - interval '30 minutes') then
    return;
  end if;
  insert into login_events(user_id, provider, device, os, browser) values (uid, coalesce(prov, 'anonymous'), d, o, b);
end $$;

-- 관리자: 계정 목록 (이메일·로그인 방식·가입일·마지막 접속·최근 7일 접속 수·점수)
create or replace function public.admin_accounts()
returns table(user_id uuid, nickname text, email text, provider text, is_anonymous boolean,
              created_at timestamptz, last_sign_in_at timestamptz, last_seen timestamptz,
              visits_7d bigint, visits_total bigint, last_device text, points bigint, solved bigint)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    select u.id, p.nickname, u.email::text,
           case when u.is_anonymous then 'anonymous'
                else coalesce((select string_agg(distinct i.provider, ', ') from auth.identities i where i.user_id = u.id), 'email') end,
           u.is_anonymous, u.created_at, u.last_sign_in_at,
           (select max(e.created_at) from login_events e where e.user_id = u.id),
           (select count(*) from login_events e where e.user_id = u.id and e.created_at > now() - interval '7 days'),
           (select count(*) from login_events e where e.user_id = u.id),
           (select concat_ws(' · ', e.device, e.os, e.browser) from login_events e where e.user_id = u.id order by e.created_at desc limit 1),
           coalesce((select sum(s.points) from score_events s where s.user_id = u.id), 0)
             + coalesce((select sum(sp.points) from score_penalties sp where sp.user_id = u.id), 0),
           (select count(*) from score_events s where s.user_id = u.id and s.reason = 'solve' and s.points > 0)
    from auth.users u
    left join profiles p on p.user_id = u.id
    order by coalesce((select max(e.created_at) from login_events e where e.user_id = u.id), u.last_sign_in_at, u.created_at) desc;
end $$;

-- 관리자: 최근 로그인 기록
create or replace function public.admin_login_events(p_limit int default 100)
returns table(created_at timestamptz, nickname text, email text, provider text, device text, os text, browser text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    select e.created_at, p.nickname, u.email::text, e.provider, e.device, e.os, e.browser
    from login_events e
    left join auth.users u on u.id = e.user_id
    left join profiles p on p.user_id = e.user_id
    order by e.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;

grant execute on function public.log_login(text, text, text), public.admin_accounts(), public.admin_login_events(int) to authenticated;
revoke execute on function public.log_login(text, text, text), public.admin_accounts(), public.admin_login_events(int) from anon, public;
