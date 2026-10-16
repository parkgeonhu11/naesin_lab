-- 18. 과목별 '꼭 풀어야 할 20문제' (문제 목록에서 과목을 고르면 맨 위에 보인다)
--     누구나 읽을 수 있고, 관리자만 바꿀 수 있다. 문제 번호 목록은 DB에서 직접 관리한다.
create table if not exists public.must_picks (
  question_id uuid primary key references public.questions(id) on delete cascade,
  subject text not null,
  rank int not null,
  created_at timestamptz not null default now()
);
alter table public.must_picks enable row level security;
create policy must_picks_read on public.must_picks for select using (true);
create policy must_picks_admin on public.must_picks for all using (public.is_admin()) with check (public.is_admin());
grant select on public.must_picks to anon, authenticated;
