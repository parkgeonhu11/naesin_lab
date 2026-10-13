-- 08. 문제 그림
-- figure: 그림 설명 JSON (점 좌표, 선분, 원, 길이·각 표시). 화면에서 lib/figure.ts가 SVG로 그린다.
-- 형식은 lib/figure.ts 맨 위 설명 참고.
alter table public.questions add column if not exists figure jsonb;
