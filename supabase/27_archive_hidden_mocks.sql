-- 27. 사이트 정리: 비공개 예상 시험(실전 ②, 최고난도 ③, 마지막 점검)을 보관 처리해 목록·응시에서 뺌
--     공개 예상 시험만 과목당 1개 남김. 지우지 않아서 응시 기록·받은 점수는 그대로.
alter table mock_exams add column if not exists archived boolean not null default false;
update mock_exams set archived = true where not published;
-- mock_visible / mock_list / mock_list_v2 / mock_start: where 절에 `not archived` 추가 (본문은 24번과 같음)
