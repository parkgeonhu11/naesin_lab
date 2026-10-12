-- 관리자 이메일 등록. 따옴표 안을 네 이메일로 바꾼 뒤 Run.
-- 관리자를 더 추가하려면 같은 줄을 이메일만 바꿔서 한 번 더 실행하면 돼.
insert into public.admin_emails(email) values ('여기에_관리자_이메일') on conflict do nothing;
