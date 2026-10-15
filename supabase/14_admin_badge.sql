-- 14. 관리자 표시: 관리자 계정의 user_id와 별명을 알려 줘서 화면에 'ADMIN' 배지를 붙인다 (이메일은 안 내보냄)
create or replace function public.admin_people()
returns table(user_id uuid, nickname text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, p.nickname
  from auth.users u
  join admin_emails a on lower(a.email) = lower(u.email)
  left join profiles p on p.user_id = u.id
$$;
grant execute on function public.admin_people() to anon, authenticated;
