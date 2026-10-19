-- 22. 비공개 예상 시험(published=false)을 관리자 말고도 볼 수 있는 학생
--     mock_list / mock_list_v2 / mock_start 의 "published or is_admin()" 을 can_see_hidden_mocks() 로 바꿈.
--     학생 추가: insert into mock_viewers(user_id) values ('<uuid>');
create table if not exists public.mock_viewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.mock_viewers enable row level security;

create or replace function public.can_see_hidden_mocks()
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin() or exists (select 1 from mock_viewers v where v.user_id = auth.uid())
$$;
grant execute on function public.can_see_hidden_mocks() to authenticated;
