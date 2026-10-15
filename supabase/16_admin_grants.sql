-- 16. 관리자가 학생에게 점수 주기 (또는 빼기)
--   - 점수는 score_events에 reason = 'admin'으로 들어가서 랭킹·레벨에 바로 반영돼.
--   - 누가, 누구에게, 몇 점, 왜 줬는지는 admin_grants에 남고, 나중에 취소할 수 있어.
--   - 받은 사람은 다음에 접속할 때 알림을 한 번 받아.

alter table public.score_events drop constraint if exists score_events_reason_check;
alter table public.score_events add constraint score_events_reason_check
  check (reason in ('solve', 'author', 'report', 'admin'));

create table if not exists public.admin_grants (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  admin_id uuid references auth.users(id) on delete set null,
  points int not null check (points between -1000 and 1000 and points <> 0),
  subject text references public.subjects(code),
  note text check (char_length(note) <= 100),
  event_id bigint references public.score_events(id) on delete set null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  revoked_at timestamptz
);
create index if not exists admin_grants_user_idx on public.admin_grants(user_id, created_at desc);
alter table public.admin_grants enable row level security;
revoke all on public.admin_grants from anon, authenticated;

-- 점수 주기: p_points는 -1000 ~ 1000 (0 제외), p_subject는 null이면 '전체'에만, 과목 코드면 그 과목 랭킹에도 반영
create or replace function public.admin_grant_points(p_user uuid, p_points int, p_subject text default null, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev bigint;
  gid bigint;
  subj text := nullif(btrim(coalesce(p_subject, '')), '');
  msg text := nullif(btrim(coalesce(p_note, '')), '');
  total bigint;
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  if p_user is null or not exists (select 1 from profiles where user_id = p_user) then
    raise exception '그런 학생을 찾을 수 없어';
  end if;
  if p_user = auth.uid() then raise exception '자기 자신에게는 점수를 줄 수 없어'; end if;
  if p_points is null or p_points = 0 or p_points not between -1000 and 1000 then
    raise exception '점수는 -1000점부터 1000점까지(0 제외)만 줄 수 있어';
  end if;
  if subj is not null and not exists (select 1 from subjects where code = subj) then
    raise exception '과목이 이상해';
  end if;
  if msg is not null and char_length(msg) > 100 then raise exception '사유는 100자까지야'; end if;

  insert into score_events(user_id, question_id, reason, subject, points)
  values (p_user, null, 'admin', subj, p_points) returning id into ev;
  insert into admin_grants(user_id, admin_id, points, subject, note, event_id)
  values (p_user, auth.uid(), p_points, subj, msg, ev) returning id into gid;

  select coalesce((select sum(points) from score_events where user_id = p_user), 0)
       + coalesce((select sum(points) from score_penalties where user_id = p_user), 0) into total;
  return jsonb_build_object('id', gid, 'total', total);
end $$;

-- 준 기록 (p_user가 null이면 전체)
create or replace function public.admin_grant_list(p_user uuid default null, p_limit int default 50)
returns table(id bigint, user_id uuid, nickname text, admin_nick text, points int, subject text, note text,
              created_at timestamptz, seen_at timestamptz, revoked_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    select g.id, g.user_id, coalesce(p.nickname, '이름 없음'), coalesce(a.nickname, '관리자'),
           g.points, g.subject, g.note, g.created_at, g.seen_at, g.revoked_at
    from admin_grants g
    left join profiles p on p.user_id = g.user_id
    left join profiles a on a.user_id = g.admin_id
    where p_user is null or g.user_id = p_user
    order by g.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 200));
end $$;

-- 취소: 준 점수를 없애고 기록에 '취소됨' 표시
create or replace function public.admin_grant_revoke(p_id bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare g admin_grants%rowtype;
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  select * into g from admin_grants where id = p_id for update;
  if not found then raise exception '기록을 찾을 수 없어'; end if;
  if g.revoked_at is not null then return; end if;
  if g.event_id is not null then delete from score_events where id = g.event_id; end if;
  update admin_grants set revoked_at = now(), event_id = null where id = p_id;
end $$;

-- 내가 받은 점수 중 아직 알림을 못 본 것
create or replace function public.my_grants_unseen()
returns table(id bigint, points int, subject text, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.id, g.points, g.subject, g.note, g.created_at
  from admin_grants g
  where g.user_id = auth.uid() and g.seen_at is null and g.revoked_at is null
  order by g.created_at
$$;

create or replace function public.my_grants_ack()
returns void
language sql security definer set search_path = public as $$
  update admin_grants set seen_at = now() where user_id = auth.uid() and seen_at is null
$$;

revoke all on function public.admin_grant_points(uuid, int, text, text) from public, anon;
revoke all on function public.admin_grant_list(uuid, int) from public, anon;
revoke all on function public.admin_grant_revoke(bigint) from public, anon;
revoke all on function public.my_grants_unseen() from public, anon;
revoke all on function public.my_grants_ack() from public, anon;
grant execute on function public.admin_grant_points(uuid, int, text, text) to authenticated;
grant execute on function public.admin_grant_list(uuid, int) to authenticated;
grant execute on function public.admin_grant_revoke(bigint) to authenticated;
grant execute on function public.my_grants_unseen() to authenticated;
grant execute on function public.my_grants_ack() to authenticated;
