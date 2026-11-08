-- 35. 우리 학교 교과서: 과목 카탈로그, 출판사 제보, 관리자 확정 (예비 DB 2026-11-08 적용)
-- 과목 단위 교과서 제보. 중1~고3 선택과목까지 한 표(courses)에 담는다.
create table if not exists courses (
  id bigint generated always as identity primary key,
  level text not null check (level in ('mid','high')),
  subject text not null references subjects(code),
  name text not null,
  kind text not null check (kind in ('중학','공통','일반선택','진로선택','융합선택')),
  grade_hint smallint check (grade_hint between 1 and 3),
  curriculum text not null default '2022',
  sort int not null default 100,
  unique (level, name)
);
alter table courses enable row level security;

insert into courses(level, subject, name, kind, grade_hint, sort) values
 ('mid','ko','국어 1','중학',1,101),('mid','ko','국어 2','중학',2,102),('mid','ko','국어 3','중학',3,103),
 ('mid','ma','수학 1','중학',1,111),('mid','ma','수학 2','중학',2,112),('mid','ma','수학 3','중학',3,113),
 ('mid','sc','과학 1','중학',1,121),('mid','sc','과학 2','중학',2,122),('mid','sc','과학 3','중학',3,123),
 ('mid','so','사회 ①','중학',1,131),('mid','so','사회 ②','중학',3,132),
 ('mid','en','영어 1','중학',1,141),('mid','en','영어 2','중학',2,142),('mid','en','영어 3','중학',3,143),
 ('mid','hi','역사 ①','중학',2,151),('mid','hi','역사 ②','중학',3,152),
 ('high','ko','공통국어1','공통',1,201),('high','ko','공통국어2','공통',1,202),
 ('high','ko','화법과 언어','일반선택',2,203),('high','ko','독서와 작문','일반선택',2,204),('high','ko','문학','일반선택',2,205),
 ('high','ko','주제 탐구 독서','진로선택',3,206),('high','ko','문학과 영상','진로선택',3,207),('high','ko','직무 의사소통','진로선택',3,208),
 ('high','ko','독서 토론과 글쓰기','융합선택',3,209),('high','ko','매체 의사소통','융합선택',3,210),('high','ko','언어생활 탐구','융합선택',3,211),
 ('high','ma','공통수학1','공통',1,221),('high','ma','공통수학2','공통',1,222),
 ('high','ma','대수','일반선택',2,223),('high','ma','미적분Ⅰ','일반선택',2,224),('high','ma','확률과 통계','일반선택',2,225),
 ('high','ma','기하','진로선택',3,226),('high','ma','미적분Ⅱ','진로선택',3,227),('high','ma','경제 수학','진로선택',3,228),('high','ma','인공지능 수학','진로선택',3,229),('high','ma','직무 수학','진로선택',3,230),
 ('high','ma','수학과 문화','융합선택',3,231),('high','ma','실용 통계','융합선택',3,232),('high','ma','수학과제 탐구','융합선택',3,233),
 ('high','en','공통영어1','공통',1,241),('high','en','공통영어2','공통',1,242),
 ('high','en','영어Ⅰ','일반선택',2,243),('high','en','영어Ⅱ','일반선택',2,244),('high','en','영어 독해와 작문','일반선택',2,245),
 ('high','en','영미 문학 읽기','진로선택',3,246),('high','en','영어 발표와 토론','진로선택',3,247),('high','en','심화 영어','진로선택',3,248),('high','en','심화 영어 독해와 작문','진로선택',3,249),('high','en','직무 영어','진로선택',3,250),
 ('high','en','실생활 영어 회화','융합선택',3,251),('high','en','미디어 영어','융합선택',3,252),('high','en','세계 문화와 영어','융합선택',3,253),
 ('high','hi','한국사1','공통',1,261),('high','hi','한국사2','공통',1,262),
 ('high','so','통합사회1','공통',1,271),('high','so','통합사회2','공통',1,272),
 ('high','so','세계시민과 지리','일반선택',2,273),('high','so','사회와 문화','일반선택',2,274),('high','so','세계사','일반선택',2,275),('high','so','현대사회와 윤리','일반선택',2,276),
 ('high','so','한국지리 탐구','진로선택',3,277),('high','so','도시의 미래 탐구','진로선택',3,278),('high','so','동아시아 역사 기행','진로선택',3,279),('high','so','정치','진로선택',3,280),('high','so','법과 사회','진로선택',3,281),('high','so','경제','진로선택',3,282),('high','so','윤리와 사상','진로선택',3,283),('high','so','인문학과 윤리','진로선택',3,284),('high','so','국제 관계의 이해','진로선택',3,285),
 ('high','so','여행지리','융합선택',3,286),('high','so','역사로 탐구하는 현대 세계','융합선택',3,287),('high','so','사회문제 탐구','융합선택',3,288),('high','so','금융과 경제생활','융합선택',3,289),('high','so','윤리문제 탐구','융합선택',3,290),('high','so','기후변화와 지속가능한 세계','융합선택',3,291),
 ('high','sc','통합과학1','공통',1,301),('high','sc','통합과학2','공통',1,302),('high','sc','과학탐구실험1','공통',1,303),('high','sc','과학탐구실험2','공통',1,304),
 ('high','sc','물리학','일반선택',2,305),('high','sc','화학','일반선택',2,306),('high','sc','생명과학','일반선택',2,307),('high','sc','지구과학','일반선택',2,308),
 ('high','sc','역학과 에너지','진로선택',3,309),('high','sc','전자기와 양자','진로선택',3,310),('high','sc','물질과 에너지','진로선택',3,311),('high','sc','화학 반응의 세계','진로선택',3,312),('high','sc','세포와 물질대사','진로선택',3,313),('high','sc','생물의 유전','진로선택',3,314),('high','sc','지구시스템과학','진로선택',3,315),('high','sc','행성우주과학','진로선택',3,316),
 ('high','sc','과학의 역사와 문화','융합선택',3,317),('high','sc','기후변화와 환경생태','융합선택',3,318),('high','sc','융합과학 탐구','융합선택',3,319)
on conflict (level, name) do nothing;

create table if not exists textbook_publishers (
  name text primary key check (char_length(name) between 1 and 20),
  sort int not null default 100
);
alter table textbook_publishers enable row level security;
insert into textbook_publishers(name, sort) values
 ('미래엔',1),('비상교육',2),('천재교과서',3),('천재교육',4),('동아출판',5),('지학사',6),('금성출판사',7),('좋은책신사고',8),
 ('창비',9),('해냄에듀',10),('교학사',11),('YBM',12),('NE능률',13),('씨마스',14),('리베르스쿨',15),('한국학력평가원',16),('다락원',17)
on conflict do nothing;

create table if not exists textbook_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id text not null references schools(id),
  course_id bigint not null references courses(id),
  publisher text not null check (char_length(publisher) between 1 and 20),
  note text not null default '' check (char_length(note) <= 300),
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, school_id, course_id)
);
alter table textbook_reports enable row level security;
create index if not exists textbook_reports_scope on textbook_reports(school_id, course_id);

-- 관리자 확정. publisher가 null이면 확정 취소 상태
create table if not exists school_textbooks (
  school_id text not null references schools(id),
  course_id bigint not null references courses(id),
  publisher text,
  note text not null default '',
  confirmed_by uuid,
  confirmed_at timestamptz not null default now(),
  primary key (school_id, course_id)
);
alter table school_textbooks enable row level security;

create or replace function school_level(p_school text)
returns text language sql stable security definer set search_path to 'public' as $$
  select case when name ~ '(고등학교|고)$' then 'high' else 'mid' end from schools where id = p_school;
$$;

create or replace function textbook_courses()
returns table(id bigint, level text, subject text, name text, kind text, grade_hint smallint)
language sql stable security definer set search_path to 'public' as $$
  select c.id, c.level, c.subject, c.name, c.kind, c.grade_hint from courses c order by c.sort;
$$;

create or replace function textbook_publishers_list()
returns table(name text, used int)
language sql stable security definer set search_path to 'public' as $$
  with used as (select publisher, count(distinct user_id)::int n from textbook_reports group by 1)
  select p.name, coalesce(u.n, 0) from textbook_publishers p left join used u on u.publisher = p.name
  union all
  select u.publisher, u.n from used u where u.n >= 2 and not exists (select 1 from textbook_publishers p where p.name = u.publisher)
  order by 2 desc, 1;
$$;

-- 내 과목들: 내 학교 급·학년의 기본 과목 + 내가 제보한 과목 + 같은 학교 친구가 제보한 같은 급 과목
create or replace function my_textbooks()
returns table(course_id bigint, course_name text, subject text, kind text, publisher text, votes int, total int,
              confirmed boolean, my_publisher text, my_note text, notes int, school_name text, level text, grade smallint)
language plpgsql stable security definer set search_path to 'public' as $$
declare s text; g smallint; lv text; sn text;
begin
  select p.school_id, p.grade into s, g from profiles p where p.user_id = auth.uid();
  if s is null then return; end if;
  lv := school_level(s);
  select sc.name into sn from schools sc where sc.id = s;
  return query
  with mine as (
    select c.id from courses c
    where c.level = lv and (
      (g is not null and c.grade_hint = g and c.kind in ('중학','공통'))
      or exists (select 1 from textbook_reports t where t.course_id = c.id and t.school_id = s
                 and (t.user_id = auth.uid() or lv = 'high' or c.grade_hint = g))
    )
  ),
  r as (select t.* from textbook_reports t where t.school_id = s and t.course_id in (select id from mine)),
  tally as (select r.course_id, r.publisher, count(*)::int n, max(r.updated_at) last from r group by 1, 2),
  top as (select distinct on (t.course_id) t.course_id, t.publisher, t.n from tally t order by t.course_id, t.n desc, t.last desc)
  select c.id, c.name, c.subject, c.kind,
         coalesce(st.publisher, top.publisher),
         coalesce((select t.n from tally t where t.course_id = c.id and t.publisher = coalesce(st.publisher, top.publisher)), 0),
         (select count(*)::int from r where r.course_id = c.id),
         st.publisher is not null,
         (select r.publisher from r where r.course_id = c.id and r.user_id = auth.uid()),
         (select r.note from r where r.course_id = c.id and r.user_id = auth.uid()),
         (select count(*)::int from r where r.course_id = c.id and (r.note <> '' or r.admin_reply is not null)),
         sn, lv, g
  from courses c
  left join top on top.course_id = c.id
  left join school_textbooks st on st.school_id = s and st.course_id = c.id
  where c.id in (select id from mine)
  order by c.sort;
end $$;

create or replace function textbook_notes(p_course bigint)
returns table(id bigint, nickname text, publisher text, note text, admin_reply text, created_at timestamptz, mine boolean)
language plpgsql stable security definer set search_path to 'public' as $$
declare s text;
begin
  select p.school_id into s from profiles p where p.user_id = auth.uid();
  if s is null then return; end if;
  return query
  select t.id, coalesce(pr.nickname, '익명'), t.publisher, t.note, t.admin_reply, t.updated_at, t.user_id = auth.uid()
  from textbook_reports t left join profiles pr on pr.user_id = t.user_id
  where t.school_id = s and t.course_id = p_course and (t.note <> '' or t.admin_reply is not null)
  order by t.updated_at desc limit 30;
end $$;

create or replace function report_textbook(p_course bigint, p_publisher text, p_note text)
returns text
language plpgsql security definer set search_path to 'public' as $$
declare
  uid uuid := auth.uid(); s text;
  pub text := btrim(coalesce(p_publisher, ''));
  nt text := btrim(coalesce(p_note, ''));
  reason text; today int;
begin
  if uid is null then raise exception '로그인 세션이 없어'; end if;
  if exists (select 1 from profiles where user_id = uid and banned_at is not null and banned_at < now()) then raise exception '이용이 정지된 계정이야.'; end if;
  select school_id into s from profiles where user_id = uid;
  if s is null then raise exception '먼저 학교를 정해 줘'; end if;
  if not exists (select 1 from courses where id = p_course and level = school_level(s)) then raise exception '과목을 골라 줘'; end if;
  if char_length(pub) < 1 then raise exception '출판사를 골라 줘'; end if;
  if char_length(pub) > 20 then raise exception '출판사 이름은 20자까지만 돼'; end if;
  if char_length(nt) > 300 then raise exception '의견은 300자까지만 돼'; end if;
  reason := text_problem(pub); if reason is not null then raise exception '%', reason; end if;
  if nt <> '' then reason := text_problem(nt); if reason is not null then raise exception '%', reason; end if; end if;
  select count(*) into today from textbook_reports where user_id = uid and updated_at > now() - interval '1 day';
  if today >= 30 then raise exception '하루에 30번까지만 알려 줄 수 있어'; end if;
  insert into textbook_reports(user_id, school_id, course_id, publisher, note)
  values (uid, s, p_course, pub, nt)
  on conflict (user_id, school_id, course_id)
  do update set publisher = excluded.publisher, note = excluded.note, updated_at = now(),
     admin_reply = case when textbook_reports.publisher = excluded.publisher and textbook_reports.note = excluded.note then textbook_reports.admin_reply else null end;
  return '알려 줘서 고마워! 친구들 의견과 합쳐서 정리할게.';
end $$;

create or replace function admin_textbook_reports(p_limit int default 300)
returns table(id bigint, school text, school_id text, course_id bigint, course text, publisher text, note text,
              admin_reply text, nickname text, updated_at timestamptz, confirmed text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not is_admin() then raise exception '관리자만 볼 수 있어'; end if;
  return query
  select t.id, sc.name, t.school_id, t.course_id, c.name, t.publisher, t.note, t.admin_reply, pr.nickname, t.updated_at, st.publisher
  from textbook_reports t
  join schools sc on sc.id = t.school_id
  join courses c on c.id = t.course_id
  left join profiles pr on pr.user_id = t.user_id
  left join school_textbooks st on st.school_id = t.school_id and st.course_id = t.course_id
  order by t.updated_at desc limit least(greatest(p_limit, 1), 1000);
end $$;

create or replace function admin_confirm_textbook(p_school text, p_course bigint, p_publisher text, p_note text default '')
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not is_admin() then raise exception '관리자만 할 수 있어'; end if;
  insert into school_textbooks(school_id, course_id, publisher, note, confirmed_by)
  values (p_school, p_course, nullif(btrim(coalesce(p_publisher, '')), ''), coalesce(p_note, ''), auth.uid())
  on conflict (school_id, course_id) do update
    set publisher = excluded.publisher, note = excluded.note, confirmed_by = excluded.confirmed_by, confirmed_at = now();
end $$;

create or replace function admin_reply_textbook(p_id bigint, p_reply text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not is_admin() then raise exception '관리자만 할 수 있어'; end if;
  if char_length(coalesce(p_reply, '')) > 300 then raise exception '답글은 300자까지만 돼'; end if;
  update textbook_reports set admin_reply = nullif(btrim(coalesce(p_reply, '')), ''), replied_at = now() where id = p_id;
end $$;

revoke all on function school_level(text), textbook_courses(), textbook_publishers_list(), my_textbooks(), textbook_notes(bigint),
  report_textbook(bigint,text,text), admin_textbook_reports(int), admin_confirm_textbook(text,bigint,text,text), admin_reply_textbook(bigint,text) from public, anon;
grant execute on function textbook_courses(), textbook_publishers_list(), my_textbooks(), textbook_notes(bigint),
  report_textbook(bigint,text,text), admin_textbook_reports(int), admin_confirm_textbook(text,bigint,text,text), admin_reply_textbook(bigint,text) to authenticated;
