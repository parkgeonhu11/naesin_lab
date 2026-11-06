-- 31. 점수 폭 줄이기: 난이도별 배점 5·10·20·35·50 → 5·8·12·16·20
--     이미 쌓인 점수도 새 기준으로 다시 계산한다 (한 번만 실행되도록 points_rescale_log 로 막음).
--     - 맞힌 기록(score_events solve): 만점이면 새 만점, 한 번 틀린 뒤 맞힌 절반 점수면 새 만점의 절반, 0점(정답 보기·내 문제)은 그대로
--     - 오답 감점(score_penalties): 새 배점의 25%
--     - 예상 시험 보상(mock_rewards, score_events admin): 문항당 보상을 0.4배 (20→8, 40→16)
--     관리자가 직접 준 점수, 문제 제안·오류 신고 보너스는 그대로 둔다.

create or replace function public.points_for(d smallint)
returns int language sql immutable as $$
  select case d when 1 then 5 when 2 then 8 when 3 then 12 when 4 then 16 else 20 end
$$;

create table if not exists public.points_rescale_log (
  version int primary key,
  done_at timestamptz not null default now(),
  note text
);
alter table public.points_rescale_log enable row level security;

do $$
declare n_solve int; n_pen int; n_mock int;
begin
  if exists (select 1 from public.points_rescale_log where version = 2) then
    raise notice '이미 새 배점으로 다시 계산했어';
    return;
  end if;

  with m(d, o, n) as (values (1,5,5),(2,10,8),(3,20,12),(4,35,16),(5,50,20))
  update public.score_events s
     set points = case when s.points = m.o then m.n else m.n / 2 end
    from public.questions q, m
   where s.reason = 'solve' and s.points > 0 and q.id = s.question_id and m.d = q.difficulty;
  get diagnostics n_solve = row_count;

  with m(d, n) as (values (1,5),(2,8),(3,12),(4,16),(5,20))
  update public.score_penalties p
     set points = -greatest(1, round(m.n * 0.25))::int
    from public.questions q, m
   where q.id = p.question_id and m.d = q.difficulty;
  get diagnostics n_pen = row_count;

  update public.mock_exams set reward_per = greatest(1, round(reward_per * 0.4))::int where reward_per is not null;
  update public.mock_rewards r set points = round(r.points * 0.4)::int;
  update public.score_events s set points = r.points
    from public.mock_rewards r where r.event_id = s.id;
  get diagnostics n_mock = row_count;

  insert into public.points_rescale_log(version, note)
  values (2, format('solve %s, penalty %s, mock %s', n_solve, n_pen, n_mock));
end $$;
