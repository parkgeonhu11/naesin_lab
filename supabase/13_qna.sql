-- 13. 질문방: 문제마다 모르는 걸 묻고, 친구들이 서로 답해 준다
-- - 질문/답변은 RPC로만 쓰고 읽는다 (테이블 직접 접근 막음)
-- - 욕설·19금·혐오 표현은 금지어 목록으로 막는다
-- - 질문한 사람은 가장 도움 된 답변 하나를 '채택'할 수 있다
-- - 답변에 '도움돼요'를 누를 수 있다 (한 사람당 한 번, 다시 누르면 취소)
-- - 내 질문에 새 답변이 달리면 알림 숫자가 뜬다
-- - 같은 사람이 너무 빨리 많이 쓰면 잠깐 막는다 (10분에 10개)
-- - 관리자는 아무 글이나 숨길 수 있다

create table if not exists public.qna_threads (
  id           bigserial primary key,
  question_id  uuid not null references public.questions(id) on delete cascade,
  user_id      uuid not null,
  body         text not null check (char_length(body) between 2 and 1000),
  accepted     bigint,
  hidden       boolean not null default false,
  created_at   timestamptz not null default now(),
  owner_seen   timestamptz not null default now()
);
create index if not exists qna_threads_q_idx on public.qna_threads(question_id, created_at desc);
create index if not exists qna_threads_time_idx on public.qna_threads(created_at desc);

create table if not exists public.qna_answers (
  id          bigserial primary key,
  thread_id   bigint not null references public.qna_threads(id) on delete cascade,
  user_id     uuid not null,
  body        text not null check (char_length(body) between 1 and 1000),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists qna_answers_t_idx on public.qna_answers(thread_id, created_at);

create table if not exists public.qna_votes (
  answer_id  bigint not null references public.qna_answers(id) on delete cascade,
  user_id    uuid not null,
  primary key (answer_id, user_id)
);

alter table public.qna_threads enable row level security;
alter table public.qna_answers enable row level security;
alter table public.qna_votes enable row level security;
revoke all on public.qna_threads, public.qna_answers, public.qna_votes from anon, authenticated;

-- 글 내용 검사: 문제가 있으면 이유, 괜찮으면 null
create or replace function public.text_problem(p text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  f text[];
  k text;
begin
  if char_length(btrim(coalesce(p, ''))) < 2 then return '두 글자 이상 써 줘.'; end if;
  if char_length(p) > 1000 then return '1000자까지만 쓸 수 있어.'; end if;
  f := nick_forms(p);
  for k in select b.word from banned_words b where b.active and b.kind = 'allow' and b.word <> '' loop
    f := array[replace(f[1], k, ''), replace(f[2], k, ''), replace(f[3], k, ''), replace(f[4], k, '')];
  end loop;
  k := null;
  select b.kind into k from banned_words b
  where b.active and b.kind in ('adult', 'hate', 'bad') and b.word <> ''
    and (position(b.word in f[1]) > 0 or position(b.word in f[2]) > 0
         or position(b.word in f[3]) > 0 or position(b.word in f[4]) > 0)
  order by case b.kind when 'adult' then 1 when 'hate' then 2 else 3 end
  limit 1;
  if k = 'adult' then return '19금(성적인) 표현이 들어 있어서 올릴 수 없어.'; end if;
  if k = 'hate'  then return '다른 사람을 비하하거나 혐오하는 표현이 들어 있어서 올릴 수 없어.'; end if;
  if k = 'bad'   then return '욕설이나 비속어가 들어 있어서 올릴 수 없어. 고운 말로 다시 써 줘.'; end if;
  return null;
end $$;

-- 글을 쓸 수 있는 사람인지 (로그인 + 별명 + 정지 아님 + 너무 빠르지 않음)
create or replace function public.qna_guard()
returns void language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  recent int;
begin
  if me is null then raise exception '로그인이 필요해.'; end if;
  if not exists (select 1 from profiles where user_id = me and nickname is not null) then raise exception '별명을 먼저 정해 줘.'; end if;
  if exists (select 1 from profiles where user_id = me and banned_at is not null) then raise exception '이용이 정지된 계정이야.'; end if;
  select (select count(*) from qna_threads where user_id = me and created_at > now() - interval '10 minutes')
       + (select count(*) from qna_answers where user_id = me and created_at > now() - interval '10 minutes') into recent;
  if recent >= 10 then raise exception '글을 너무 빨리 쓰고 있어. 조금 있다가 다시 써 줘.'; end if;
end $$;

-- 질문 올리기
create or replace function public.qna_ask(p_question uuid, p_body text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  reason text;
  nid bigint;
begin
  perform qna_guard();
  if not exists (select 1 from questions where id = p_question and status = 'published') then raise exception '없는 문제야.'; end if;
  reason := text_problem(p_body);
  if reason is not null then raise exception '%', reason; end if;
  insert into qna_threads(question_id, user_id, body) values (p_question, auth.uid(), btrim(p_body)) returning id into nid;
  return nid;
end $$;

-- 답변 달기
create or replace function public.qna_reply(p_thread bigint, p_body text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  reason text;
  nid bigint;
begin
  perform qna_guard();
  if not exists (select 1 from qna_threads where id = p_thread and not hidden) then raise exception '없는 질문이야.'; end if;
  reason := text_problem(p_body);
  if reason is not null then raise exception '%', reason; end if;
  insert into qna_answers(thread_id, user_id, body) values (p_thread, auth.uid(), btrim(p_body)) returning id into nid;
  return nid;
end $$;

-- 질문 목록 (p_question이 있으면 그 문제만, p_filter: all / open(채택 전) / mine)
create or replace function public.qna_list(p_question uuid default null, p_filter text default 'all', p_limit int default 50)
returns table(id bigint, question_id uuid, no int, subject text, topic text, title text, body text, nickname text, user_id uuid,
              is_mine boolean, answers bigint, accepted boolean, created_at timestamptz, last_at timestamptz, unread bigint)
language sql stable security definer set search_path = public as $$
  select t.id, t.question_id, q.no, q.subject, q.topic,
         left(regexp_replace(split_part(q.body, E'\n', 1), '\s+', ' ', 'g'), 50),
         t.body, coalesce(p.nickname, '이름 없음'), t.user_id, t.user_id = auth.uid(),
         (select count(*) from qna_answers a where a.thread_id = t.id and not a.hidden),
         t.accepted is not null, t.created_at,
         greatest(t.created_at, coalesce((select max(a.created_at) from qna_answers a where a.thread_id = t.id and not a.hidden), t.created_at)),
         case when t.user_id = auth.uid()
              then (select count(*) from qna_answers a where a.thread_id = t.id and not a.hidden and a.created_at > t.owner_seen and a.user_id <> t.user_id)
              else 0 end
  from qna_threads t
  join questions q on q.id = t.question_id
  left join profiles p on p.user_id = t.user_id
  where not t.hidden and auth.uid() is not null
    and (p_question is null or t.question_id = p_question)
    and (p_filter <> 'open' or t.accepted is null)
    and (p_filter <> 'mine' or t.user_id = auth.uid())
  order by 14 desc
  limit greatest(1, least(p_limit, 200))
$$;

-- 질문 하나와 답변들 (내 질문이면 읽음 처리)
create or replace function public.qna_thread(p_thread bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t qna_threads%rowtype;
  me uuid := auth.uid();
begin
  if me is null then raise exception '로그인이 필요해.'; end if;
  select * into t from qna_threads where id = p_thread and not hidden;
  if not found then return null; end if;
  if t.user_id = me then update qna_threads set owner_seen = now() where id = p_thread; end if;
  return (
    select jsonb_build_object(
      'id', t.id, 'body', t.body, 'created_at', t.created_at, 'is_mine', t.user_id = me, 'user_id', t.user_id,
      'nickname', (select nickname from profiles where user_id = t.user_id),
      'accepted', t.accepted,
      'answers', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id, 'body', a.body, 'created_at', a.created_at, 'user_id', a.user_id,
          'nickname', coalesce(p.nickname, '이름 없음'), 'is_mine', a.user_id = me, 'is_asker', a.user_id = t.user_id,
          'votes', (select count(*) from qna_votes v where v.answer_id = a.id),
          'voted', exists (select 1 from qna_votes v where v.answer_id = a.id and v.user_id = me))
          order by (a.id = t.accepted) desc, a.created_at)
        from qna_answers a left join profiles p on p.user_id = a.user_id
        where a.thread_id = t.id and not a.hidden), '[]'::jsonb)));
end $$;

-- 채택 (질문한 사람만, 자기 답변은 안 됨). 같은 답변을 다시 누르면 채택 취소
create or replace function public.qna_accept(p_thread bigint, p_answer bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t qna_threads%rowtype;
  a qna_answers%rowtype;
begin
  select * into t from qna_threads where id = p_thread and not hidden;
  if not found or t.user_id <> auth.uid() then raise exception '질문한 사람만 채택할 수 있어.'; end if;
  select * into a from qna_answers where id = p_answer and thread_id = p_thread and not hidden;
  if not found then raise exception '없는 답변이야.'; end if;
  if a.user_id = t.user_id then raise exception '내 답변은 채택할 수 없어.'; end if;
  update qna_threads set accepted = case when accepted = p_answer then null else p_answer end where id = p_thread;
end $$;

-- 도움돼요 (누르면 켜지고 다시 누르면 꺼짐, 내 답변엔 못 누름)
create or replace function public.qna_vote(p_answer bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception '로그인이 필요해.'; end if;
  if not exists (select 1 from qna_answers where id = p_answer and not hidden) then raise exception '없는 답변이야.'; end if;
  if exists (select 1 from qna_answers where id = p_answer and user_id = me) then raise exception '내 답변에는 누를 수 없어.'; end if;
  if exists (select 1 from qna_votes where answer_id = p_answer and user_id = me) then
    delete from qna_votes where answer_id = p_answer and user_id = me;
    return false;
  end if;
  insert into qna_votes(answer_id, user_id) values (p_answer, me);
  return true;
end $$;

-- 내 글 지우기 (질문을 지우면 답변도 같이 숨김)
create or replace function public.qna_remove(p_kind text, p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  n int := 0;
begin
  if p_kind = 'thread' then
    update qna_threads set hidden = true where id = p_id and (user_id = auth.uid() or is_admin());
    get diagnostics n = row_count;
  elsif p_kind = 'answer' then
    update qna_answers set hidden = true where id = p_id and (user_id = auth.uid() or is_admin());
    get diagnostics n = row_count;
    if n > 0 then update qna_threads set accepted = null where accepted = p_id; end if;
  end if;
  if n = 0 then raise exception '지울 수 없는 글이야.'; end if;
end $$;

-- 내 질문에 새로 달린 답변 수 (메뉴 알림)
create or replace function public.qna_unread()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from qna_answers a join qna_threads t on t.id = a.thread_id
  where t.user_id = auth.uid() and not t.hidden and not a.hidden and a.created_at > t.owner_seen and a.user_id <> t.user_id
$$;

-- 관리자: 최근 글 모아 보기 (숨긴 글 포함)
create or replace function public.admin_qna(p_limit int default 100)
returns table(kind text, id bigint, thread_id bigint, no int, body text, nickname text, email text, hidden boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    select * from (
      select 'thread'::text, t.id, t.id, q.no, t.body, p.nickname, u.email::text, t.hidden, t.created_at
      from qna_threads t join questions q on q.id = t.question_id left join profiles p on p.user_id = t.user_id left join auth.users u on u.id = t.user_id
      union all
      select 'answer'::text, a.id, a.thread_id, q.no, a.body, p.nickname, u.email::text, a.hidden, a.created_at
      from qna_answers a join qna_threads t on t.id = a.thread_id join questions q on q.id = t.question_id
      left join profiles p on p.user_id = a.user_id left join auth.users u on u.id = a.user_id
    ) x order by 9 desc limit greatest(1, least(p_limit, 500));
end $$;

create or replace function public.admin_qna_hide(p_kind text, p_id bigint, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  if p_kind = 'thread' then update qna_threads set hidden = p_hidden where id = p_id;
  else
    update qna_answers set hidden = p_hidden where id = p_id;
    if p_hidden then update qna_threads set accepted = null where accepted = p_id; end if;
  end if;
end $$;

grant execute on function public.qna_ask(uuid, text), public.qna_reply(bigint, text), public.qna_list(uuid, text, int),
  public.qna_thread(bigint), public.qna_accept(bigint, bigint), public.qna_vote(bigint), public.qna_remove(text, bigint),
  public.qna_unread(), public.admin_qna(int), public.admin_qna_hide(text, bigint, boolean) to authenticated;
revoke execute on function public.qna_ask(uuid, text), public.qna_reply(bigint, text), public.qna_list(uuid, text, int),
  public.qna_thread(bigint), public.qna_accept(bigint, bigint), public.qna_vote(bigint), public.qna_remove(text, bigint),
  public.qna_unread(), public.admin_qna(int), public.admin_qna_hide(text, bigint, boolean) from anon, public;
revoke execute on function public.text_problem(text), public.qna_guard() from anon, authenticated, public;
