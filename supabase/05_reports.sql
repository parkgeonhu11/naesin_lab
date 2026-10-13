-- 05. 문제 오류 신고 + 관리자 문제 고치기

create table if not exists public.question_reports (
  id          bigserial primary key,
  question_id uuid not null references public.questions(id),
  user_id     uuid not null,
  nickname    text,
  kind        text not null check (kind in ('answer','body','choices','explanation','difficulty','other')),
  detail      text not null default '' check (char_length(detail) <= 500),
  status      text not null default 'open' check (status in ('open','fixed','dismissed')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists question_reports_one_open on public.question_reports(question_id, user_id) where status = 'open';
create index if not exists question_reports_status_idx on public.question_reports(status, created_at);
alter table public.question_reports enable row level security;
revoke all on public.question_reports from anon, authenticated;

-- 학생: 오류 신고 (같은 문제에 처리 안 된 신고가 있으면 내용만 고쳐짐)
create or replace function public.report_question(p_question uuid, p_kind text, p_detail text)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  d text := btrim(coalesce(p_detail, ''));
  today int;
begin
  if uid is null then raise exception '로그인 세션이 없어'; end if;
  if p_kind not in ('answer','body','choices','explanation','difficulty','other') then raise exception '신고 종류를 골라 줘'; end if;
  if char_length(d) > 500 then raise exception '설명은 500자까지만 돼'; end if;
  if p_kind = 'other' and char_length(d) < 5 then raise exception '기타를 골랐으면 무엇이 이상한지 5자 이상 써 줘'; end if;
  if not exists (select 1 from questions where id = p_question and status = 'published') then raise exception '문제를 찾을 수 없어'; end if;

  if exists (select 1 from question_reports where question_id = p_question and user_id = uid and status = 'open') then
    update question_reports set kind = p_kind, detail = d, created_at = now()
    where question_id = p_question and user_id = uid and status = 'open';
    return '신고 내용을 고쳤어. 관리자가 확인할게.';
  end if;

  select count(*) into today from question_reports where user_id = uid and created_at > now() - interval '1 day';
  if today >= 20 then raise exception '하루에 20번까지만 신고할 수 있어'; end if;

  insert into question_reports(question_id, user_id, nickname, kind, detail)
  values (p_question, uid, (select nickname from profiles where user_id = uid), p_kind, d);
  return '신고했어! 관리자가 확인하고 고칠게.';
end $$;

-- 학생: 이 문제에 내가 한 신고 (가장 최근 것)
create or replace function public.my_report(p_question uuid)
returns table(kind text, detail text, status text, admin_note text, created_at timestamptz, resolved_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.kind, r.detail, r.status, r.admin_note, r.created_at, r.resolved_at
  from question_reports r where r.question_id = p_question and r.user_id = auth.uid()
  order by r.created_at desc limit 1
$$;

-- 관리자: 처리 안 된 신고 (문제별로 묶음, 정답 포함)
create or replace function public.admin_reports()
returns table(question_id uuid, no int, subject text, unit text, topic text, qtype text, difficulty smallint, body text,
              choices jsonb, answer smallint, answer_text text, explanation text, q_status text,
              reports jsonb, first_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  return query
    select q.id, q.no, q.subject, q.unit, q.topic, q.qtype, q.difficulty, q.body, q.choices, qa.answer, qa.answer_text,
           q.explanation, q.status,
           jsonb_agg(jsonb_build_object('nickname', coalesce(r.nickname, '이름 없음'), 'kind', r.kind, 'detail', r.detail, 'at', r.created_at)
                     order by r.created_at),
           min(r.created_at)
    from question_reports r
    join questions q on q.id = r.question_id
    left join question_answers qa on qa.question_id = q.id
    where r.status = 'open'
    group by q.id, qa.answer, qa.answer_text
    order by min(r.created_at);
end $$;

-- 관리자: 이 문제의 신고를 모두 처리 (fixed = 고침, dismissed = 문제 없음)
create or replace function public.admin_resolve_reports(p_question uuid, p_status text, p_note text)
returns int language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  if p_status not in ('fixed','dismissed') then raise exception '처리 상태가 이상해'; end if;
  update question_reports set status = p_status, admin_note = nullif(btrim(coalesce(p_note, '')), ''), resolved_at = now()
  where question_id = p_question and status = 'open';
  get diagnostics c = row_count;
  return c;
end $$;

-- 관리자: 문제 고치기 (본문·보기·정답·해설·난이도)
create or replace function public.admin_update_question(
  p_question uuid, p_body text, p_choices jsonb, p_answer smallint, p_answer_text text, p_explanation text, p_difficulty smallint)
returns void language plpgsql security definer set search_path = public as $$
declare q questions%rowtype;
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  select * into q from questions where id = p_question for update;
  if not found then raise exception '문제를 찾을 수 없어'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 2 then raise exception '문제 내용을 입력해 줘'; end if;
  if p_difficulty not between 1 and 5 then raise exception '난이도는 1~5만 가능'; end if;
  if q.qtype = 'mc' then
    if jsonb_typeof(p_choices) <> 'array' or jsonb_array_length(p_choices) < 2 then raise exception '보기는 2개 이상이어야 해'; end if;
    if p_answer is null or p_answer < 0 or p_answer >= jsonb_array_length(p_choices) then raise exception '정답 번호가 보기 범위를 벗어났어'; end if;
  else
    if char_length(btrim(coalesce(p_answer_text, ''))) < 1 then raise exception '단답형 정답을 입력해 줘'; end if;
  end if;
  update questions set body = btrim(p_body),
    choices = case when q.qtype = 'mc' then p_choices else '[]'::jsonb end,
    explanation = coalesce(p_explanation, ''), difficulty = p_difficulty
  where id = p_question;
  update question_answers set answer = case when q.qtype = 'mc' then p_answer else null end,
    answer_text = case when q.qtype = 'mc' then null else btrim(p_answer_text) end
  where question_id = p_question;
end $$;

-- 관리자: 문제 공개 중지 / 다시 공개
create or replace function public.admin_set_question_visible(p_question uuid, p_visible boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  update questions set status = case when p_visible then 'published' else 'rejected' end where id = p_question;
end $$;

grant execute on function public.report_question(uuid, text, text), public.my_report(uuid) to authenticated;
grant execute on function public.admin_reports(), public.admin_resolve_reports(uuid, text, text),
  public.admin_update_question(uuid, text, jsonb, smallint, text, text, smallint),
  public.admin_set_question_visible(uuid, boolean) to authenticated;
revoke execute on function public.report_question(uuid, text, text), public.my_report(uuid), public.admin_reports(),
  public.admin_resolve_reports(uuid, text, text), public.admin_update_question(uuid, text, jsonb, smallint, text, text, smallint),
  public.admin_set_question_visible(uuid, boolean) from anon, public;
