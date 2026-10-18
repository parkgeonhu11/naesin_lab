-- 21. 여러 중학교·학년으로 확장
--   - schools: 학교 목록 (누구나 읽기, 학생이 없는 학교를 추가할 수 있음)
--   - profiles.school_id / grade: 내 학교·학년 (기존 학생은 서연중 3학년)
--   - questions / mock_exams: grade(학년) + school_id(null = 그 학년 공통, 값이 있으면 그 학교 전용)
--   - *_v2 함수: 보는 사람의 학교·학년에 맞는 것만 돌려준다. 예전 함수는 그대로 둬서 지금 사이트는 안 바뀜.

create table if not exists public.schools (
  id         text primary key,
  name       text not null unique,
  region     text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.schools enable row level security;
create policy schools_read on public.schools for select using (true);
grant select on public.schools to anon, authenticated;
insert into public.schools(id, name, region) values ('seoyeon', '서연중학교', null) on conflict do nothing;

alter table public.profiles add column if not exists school_id text references public.schools(id);
alter table public.profiles add column if not exists grade smallint check (grade between 1 and 3);
update public.profiles set school_id = 'seoyeon', grade = 3 where school_id is null and grade is null;
grant select (school_id, grade) on public.profiles to anon, authenticated;

alter table public.questions add column if not exists grade smallint not null default 3 check (grade between 1 and 3);
alter table public.questions add column if not exists school_id text references public.schools(id);
-- 교과서·학교 범위를 따르는 과목은 서연중 전용, 수학·과학은 3학년 공통
update public.questions set school_id = 'seoyeon' where school_id is null and subject in ('ko', 'en', 'so', 'hi', 'hm');

alter table public.mock_exams add column if not exists grade smallint not null default 3 check (grade between 1 and 3);
alter table public.mock_exams add column if not exists school_id text references public.schools(id);
update public.mock_exams set school_id = 'seoyeon' where school_id is null;

alter table public.categories add column if not exists grade smallint not null default 3 check (grade between 1 and 3);

-- 보는 사람의 학교·학년 (로그인 안 했거나 아직 안 골랐으면 null)
create or replace function public.my_scope()
returns table(school_id text, school_name text, grade smallint)
language sql stable security definer set search_path = public as $$
  select p.school_id, s.name, p.grade from profiles p left join schools s on s.id = p.school_id where p.user_id = auth.uid()
$$;
grant execute on function public.my_scope() to anon, authenticated;

-- 학교 이름 검사
create or replace function public.school_name_problem(p_name text)
returns text language plpgsql stable security definer set search_path = public as $$
declare n text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', '', 'g'); k text;
begin
  if n ~ '중$' then n := n || '학교'; end if;
  if n !~ '^[가-힣A-Za-z0-9]{1,16}중학교$' then return '학교 이름은 "○○중학교" 꼴로 써 줘 (한글·영어·숫자만).'; end if;
  select b.kind into k from banned_words b where b.active and b.kind <> 'allow' and b.word <> '' and position(b.word in n) > 0 limit 1;
  if k is not null then return '쓸 수 없는 말이 들어 있어.'; end if;
  return null;
end $$;
revoke all on function public.school_name_problem(text) from public, anon, authenticated;

-- 학교 찾기 (이름 일부로)
create or replace function public.school_search(p_q text)
returns table(id text, name text, region text, students bigint)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.region, (select count(*) from profiles p where p.school_id = s.id)
  from schools s
  where coalesce(btrim(p_q), '') = '' or s.name like '%' || regexp_replace(btrim(p_q), '\s+', '', 'g') || '%'
  order by (select count(*) from profiles p where p.school_id = s.id) desc, s.name
  limit 30
$$;
grant execute on function public.school_search(text) to anon, authenticated;

-- 내 학교·학년 정하기 (목록에 없으면 학교를 새로 만든다)
create or replace function public.set_my_school(p_school_name text, p_grade int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  n text := regexp_replace(btrim(coalesce(p_school_name, '')), '\s+', '', 'g');
  r text; sid text;
begin
  if auth.uid() is null then raise exception '로그인 세션이 없어'; end if;
  if p_grade is null or p_grade not between 1 and 3 then raise exception '학년은 1~3 중에서 골라 줘'; end if;
  if n ~ '중$' then n := n || '학교'; end if;
  select id into sid from schools where name = n;
  if sid is null then
    r := school_name_problem(n);
    if r is not null then raise exception '%', r; end if;
    sid := 's' || substr(md5(n), 1, 10);
    insert into schools(id, name, created_by) values (sid, n, auth.uid()) on conflict (name) do nothing;
    select id into sid from schools where name = n;
  end if;
  if not exists (select 1 from profiles where user_id = auth.uid()) then raise exception '별명을 먼저 정해 줘'; end if;
  update profiles set school_id = sid, grade = p_grade where user_id = auth.uid();
  return jsonb_build_object('school_id', sid, 'school_name', n, 'grade', p_grade);
end $$;
grant execute on function public.set_my_school(text, int) to authenticated;

-- 문제 목록 v2: 내 학년 + (학년 공통 또는 우리 학교 전용). p_grade/p_school을 주면 그걸로.
create or replace function public.problem_list_v2(p_grade int default null, p_school text default null)
returns table(no int, id uuid, subject text, unit text, topic text, qtype text, difficulty smallint, title text,
              solvers bigint, submissions bigint, accuracy int, source text, author_nick text, from_student boolean, grade smallint, school_id text)
language sql stable security definer set search_path = public as $$
  with me as (
    select coalesce(p_grade, (select pr.grade from profiles pr where pr.user_id = auth.uid()), 3) g,
           coalesce(p_school, (select pr.school_id from profiles pr where pr.user_id = auth.uid())) s
  )
  select q.no, q.id, q.subject, q.unit, q.topic, q.qtype, q.difficulty,
         left(regexp_replace(split_part(q.body, E'\n', 1), '\s+', ' ', 'g'), 60),
         coalesce(st.solvers, 0), coalesce(st.subs, 0), coalesce(st.acc, 0),
         q.source, q.author_nick, q.author is not null, q.grade, q.school_id
  from questions q
  cross join me
  left join (
    select question_id,
           count(distinct user_id) filter (where is_correct) solvers,
           count(*) subs,
           round(100.0 * count(*) filter (where is_correct) / nullif(count(*), 0))::int acc
    from attempts group by question_id
  ) st on st.question_id = q.id
  where q.status = 'published' and q.grade = me.g and (q.school_id is null or q.school_id = me.s)
  order by q.no
$$;
grant execute on function public.problem_list_v2(int, text) to anon, authenticated;

-- 랭킹 v2: p_scope = 'school'(우리 학교·학년) | 'grade'(전국 같은 학년) | 'all'
create or replace function public.leaderboard_v2(p_subject text default 'all', p_period text default 'all', p_limit int default 100, p_scope text default 'school')
returns table(rank bigint, user_id uuid, nickname text, points bigint, solved bigint, submissions bigint, school_name text, grade smallint)
language sql stable security definer set search_path = public as $$
  with me as (select pr.school_id s, pr.grade g from profiles pr where pr.user_id = auth.uid()),
  e as (
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
         coalesce(s.submissions, 0), sc.name, p.grade
  from t left join profiles p on p.user_id = t.user_id
         left join schools sc on sc.id = p.school_id
         left join s on s.user_id = t.user_id
  where t.points > 0 and p.banned_at is null
    and (p_scope = 'all'
         or not exists (select 1 from me)
         or (p_scope = 'grade' and p.grade = (select g from me))
         or (p_scope = 'school' and p.grade = (select g from me) and p.school_id = (select s from me)))
  order by t.points desc, t.user_id
  limit greatest(1, least(p_limit, 500))
$$;
grant execute on function public.leaderboard_v2(text, text, int, text) to anon, authenticated;

-- 예상 시험 목록 v2: 내 학년 + (공통 또는 우리 학교)
create or replace function public.mock_list_v2()
returns table(id text, subject text, title text, scope text, time_limit int, items int, essays int,
              takers int, my_status text, my_correct int, my_total int, my_elapsed int, my_score int, my_rank int, my_tries int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare g smallint; s text;
begin
  perform mock_close_expired(null);
  select pr.grade, pr.school_id into g, s from profiles pr where pr.user_id = auth.uid();
  g := coalesce(g, 3);
  return query
  with board as (
    select ma.exam_id, ma.user_id, ma.correct, ma.total, ma.elapsed, ma.score,
           rank() over (partition by ma.exam_id order by ma.score desc, ma.correct desc, ma.elapsed asc)::int as rk
    from mock_attempts ma join profiles p on p.user_id = ma.user_id
    where ma.ranked and ma.status = 'done' and p.banned_at is null
  )
  select e.id, e.subject, e.title, e.scope, e.time_limit,
    (select count(*)::int from mock_items i where i.exam_id = e.id),
    (select count(*)::int from mock_essays x where x.exam_id = e.id),
    (select count(*)::int from board b where b.exam_id = e.id),
    (select ma.status from mock_attempts ma where ma.exam_id = e.id and ma.user_id = auth.uid() and ma.ranked),
    b.correct, b.total, b.elapsed, b.score, b.rk,
    (select count(*)::int from mock_attempts ma where ma.exam_id = e.id and ma.user_id = auth.uid())
  from mock_exams e
  left join board b on b.exam_id = e.id and b.user_id = auth.uid()
  where (e.published or is_admin()) and e.grade = g and (e.school_id is null or e.school_id = s)
  order by e.sort, e.id;
end $$;
grant execute on function public.mock_list_v2() to anon, authenticated;

-- 학생이 제안한 문제는 그 학생의 학년·학교로 자동 지정
create or replace function public.questions_fill_scope()
returns trigger language plpgsql security definer set search_path = public as $$
declare g smallint; s text;
begin
  if new.author is not null then
    select p.grade, p.school_id into g, s from profiles p where p.user_id = new.author;
    if g is not null then new.grade := g; end if;
    if new.school_id is null and s is not null then new.school_id := s; end if;
  end if;
  return new;
end $$;
create trigger questions_fill_scope before insert on public.questions for each row execute function public.questions_fill_scope();

-- 관리자: 문제의 학년·학교 바꾸기 (p_school이 null이면 그 학년 공통)
create or replace function public.admin_set_question_scope(p_question uuid, p_grade int, p_school text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  if p_grade not between 1 and 3 then raise exception '학년은 1~3'; end if;
  if p_school is not null and not exists (select 1 from schools where id = p_school) then raise exception '그런 학교가 없어'; end if;
  update questions set grade = p_grade, school_id = p_school where id = p_question;
end $$;
grant execute on function public.admin_set_question_scope(uuid, int, text) to authenticated;
