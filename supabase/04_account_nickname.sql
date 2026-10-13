-- 04. 별명 검수 + 관리자 별명 초기화
-- 금지어 목록(banned_words)은 학생이 볼 수 없게 DB 안에만 둔다. (단어 자체는 이 파일에 넣지 않음)
-- 관리자 화면의 "금지어 추가"로 늘릴 수 있다.

create table if not exists public.banned_words (
  word       text primary key,                 -- 공백·기호를 뺀 소문자 형태
  kind       text not null default 'bad' check (kind in ('bad','adult','hate','reserved','allow')),  -- allow: 욕이 아닌데 걸리는 말(예외)
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.banned_words enable row level security;   -- 정책이 없으니 학생은 읽기·쓰기 모두 불가
revoke all on public.banned_words from anon, authenticated;

alter table public.profiles add column if not exists must_rename boolean not null default false;

-- 별명 중복 금지 (대소문자·띄어쓰기 무시). '별명 변경 중'(관리자가 초기화한 상태)은 여러 명 가능
create unique index if not exists profiles_nickname_unique
  on public.profiles (lower(regexp_replace(nickname, '\s', '', 'g')))
  where nickname <> '별명 변경 중';

-- 비교용 형태 4가지
--  a: 숫자를 비슷한 영어로 바꾼 뒤 글자만 (f4ck → fack, sh1t → shit)
--  b: 숫자·기호·공백을 모두 뺀 형태 (시1발 → 시발, f.u.c.k → fuck)
--  c: 한글만 남긴 형태 (시a발 → 시발)
--  d: 공백·기호만 뺀 형태, 숫자 유지 (19금)
create or replace function public.nick_forms(p text)
returns text[] language sql immutable set search_path = public as $$
  with s as (select translate(lower(coalesce(p, '')), '쒸씌싀', '씨씨시') as t)
  select array[
    regexp_replace(translate(t, '013457', 'oieast'), '[^가-힣ㄱ-ㅎㅏ-ㅣa-z]', '', 'g'),
    regexp_replace(t, '[^가-힣ㄱ-ㅎㅏ-ㅣa-z]', '', 'g'),
    regexp_replace(t, '[^가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g'),
    regexp_replace(t, '[^가-힣ㄱ-ㅎㅏ-ㅣa-z0-9]', '', 'g')
  ] from s
$$;

-- 별명에 문제가 있으면 이유(문장)를, 괜찮으면 null을 돌려준다.
create or replace function public.nickname_problem(p_nick text, p_uid uuid default null)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  n text := regexp_replace(btrim(coalesce(p_nick, '')), '\s+', ' ', 'g');
  f text[];
  k text;
begin
  if char_length(n) < 1 then return '별명을 입력해 줘.'; end if;
  if char_length(n) > 12 then return '별명은 12자까지만 돼.'; end if;
  if n !~ '^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_ .\-]+$' then
    return '한글, 영어, 숫자, 밑줄(_), 점(.), 빼기(-)만 쓸 수 있어.';
  end if;
  if n !~ '[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]' then return '글자나 숫자가 하나는 들어가야 해.'; end if;

  f := nick_forms(n);
  -- 예외 단어(allow)는 먼저 지운다 (욕이 아닌데 금지어를 품은 말)
  for k in select b.word from banned_words b where b.active and b.kind = 'allow' and b.word <> '' loop
    f := array[replace(f[1], k, ''), replace(f[2], k, ''), replace(f[3], k, ''), replace(f[4], k, '')];
  end loop;
  k := null;
  select b.kind into k from banned_words b
  where b.active and b.kind <> 'allow' and b.word <> ''
    and (position(b.word in f[1]) > 0 or position(b.word in f[2]) > 0
         or position(b.word in f[3]) > 0 or position(b.word in f[4]) > 0)
  order by case b.kind when 'adult' then 1 when 'hate' then 2 when 'bad' then 3 else 4 end
  limit 1;
  if k = 'adult'    then return '19금(성적인) 표현이 들어 있어서 쓸 수 없어. 다른 별명으로 해 줘.'; end if;
  if k = 'hate'     then return '다른 사람을 비하하거나 혐오하는 표현이 들어 있어서 쓸 수 없어. 다른 별명으로 해 줘.'; end if;
  if k = 'bad'      then return '욕설이나 비속어가 들어 있어서 쓸 수 없어. 다른 별명으로 해 줘.'; end if;
  if k = 'reserved' then return '관리자나 사이트 이름으로 착각할 수 있어서 쓸 수 없어. 다른 별명으로 해 줘.'; end if;

  -- 중복: 대소문자·띄어쓰기 무시 (민지 = 민 지, Kim = kim)
  if exists (select 1 from profiles pr
             where lower(regexp_replace(pr.nickname, '\s', '', 'g')) = lower(regexp_replace(n, '\s', '', 'g'))
               and pr.nickname <> '별명 변경 중'
               and pr.user_id is distinct from coalesce(p_uid, auth.uid())) then
    return '이미 다른 친구가 쓰고 있는 별명이야. 다른 별명으로 해 줘.';
  end if;
  return null;
end $$;
revoke all on function public.nickname_problem(text, uuid) from public, anon, authenticated;

-- 입력하는 동안 바로 검사 (학생용)
create or replace function public.check_nickname(p_nick text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r text := nickname_problem(p_nick, auth.uid());
begin
  return jsonb_build_object('ok', r is null, 'reason', r);
end $$;

-- 별명 정하기/바꾸기: 검수를 통과해야 저장된다
create or replace function public.set_nickname(p_nick text)
returns void language plpgsql security definer set search_path = public as $$
declare
  n text := regexp_replace(btrim(coalesce(p_nick, '')), '\s+', ' ', 'g');
  r text;
begin
  if auth.uid() is null then raise exception '로그인 세션이 없어'; end if;
  r := nickname_problem(n, auth.uid());
  if r is not null then raise exception '%', r; end if;
  begin
    insert into profiles(user_id, nickname) values (auth.uid(), n)
    on conflict (user_id) do update set nickname = excluded.nickname, must_rename = false;
  exception when unique_violation then
    raise exception '방금 다른 친구가 같은 별명을 정했어. 다른 별명으로 해 줘.';
  end;
end $$;

-- 관리자: 이 사람 별명 초기화 (새 별명을 정할 때까지 '별명 변경 중'으로 보임)
create or replace function public.admin_reset_nickname(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  update profiles set nickname = '별명 변경 중', must_rename = true where user_id = p_user;
end $$;

-- 관리자: 금지어 추가 → 지금 쓰고 있는 별명 중 걸리는 것은 바로 바꾸게 함
create or replace function public.admin_add_banned_word(p_word text, p_kind text default 'bad')
returns int language plpgsql security definer set search_path = public as $$
declare w text := (nick_forms(p_word))[4]; c int;
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  if w = '' then raise exception '단어를 입력해 줘'; end if;
  insert into banned_words(word, kind) values (w, coalesce(p_kind, 'bad'))
  on conflict (word) do update set kind = excluded.kind, active = true;
  update profiles set must_rename = true
  where not must_rename and nickname_problem(nickname, user_id) is not null
    and nickname_problem(nickname, user_id) not like '이미 다른 친구%';
  get diagnostics c = row_count;
  return c;   -- 새로 걸린 별명 수
end $$;

-- 관리자: 금지어 목록 보기 / 끄고 켜기
create or replace function public.admin_banned_words()
returns table(word text, kind text, active boolean) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query select b.word, b.kind, b.active from banned_words b order by b.kind, b.word;
end $$;

create or replace function public.admin_set_banned_word(p_word text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  update banned_words set active = p_active where word = p_word;
end $$;

grant execute on function public.check_nickname(text), public.set_nickname(text) to anon, authenticated;
grant execute on function public.admin_reset_nickname(uuid), public.admin_add_banned_word(text, text),
  public.admin_banned_words(), public.admin_set_banned_word(text, boolean) to authenticated;
