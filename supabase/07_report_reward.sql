-- 07. 오류 신고가 맞으면 신고한 사람에게 보너스 점수
-- 규칙: 관리자가 '고침(보상)'으로 처리하면 그 문제에 열려 있던 신고 중
--       가장 먼저 신고한 사람 +5점, 그 뒤에 같은 문제를 신고한 사람 +2점.
--       한 사람당 신고 보너스는 최대 20번, 자기가 낸 문제는 보너스 없음.

-- (한 번만) score_events 사유에 'report' 추가
-- alter table public.score_events drop constraint score_events_reason_check;
-- alter table public.score_events add constraint score_events_reason_check check (reason in ('solve','author','report'));

alter table public.question_reports add column if not exists reward int not null default 0;

create or replace function public.admin_close_reports(p_question uuid, p_status text, p_note text, p_reward boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  q questions%rowtype;
  i int := 0;
  pts int;
  given int;
  out jsonb := '[]'::jsonb;
  closed int;
begin
  if not is_admin() then raise exception '관리자만 가능해'; end if;
  if p_status not in ('fixed','dismissed') then raise exception '처리 상태가 이상해'; end if;
  select * into q from questions where id = p_question;

  if p_status = 'fixed' and p_reward then
    for r in select * from question_reports where question_id = p_question and status = 'open' order by created_at loop
      i := i + 1;
      pts := case when i = 1 then 5 else 2 end;
      continue when r.user_id is not distinct from q.author;
      select count(*) into given from score_events where user_id = r.user_id and reason = 'report';
      continue when given >= 20;
      insert into score_events(user_id, question_id, reason, subject, points)
      values (r.user_id, p_question, 'report', null, pts) on conflict do nothing;
      if found then
        update question_reports set reward = pts where id = r.id;
        out := out || jsonb_build_object('nickname', coalesce(r.nickname, '이름 없음'), 'points', pts);
      end if;
    end loop;
  end if;

  update question_reports set status = p_status, admin_note = nullif(btrim(coalesce(p_note, '')), ''), resolved_at = now()
  where question_id = p_question and status = 'open';
  get diagnostics closed = row_count;
  return jsonb_build_object('closed', closed, 'rewarded', out);
end $$;

-- 학생: 이 문제에 내가 한 신고 + 받은 보너스
create or replace function public.my_report_status(p_question uuid)
returns table(kind text, detail text, status text, admin_note text, reward int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.kind, r.detail, r.status, r.admin_note, r.reward, r.created_at
  from question_reports r where r.question_id = p_question and r.user_id = auth.uid()
  order by r.created_at desc limit 1
$$;

grant execute on function public.admin_close_reports(uuid, text, text, boolean), public.my_report_status(uuid) to authenticated;
revoke execute on function public.admin_close_reports(uuid, text, text, boolean), public.my_report_status(uuid) from anon, public;
