-- 29. 기획서 반영: 게스트 우선 · 문제 검수 상태 · 광고 영역
--   (Supabase에 guest_first_read_grants, question_review_status, admin_review_list_fix_reports, ad_slots 로 적용됨)

-- ── 게스트 우선: 로그인 없이 둘러볼 때도 질문방·사용자 기록을 읽을 수 있게 ──
grant execute on function public.qna_list(uuid, text, int) to anon;
grant execute on function public.user_solved to anon;

-- ── 문제 검수 상태 · 출제 근거 · 수정 날짜 · 수정 이력 ──
alter table public.questions
  add column if not exists review_status text not null default 'pending',  -- pending 검수 전 / checked 정답·해설 확인 / verified 교과서 대조
  add column if not exists basis text not null default '',                 -- 출제 근거 (교과서 쪽수, 학교 범위)
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists updated_at timestamptz not null default now();
alter table public.questions add constraint questions_review_status_check check (review_status in ('pending','checked','verified'));
update public.questions set updated_at = created_at where updated_at > created_at;

create table if not exists public.question_history (
  id bigserial primary key,
  question_id uuid not null references public.questions(id) on delete cascade,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  kind text not null,          -- edit / answer / review
  before jsonb not null,
  after jsonb not null
);
create index if not exists question_history_q on public.question_history(question_id, changed_at desc);
alter table public.question_history enable row level security;
revoke all on public.question_history from anon, authenticated;

-- 내용(본문·보기·해설)이나 정답이 바뀌면 이력을 남기고 검수 상태를 "검수 전"으로 되돌림
create or replace function public.track_question_edit() returns trigger
language plpgsql security definer set search_path = public as $$
declare b jsonb; a jsonb;
begin
  b := jsonb_build_object('body', old.body, 'choices', old.choices, 'explanation', old.explanation, 'difficulty', old.difficulty, 'unit', old.unit, 'topic', old.topic, 'figure', old.figure);
  a := jsonb_build_object('body', new.body, 'choices', new.choices, 'explanation', new.explanation, 'difficulty', new.difficulty, 'unit', new.unit, 'topic', new.topic, 'figure', new.figure);
  if a is distinct from b then
    insert into question_history(question_id, changed_by, kind, before, after)
    values (new.id, auth.uid(), 'edit',
      (select coalesce(jsonb_object_agg(k, b->k), '{}') from jsonb_object_keys(b) k where b->k is distinct from a->k),
      (select coalesce(jsonb_object_agg(k, a->k), '{}') from jsonb_object_keys(a) k where b->k is distinct from a->k));
    new.updated_at := now();
    if new.review_status = old.review_status and old.review_status <> 'pending'
       and (old.body is distinct from new.body or old.choices is distinct from new.choices or old.explanation is distinct from new.explanation) then
      new.review_status := 'pending';
    end if;
  end if;
  if new.review_status is distinct from old.review_status or new.basis is distinct from old.basis then
    insert into question_history(question_id, changed_by, kind, before, after)
    values (new.id, auth.uid(), 'review', jsonb_build_object('review_status', old.review_status, 'basis', old.basis), jsonb_build_object('review_status', new.review_status, 'basis', new.basis));
  end if;
  return new;
end $$;
create or replace trigger questions_track_edit before update on public.questions for each row execute function public.track_question_edit();

create or replace function public.track_answer_edit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.answer is distinct from old.answer or new.answer_text is distinct from old.answer_text then
    insert into question_history(question_id, changed_by, kind, before, after)
    values (new.question_id, auth.uid(), 'answer', jsonb_build_object('answer', old.answer, 'answer_text', old.answer_text), jsonb_build_object('answer', new.answer, 'answer_text', new.answer_text));
    update questions set updated_at = now(), review_status = case when review_status <> 'pending' then 'pending' else review_status end where id = new.question_id;
  end if;
  return new;
end $$;
create or replace trigger question_answers_track after update on public.question_answers for each row execute function public.track_answer_edit();

-- 관리자 전용 (정답이 들어 있어서 서버에서 is_admin 확인)
create or replace function public.admin_review_list(p_subject text default null, p_status text default null, p_q text default null, p_limit int default 30, p_offset int default 0)
returns table(id uuid, no int, subject text, unit text, topic text, qtype text, difficulty smallint, grade smallint, school_id text, body text, choices jsonb, answer smallint, answer_text text, explanation text, review_status text, basis text, reviewed_at timestamptz, created_at timestamptz, updated_at timestamptz, edits bigint, open_reports bigint, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 볼 수 있어'; end if;
  return query
  select q.id, q.no, q.subject, q.unit, q.topic, q.qtype, q.difficulty, q.grade, q.school_id, q.body, q.choices, a.answer, a.answer_text, q.explanation,
         q.review_status, q.basis, q.reviewed_at, q.created_at, q.updated_at,
         (select count(*) from question_history h where h.question_id = q.id),
         (select count(*) from question_reports r where r.question_id = q.id and r.status = 'open'),
         count(*) over ()
  from questions q left join question_answers a on a.question_id = q.id
  where q.status = 'published'
    and (p_subject is null or q.subject = p_subject)
    and (p_status is null or q.review_status = p_status)
    and (p_q is null or p_q = '' or q.no::text = p_q or q.body ilike '%' || p_q || '%' or q.unit ilike '%' || p_q || '%')
  order by q.subject, q.no
  limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
end $$;

create or replace function public.admin_review_summary()
returns table(subject text, pending bigint, checked bigint, verified bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 볼 수 있어'; end if;
  return query select q.subject, count(*) filter (where q.review_status='pending'), count(*) filter (where q.review_status='checked'), count(*) filter (where q.review_status='verified')
  from questions q where q.status = 'published' group by q.subject order by q.subject;
end $$;

create or replace function public.admin_set_review(p_question uuid, p_status text, p_basis text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 할 수 있어'; end if;
  if p_status not in ('pending','checked','verified') then raise exception '검수 상태가 잘못됐어'; end if;
  update questions set review_status = p_status, basis = coalesce(left(btrim(p_basis), 200), basis),
         reviewed_at = case when p_status = 'pending' then null else now() end,
         reviewed_by = case when p_status = 'pending' then null else auth.uid() end
  where id = p_question;
end $$;

create or replace function public.admin_question_history(p_question uuid)
returns table(changed_at timestamptz, kind text, before jsonb, after jsonb, who text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 볼 수 있어'; end if;
  return query select h.changed_at, h.kind, h.before, h.after, coalesce(p.nickname, '')
  from question_history h left join profiles p on p.user_id = h.changed_by
  where h.question_id = p_question order by h.changed_at desc limit 50;
end $$;

revoke all on function public.admin_review_list(text,text,text,int,int), public.admin_review_summary(), public.admin_set_review(uuid,text,text), public.admin_question_history(uuid) from public, anon;
grant execute on function public.admin_review_list(text,text,text,int,int), public.admin_review_summary(), public.admin_set_review(uuid,text,text), public.admin_question_history(uuid) to authenticated;

-- ── 광고 영역: 공급 방식은 나중에 정하고, 지금은 직접 등록 배너만. 전체 스위치 기본 꺼짐 ──
create table if not exists public.ad_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.ad_settings(id) values (true) on conflict do nothing;

create table if not exists public.ads (
  id bigserial primary key,
  title text not null check (length(title) between 1 and 60),
  body text not null default '' check (length(body) <= 120),
  image_url text not null default '' check (image_url = '' or image_url ~ '^https://'),
  link_url text not null check (link_url ~ '^https://'),
  advertiser text not null default '' check (length(advertiser) <= 60),
  placement text not null default 'home' check (placement in ('home','list','ranking')),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  archived boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 누가 봤는지는 남기지 않고 날짜별 숫자만
create table if not exists public.ad_stats (
  ad_id bigint not null references public.ads(id),
  day date not null default (now() at time zone 'Asia/Seoul')::date,
  views int not null default 0,
  clicks int not null default 0,
  reports int not null default 0,
  primary key (ad_id, day)
);
create table if not exists public.ad_history (
  id bigserial primary key,
  ad_id bigint not null references public.ads(id),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb not null
);
alter table public.ad_settings enable row level security;
alter table public.ads enable row level security;
alter table public.ad_stats enable row level security;
alter table public.ad_history enable row level security;
revoke all on public.ad_settings, public.ads, public.ad_stats, public.ad_history from anon, authenticated;

create or replace function public.track_ad_edit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  insert into ad_history(ad_id, changed_by, before, after) values (new.id, auth.uid(), to_jsonb(old) - 'updated_at', to_jsonb(new) - 'updated_at');
  return new;
end $$;
create or replace trigger ads_track before update on public.ads for each row execute function public.track_ad_edit();
create or replace function public.track_ad_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into ad_history(ad_id, changed_by, before, after) values (new.id, auth.uid(), null, to_jsonb(new));
  return new;
end $$;
create or replace trigger ads_track_ins after insert on public.ads for each row execute function public.track_ad_insert();

-- 누구나: 위치만 보고 고른다 (학교·학년·성적 등 사용자 정보는 쓰지 않음)
create or replace function public.ads_for(p_placement text)
returns table(id bigint, title text, body text, image_url text, link_url text, advertiser text)
language sql stable security definer set search_path = public as $$
  select a.id, a.title, a.body, a.image_url, a.link_url, a.advertiser
  from ads a, ad_settings s
  where s.enabled and a.active and not a.archived and a.placement = p_placement
    and (a.starts_at is null or a.starts_at <= now()) and (a.ends_at is null or a.ends_at > now())
  order by random() limit 1;
$$;

create or replace function public.ad_hit(p_ad bigint, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('view','click','report') then return; end if;
  if not exists (select 1 from ads where id = p_ad and active and not archived) then return; end if;
  insert into ad_stats(ad_id, views, clicks, reports)
  values (p_ad, (p_kind = 'view')::int, (p_kind = 'click')::int, (p_kind = 'report')::int)
  on conflict (ad_id, day) do update set
    views = ad_stats.views + excluded.views, clicks = ad_stats.clicks + excluded.clicks, reports = ad_stats.reports + excluded.reports;
end $$;

-- 관리자 전용 (화면에서 숨기는 것과 별개로 서버에서 is_admin 확인)
create or replace function public.admin_ads()
returns table(id bigint, title text, body text, image_url text, link_url text, advertiser text, placement text, starts_at timestamptz, ends_at timestamptz, active boolean, created_at timestamptz, updated_at timestamptz, views bigint, clicks bigint, reports bigint, enabled boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 볼 수 있어'; end if;
  return query select a.id, a.title, a.body, a.image_url, a.link_url, a.advertiser, a.placement, a.starts_at, a.ends_at, a.active, a.created_at, a.updated_at,
    coalesce(sum(st.views),0)::bigint, coalesce(sum(st.clicks),0)::bigint, coalesce(sum(st.reports),0)::bigint, (select s.enabled from ad_settings s)
  from ads a left join ad_stats st on st.ad_id = a.id
  where not a.archived group by a.id order by a.created_at desc;
end $$;

create or replace function public.ads_enabled_admin()
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 볼 수 있어'; end if;
  return (select enabled from ad_settings);
end $$;

create or replace function public.admin_save_ad(p_id bigint, p_title text, p_body text, p_image_url text, p_link_url text, p_advertiser text, p_placement text, p_starts_at timestamptz, p_ends_at timestamptz, p_active boolean)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  if not is_admin() then raise exception '관리자만 할 수 있어'; end if;
  if coalesce(p_link_url,'') !~ '^https://' then raise exception '연결 주소는 https:// 로 시작해야 해'; end if;
  if coalesce(p_image_url,'') <> '' and p_image_url !~ '^https://' then raise exception '이미지 주소는 https:// 로 시작해야 해'; end if;
  if p_id is null then
    insert into ads(title, body, image_url, link_url, advertiser, placement, starts_at, ends_at, active, created_by)
    values (btrim(p_title), coalesce(btrim(p_body),''), coalesce(btrim(p_image_url),''), btrim(p_link_url), coalesce(btrim(p_advertiser),''), p_placement, p_starts_at, p_ends_at, coalesce(p_active,false), auth.uid())
    returning id into v;
  else
    update ads set title = btrim(p_title), body = coalesce(btrim(p_body),''), image_url = coalesce(btrim(p_image_url),''), link_url = btrim(p_link_url),
      advertiser = coalesce(btrim(p_advertiser),''), placement = p_placement, starts_at = p_starts_at, ends_at = p_ends_at, active = coalesce(p_active,false)
    where id = p_id returning id into v;
  end if;
  return v;
end $$;

create or replace function public.admin_archive_ad(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 할 수 있어'; end if;
  update ads set archived = true, active = false where id = p_id;
end $$;

create or replace function public.admin_set_ads_enabled(p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 할 수 있어'; end if;
  update ad_settings set enabled = p_on, updated_at = now() where id;
end $$;

revoke all on function public.ads_for(text), public.ad_hit(bigint,text), public.admin_ads(), public.ads_enabled_admin(), public.admin_save_ad(bigint,text,text,text,text,text,text,timestamptz,timestamptz,boolean), public.admin_archive_ad(bigint), public.admin_set_ads_enabled(boolean) from public;
revoke execute on function public.admin_ads(), public.ads_enabled_admin(), public.admin_save_ad(bigint,text,text,text,text,text,text,timestamptz,timestamptz,boolean), public.admin_archive_ad(bigint), public.admin_set_ads_enabled(boolean) from anon;
grant execute on function public.ads_for(text), public.ad_hit(bigint,text) to anon, authenticated;
grant execute on function public.admin_ads(), public.ads_enabled_admin(), public.admin_save_ad(bigint,text,text,text,text,text,text,timestamptz,timestamptz,boolean), public.admin_archive_ad(bigint), public.admin_set_ads_enabled(boolean) to authenticated;
