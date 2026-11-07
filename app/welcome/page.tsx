import katex from "katex";
import Link from "next/link";
import Depth from "./Depth";

/* 소개 페이지 (tasteskill 2.5: software. 한 화면에 한 섹션, 같은 좌우 선, 제품 화면을 실제 HTML로).
   후기·이용자 수 같은 숫자는 지어내지 않는다. 화면 속 이름과 점수는 제품 화면의 예시다. */

const tex = (s: string) => s.replace(/\$([^$]+)\$/g, (_, m) => katex.renderToString(m, { throwOnError: false }));

const LEVELS = [
  { key: "easy", label: "더 쉽게", html: tex("곱셈 공식은 <b>넓이 그림</b>이에요. 한 변이 $a+b$인 정사각형을 자르면 큰 정사각형, 작은 정사각형, 똑같은 직사각형 두 개가 나와요.") },
  { key: "normal", label: "보통", html: tex("$(a+b)^2=a^2+2ab+b^2$. 가운데 $2ab$는 똑같은 직사각형 두 개의 넓이예요. $a^2+b^2$만 쓰면 이 두 조각을 빠뜨린 거예요.") },
  { key: "deep", label: "더 깊게", html: tex("분배법칙으로 $(a+b)(a+b)=a^2+ab+ba+b^2$이고, $ab=ba$라서 $2ab$로 모여요. $(a-b)^2$는 $b$ 자리에 $-b$를 넣은 $a^2-2ab+b^2$예요.") },
];

const WRAP = "mx-auto w-full max-w-[1280px] px-6 lg:px-20";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-black/12 bg-white" role="img" aria-label={label}>
      <div className="flex h-10 items-center gap-2 border-b border-black/10 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-alt" /><span className="h-2.5 w-2.5 rounded-full bg-alt" /><span className="h-2.5 w-2.5 rounded-full bg-alt" />
        <span className="ml-3 text-[13px] text-muted">내신랩</span>
      </div>
      {children}
    </div>
  );
}

function Heading({ title, run, id }: { title: string; run: string; id: string }) {
  return (
    <h2 id={id} className="max-w-[18em] text-[30px] font-semibold leading-[1.25] tracking-[-0.03em] md:text-[40px]">
      {title} <span className="text-muted">{run}</span>
    </h2>
  );
}

export default function Welcome() {
  const q = tex("$P(x)=x^3-2x^2+ax+4$를 $x-2$로 나눈 나머지가 $6$일 때, $a$의 값은?");
  const choices = ["$-1$", "$0$", "$1$", "$2$", "$3$"].map(tex);
  return (
    <div className="wl min-h-[100dvh]">
      <header className="wl-nav fixed inset-x-0 top-0 z-40 h-[64px] border-b border-black/10 bg-paper lg:h-[72px]">
        <div className={`${WRAP} flex h-full items-center gap-8`}>
          <Link href="/welcome" className="text-[21px] font-semibold tracking-[-0.03em]">내신랩</Link>
          <nav aria-label="소개 메뉴" className="hidden items-center gap-7 text-[15px] font-medium md:flex">
            <a className="wl-word" href="#review">복습</a>
            <a className="wl-word" href="#learn">개념</a>
            <a className="wl-word" href="#grading">채점</a>
            <a className="wl-word" href="#rank">랭킹</a>
          </nav>
          <div className="ml-auto flex items-center gap-5">
            <Link href="/login" className="wl-word hidden text-[15px] font-medium text-sub sm:inline">로그인</Link>
            <Link href="/" className="wl-btn wl-btn--primary">바로 시작하기</Link>
          </div>
        </div>
      </header>

      <main>
        {/* 첫 화면: 오늘 할 일 */}
        <section className="flex min-h-[100dvh] items-center pb-16 pt-[112px] lg:pt-[120px]">
          <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-12 lg:gap-6`}>
            <div className="lg:col-span-6 lg:pr-10">
              <p className="mb-5 text-[15px] text-muted">중학생·고등학생, 회원가입 없이 무료</p>
              <h1 className="text-[40px] font-semibold leading-[1.18] tracking-[-0.04em] md:text-[56px]">
                내신 공부,<br />오늘 할 것만<br />정해 드려요
              </h1>
              <p className="mt-6 max-w-[30em] text-[18px] leading-[1.7] text-sub">
                시험 범위 문제를 풀고, 틀린 유형은 사흘 뒤·일주일 뒤에 새 문제로 다시 풀어요. 하루 5문제, 10분이면 오늘 분량이 끝나요.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/" className="wl-btn wl-btn--primary">오늘 문제 풀어 보기</Link>
                <Link href="/learn" className="wl-btn wl-btn--secondary">개념 공부 둘러보기</Link>
              </div>
            </div>
            <div className="lg:col-span-6">
              <Frame label="내신랩 홈 화면: 오늘 할 일 세 줄과 시작 버튼">
                <div className="p-7 md:p-9">
                  <p className="text-[14px] text-muted">11월 7일 토요일</p>
                  <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em]">오늘은 이것만 하자</p>
                  <p className="mt-1 text-[16px] text-sub">5문제 맞히면 오늘 분량 끝. 10분이면 돼.</p>
                  <div className="mt-5 flex items-center gap-2" aria-hidden="true">
                    <i className="h-3 w-3 rounded-full bg-action" /><i className="h-3 w-3 rounded-full bg-action" />
                    <i className="h-3 w-3 rounded-full border border-black/25" /><i className="h-3 w-3 rounded-full border border-black/25" /><i className="h-3 w-3 rounded-full border border-black/25" />
                    <span className="ml-2 text-[14px] text-muted">2문제 맞힘</span>
                  </div>
                  <ol className="mt-5 border-t border-black/10">
                    {[
                      ["틀렸던 문제 다시 풀기", "오답 노트에서 2문제만", "2문제"],
                      ["다항식 이어서 공부하기", "개념 4. 나눗셈과 조립제법", "카드 4장"],
                      ["수학 1042번 풀기", "나머지정리", "1문제"],
                    ].map(([t, s, n], i) => (
                      <li key={t} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-black/10 py-4">
                        <span className="grid h-7 w-7 place-items-center rounded-full border border-black/25 text-[14px] font-semibold">{i + 1}</span>
                        <span className="text-[17px] font-medium leading-snug">{t}<small className="mt-0.5 block text-[14px] font-normal text-muted">{s}</small></span>
                        <span className="text-[14px] text-muted">{n}</span>
                      </li>
                    ))}
                  </ol>
                  <span className="wl-btn wl-btn--primary mt-6">1번부터 시작하기</span>
                </div>
              </Frame>
            </div>
          </div>
        </section>

        {/* 복습 */}
        <section className="flex min-h-[100dvh] items-center border-t border-black/10 bg-white py-24">
          <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-12 lg:gap-6`}>
            <div className="order-2 lg:order-1 lg:col-span-7 lg:pr-12">
              <div className="rounded-[20px] border border-black/12 bg-paper p-7 md:p-10" role="img" aria-label="틀린 유형이 1일, 3일, 7일 뒤에 새 문제로 다시 나오는 흐름">
                <div className="grid grid-cols-4 items-start gap-2 text-center">
                  {[
                    ["오늘", "곱셈 공식의 변형", "틀림"],
                    ["1일 뒤", "새 문제", "맞힘"],
                    ["3일 뒤", "새 문제", "맞힘"],
                    ["7일 뒤", "새 문제", "완성"],
                  ].map(([d, t, r], i) => (
                    <div key={d} className="relative">
                      {i > 0 && <span className="absolute left-[-50%] right-[50%] top-[19px] h-px bg-black/20" aria-hidden="true" />}
                      <span className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full text-[14px] font-semibold ${i === 0 ? "border border-black/25 bg-white text-muted" : i === 3 ? "bg-action text-white" : "bg-ink text-paper"}`}>{i === 0 ? "×" : i}</span>
                      <p className="mt-3 text-[15px] font-semibold">{d}</p>
                      <p className="text-[14px] text-muted">{t}</p>
                      <p className={`mt-1 text-[14px] ${i === 3 ? "font-semibold text-action" : "text-sub"}`}>{r}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-8 border-t border-black/10 pt-5 text-[16px] text-sub">두 번 연속 막히면 그 유형의 개념 카드로 돌아가요.</p>
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:col-span-5">
              <Heading id="review" title="틀린 문제는 똑같이 다시 내지 않아요." run="같은 유형의 새 문제로 1일, 3일, 7일 뒤에 다시 와요." />
              <p className="mt-6 max-w-[28em] text-[18px] leading-[1.7] text-sub">답을 외워서 맞히는 게 아니라 풀 수 있게 됐는지 확인하는 거예요. 하루 복습은 5문제를 넘지 않고, 남은 건 다음 날로 넘어가요.</p>
            </div>
          </div>
        </section>

        {/* 개념 */}
        <section id="learn" className="flex min-h-[100dvh] items-center border-t border-black/10 py-24">
          <div className={`${WRAP} grid gap-12 lg:grid-cols-12 lg:gap-6`}>
            <div className="lg:col-span-5">
              <Heading id="learn-h" title="같은 개념을 세 가지 깊이로 설명해요." run="모르겠으면 한 단계 쉽게, 궁금하면 한 단계 깊게." />
              <p className="mt-6 max-w-[28em] text-[18px] leading-[1.7] text-sub">고1 공통수학1 다항식 단원이 열려 있어요. 개념 카드 7개, 문제 98개, 손으로 움직여 보는 그림 7개. 설명과 문제는 모두 내신랩이 직접 만들었어요.</p>
              <Link href="/learn" className="wl-link mt-8 inline-block text-[16px] font-medium">다항식 단원 열어 보기</Link>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <div className="rounded-[20px] border border-black/12 bg-white p-7 md:p-10">
                <p className="text-[14px] text-muted">개념 3. 다항식의 곱셈과 곱셈 공식</p>
                <p className="mb-6 mt-1 text-[24px] font-semibold tracking-[-0.03em]">곱셈 공식은 넓이 그림이다</p>
                <Depth levels={LEVELS} />
              </div>
            </div>
          </div>
        </section>

        {/* 채점 */}
        <section id="grading" className="flex min-h-[100dvh] items-center border-t border-black/10 bg-white py-24">
          <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-12 lg:gap-6`}>
            <div className="lg:col-span-6">
              <Frame label="문제 채점 화면: 정답 보기에 빨간 동그라미, 고른 오답에 빗금">
                <div className="p-7 md:p-9">
                  <p className="text-[14px] text-muted">유형: 나머지정리 · 3 / 6</p>
                  <p className="mt-3 text-[18px] leading-[1.75]" dangerouslySetInnerHTML={{ __html: q }} />
                  <ul className="mt-6 grid gap-2">
                    {choices.map((c, i) => (
                      <li key={i} className="flex min-h-[52px] items-center gap-4 rounded-lg border border-black/20 px-4 text-[17px]">
                        <span className={`grid h-7 w-7 place-items-center rounded-full text-[14px] font-semibold ${i === 2 ? "wl-mark wl-mark--draw text-mark" : i === 3 ? "wl-slash border border-black/25 text-muted" : "border border-black/25"}`}>{i + 1}</span>
                        <span dangerouslySetInnerHTML={{ __html: c }} />
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 rounded-xl bg-paper p-5">
                    <p className="text-[13px] font-medium text-muted">핵심</p>
                    <p className="text-[16px] font-semibold" dangerouslySetInnerHTML={{ __html: tex("$x-a$로 나눈 나머지는 $P(a)$. 나눌 필요가 없어요.") }} />
                    <p className="mt-3 text-[13px] font-medium text-[#b3261e]">주의</p>
                    <p className="text-[16px] text-sub" dangerouslySetInnerHTML={{ __html: tex("$x+2$로 나누면 $P(-2)$를 계산해요. 부호를 놓치기 쉬워요.") }} />
                  </div>
                </div>
              </Frame>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <Heading id="grading-h" title="맞히면 동그라미, 틀리면 이유부터." run="해설은 핵심, 풀이, 주의 세 부분으로 나와요." />
              <p className="mt-6 max-w-[28em] text-[18px] leading-[1.7] text-sub">힌트는 세 단계예요. 2개까지는 점수가 그대로라서, 모를 때 찍지 않고 힌트를 보면 돼요. 틀려도 감점 없이 그 유형이 복습으로 들어가요.</p>
            </div>
          </div>
        </section>

        {/* 랭킹 */}
        <section id="rank" className="flex min-h-[100dvh] items-center border-t border-black/10 py-24">
          <div className={`${WRAP} grid gap-12 lg:grid-cols-12 lg:gap-6`}>
            <div className="lg:col-span-5">
              <Heading id="rank-h" title="랭킹은 매주 월요일에 새로 시작해요." run="먼저 시작한 친구를 못 따라잡을 일이 없어요." />
              <p className="mt-6 max-w-[28em] text-[18px] leading-[1.7] text-sub">점수는 문제를 처음 맞혔을 때만 들어가요. 같은 문제를 반복해서 올리는 점수는 없어요. 내 순위 옆에는 지난주의 나와 비교한 기록이 같이 보여요.</p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <div className="rounded-[20px] border border-black/12 bg-white" role="img" aria-label="주간 랭킹 표 예시: 7위인 나와 6위까지 17점 차이">
                <div className="flex items-baseline justify-between border-b border-black/10 px-7 py-5">
                  <p className="text-[18px] font-semibold">이번 주 랭킹</p>
                  <p className="text-[14px] text-muted">월요일 0시에 새로 시작</p>
                </div>
                <ol className="px-7">
                  {[
                    [1, "수학천재", 180], [2, "민트초코", 163], [3, "오늘도출석", 146], [4, "공부벌레", 129], [5, "다항식장인", 112], [6, "연필깎이", 95], [7, "나", 78],
                  ].map(([r, n, p]) => (
                    <li key={r} className={`grid grid-cols-[48px_1fr_auto] items-center border-b border-black/10 py-3.5 text-[17px] last:border-b-0 ${n === "나" ? "font-semibold" : ""}`}>
                      <span className={`text-[22px] tabular-nums tracking-[-0.02em] ${n === "나" ? "text-ink" : "text-muted"}`}>{r}</span>
                      <span>{n}</span>
                      <span className="tabular-nums">{p}점</span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-black/10 px-7 py-5 text-[16px] text-sub">
                  <span>6위까지 17점</span>
                  <span>지난주의 나보다 정답률 9%p 올랐어요</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 마무리 */}
        <section className="border-t border-black/10 bg-ink text-paper">
          <div className={`${WRAP} grid min-h-[60dvh] content-center gap-10 py-24 lg:grid-cols-12`}>
            <div className="lg:col-span-8">
              <p className="text-[36px] font-semibold leading-[1.2] tracking-[-0.04em] md:text-[56px]">오늘 5문제부터 시작해요.</p>
              <p className="mt-5 max-w-[30em] text-[18px] leading-[1.7] text-white/70">회원가입 없이 바로 풀 수 있어요. 기록을 휴대폰과 컴퓨터에서 이어 보고 싶으면 그때 Google로 로그인하면 돼요.</p>
            </div>
            <div className="flex items-end lg:col-span-4 lg:justify-end">
              <Link href="/" className="wl-btn wl-btn--primary w-full sm:w-auto">오늘 문제 풀어 보기</Link>
            </div>
          </div>
          <footer className="border-t border-white/12">
            <div className={`${WRAP} flex flex-col gap-3 py-8 text-[13px] text-white/60 md:flex-row md:items-center md:justify-between`}>
              <span>내신랩 2026. 문제는 직접 만든 것만 올려 주세요. 학교 기출문제의 저작권은 학교와 출제 선생님께 있어요.</span>
              <span className="flex gap-6">
                <Link className="wl-link text-white/80" href="/terms">이용약관</Link>
                <Link className="wl-link text-white/80" href="/privacy">개인정보처리방침</Link>
              </span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
