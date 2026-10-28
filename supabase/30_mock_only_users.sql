-- 30. 특정 학생에게만 보이는 예상 시험 (mock_exams.only_users)
--   - only_users가 비어 있으면 기존 규칙 그대로 (공개 / 비공개 보기 권한자 / owner_only)
--   - only_users가 있으면 그 학생들과 관리자에게만 보임 (mock_viewers 권한자에게도 안 보임)
--   - mock_list, mock_list_v2, mock_start는 이제 mock_visible()로 같은 규칙을 씀
alter table public.mock_exams add column if not exists only_users uuid[];

create or replace function public.mock_visible(p_exam text)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (select 1 from mock_exams e where e.id = p_exam and not e.archived
    and (e.published
      or (e.only_users is null and can_see_hidden_mocks() and (not e.owner_only or is_admin()))
      or (e.only_users is not null and (is_admin() or auth.uid() = any(e.only_users)))))
$function$;
-- mock_list / mock_list_v2 / mock_start: where 절을 mock_visible(e.id)로 교체 (mock_list_v2는 only_users 시험이면 학년·학교 조건을 건너뜀)
