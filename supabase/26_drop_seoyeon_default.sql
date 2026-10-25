-- 26. 서연중 전용 없애기 (여러 학교가 쓰는 앱이니까)
--   - 기존 회원에게 자동으로 넣었던 '서연중 3학년'의 학교를 비움 → 다음 접속 때 각자 학교를 고름
--   - 서연중 범위 문제·예상 시험을 학교 구분 없는 3학년 공통으로 바꿈
--   (학교 목록의 서연중학교는 남겨 둬서 그 학교 학생은 다시 고를 수 있음)
update questions  set school_id = null where school_id = 'seoyeon';
update mock_exams set school_id = null where school_id = 'seoyeon';
update profiles   set school_id = null where school_id = 'seoyeon';
