-- 24. 관리자 전용(owner_only) 모의고사 + 채점 현황에서 관리자 제출 숨김
-- (문항·정답 데이터는 레포에 두지 않음)
alter table mock_exams add column if not exists owner_only boolean not null default false;

-- 보이는 조건: published 이거나, 비공개 열람 권한이 있고 (owner_only면 관리자만)
create or replace function public.mock_visible(p_exam text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from mock_exams e where e.id = p_exam
    and (e.published or (can_see_hidden_mocks() and (not e.owner_only or is_admin()))))
$$;

-- mock_list / mock_list_v2 / mock_start: where 조건을
--   e.published or (can_see_hidden_mocks() and (not e.owner_only or is_admin()))
-- 로 바꿈 (본문은 22_mock_viewers.sql 과 같음)
-- mock_board: 맨 앞에 `if not mock_visible(p_exam) then return; end if;` 추가

-- 채점 현황: 관리자 계정 제출은 본인·관리자 외에는 안 보임
create or replace function public.recent_submissions(p_limit integer default 50, p_only_me boolean default false)
returns table(id bigint, nickname text, is_me boolean, problem_no integer, subject text, title text, is_correct boolean, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $function$
  with adm as (select ap.user_id from admin_people() ap)
  select a.id, coalesce(p.nickname, '이름 없음'), a.user_id = auth.uid(), q.no, q.subject,
         left(regexp_replace(split_part(q.body, E'\n', 1), '\s+', ' ', 'g'), 40), a.is_correct, a.created_at
  from attempts a
  join questions q on q.id = a.question_id
  left join profiles p on p.user_id = a.user_id
  where (not p_only_me or a.user_id = auth.uid())
    and (a.user_id = auth.uid() or is_admin() or a.user_id not in (select adm.user_id from adm))
  order by a.id desc
  limit greatest(1, least(p_limit, 200))
$function$;
