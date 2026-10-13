# 내신랩 설치·배포 안내서 (Windows + VS Code 기준)

코딩을 몰라도 순서대로 하면 돼. 코드는 이미 다 완성돼 있어서, 네가 할 일은 **설치 → 복사·붙여넣기 → 버튼 누르기**야.
전부 무료고, 처음이면 1시간 정도 걸려.

## 이 사이트가 하는 일
- 회원가입 없이 접속하면 바로 문제를 풀 수 있어 (임시 계정 자동 생성). **Google로 로그인**하면 기록이 계정에 묶여서 다른 기기에서도 이어져
- 별명은 저장할 때 자동 검수 (욕설·비속어·19금·비하·사칭 금지, 띄어쓰기·숫자 섞어도 잡음). 관리자는 별명 초기화·금지어 추가 가능
- 과목 → 대단원 → 세부 유형 → 난이도 4단계 분류, 문제 번호(1001번~)
- 객관식 + 단답형 (단답형은 띄어쓰기·마침표·° 기호를 무시하고 채점, 정답 여러 개 허용)
- 시험지 만들기: 단원·유형·난이도·형식·문항 수를 골라 모의고사처럼 한 번에 풀고 채점
- 오답 노트: 틀린 문제 모아 보기, 오답만 다시 시험 보기
- 성적 분석: 단원별 진도·정답률, 약점 유형 TOP 3
- 난이도별 점수 (기초 5 · 쉬움 10 · 보통 20 · 어려움 35 · 최상위 50점)
- 처음 맞히면 만점, 틀린 뒤 맞히면 절반, 같은 문제는 한 번만 점수
- **정답과 채점은 서버에만 있어서** 개발자 도구로 정답을 보거나 점수를 조작할 수 없어
- 랭킹: 전체 / 과목별 / 이번 주(매주 월요일 초기화) + 첫 화면 TOP 5
- 학생 문제 제안 → 관리자 승인 → 공개 + 제안자 +5점 (최대 20문제)
- 관리자: 제안 승인·반려, 문제 직접 추가, 참가자 현황, 전체 초기화

## 사용하는 서비스 3개
| 서비스 | 하는 일 | 비유 |
|---|---|---|
| **Supabase** | 문제·정답·점수 저장, 채점, 익명 계정 | 교무실 (성적 보관 + 채점) |
| **GitHub** | 코드 보관 | 사물함 |
| **Vercel** | 사이트를 인터넷에 공개 (주소 발급) | 학교 게시판 |

## 파일 구조
```
naesin-lab/
├── app/
│   ├── page.tsx              홈 (TOP 5, 과목별 문제 수, 최근 채점)
│   ├── problems/             문제 목록 (과목→단원 분류, 난이도·풀이 상태 필터, 검색)
│   ├── problem/[no]/         문제 풀이 (1001번~, 제출 → 맞았습니다!! / 틀렸습니다)
│   ├── exam/                 시험지 만들기 · 풀기 · 결과
│   ├── review/               오답 노트
│   ├── status/               채점 현황 (최근 제출, 내 제출)
│   ├── ranking/              랭킹 (누적·주간 × 전체·과목별)
│   ├── suggest/              문제 제안
│   ├── me/                   내 정보 (점수, 약점 유형, 단원별 진도·정답률, 닉네임 변경)
│   ├── admin/                관리자 페이지 (메뉴에 안 보임, /admin 으로 접속)
│   ├── layout.tsx            모든 화면 공통 틀 (상단 메뉴)
│   └── globals.css           디자인
├── components/               화면 조각 (상단 메뉴, 뱃지, 답 입력 칸, 닉네임 입력, 문제 입력 폼)
├── lib/                      Supabase 연결, 로그인 상태, 문제 목록 불러오기, 과목·난이도·점수표
├── supabase/
│   ├── 01_schema.sql         데이터베이스 설계 + 서버 채점 (1번째로 실행)
│   ├── 02_structure.sql      과목과 분류(대단원 → 세부 유형) 구조만, 문제는 없음 (2번째로 실행)
│   ├── 03_admin.sql          관리자 이메일 등록 (3번째로 실행)
│   └── 04_account_nickname.sql 별명 검수·별명 초기화 (4번째로 실행, 금지어 목록은 관리자 화면에서 추가)
├── .env.example              Supabase 연결 정보 견본
└── package.json
```

---

## 1단계. 프로그램 설치 (처음 한 번만)
1. **Node.js**: nodejs.org 에서 **LTS** 버전을 받아 설치해. 설치 화면은 전부 기본값 그대로 Next.
2. **VS Code**: code.visualstudio.com 에서 받아 설치해.
3. **Git**: git-scm.com 에서 받아 설치해. 역시 기본값 그대로.
4. 설치가 끝나면 컴퓨터를 한 번 재시작하는 게 안전해.

확인: `Win + R` → `cmd` 입력 → Enter → 검은 창에 `node -v` 입력. `v22.x.x` 같은 숫자가 나오면 성공.

## 2단계. 프로젝트 열기
1. 받은 `naesin-lab.zip`을 **문서 폴더**에 압축 풀어 (`문서\naesin-lab`).
2. VS Code → 위 메뉴 **File → Open Folder** → `naesin-lab` 폴더 선택.
3. "이 폴더의 작성자를 신뢰하나요?"가 뜨면 **Yes, I trust**.
4. 위 메뉴 **Terminal → New Terminal** → 아래 칸에 입력하고 Enter:
   ```
   npm install
   ```
   1~2분 기다려. `added ... packages`가 나오면 끝.

## 3단계. Supabase 만들기 (데이터베이스)
1. **supabase.com** → **Start your project** → **Continue with GitHub**(또는 이메일)로 가입.
   GitHub 계정이 없으면 github.com 에서 먼저 만들어 (5단계에서도 써).
2. **New project**:
   - Name: `naesin-lab`
   - Database Password: **Generate a password** 누르고, 나온 비밀번호를 메모장에 따로 저장
   - Region: **Northeast Asia (Seoul)**
   - **Create new project** → 1~2분 기다려.
3. 왼쪽 메뉴 **SQL Editor** → **New query**:
   - VS Code에서 `supabase/01_schema.sql`을 열어 `Ctrl+A` → `Ctrl+C`.
   - SQL Editor에 `Ctrl+V` → 오른쪽 아래 **Run**. `Success. No rows returned`가 나오면 성공.
   - 같은 방법으로 **New query** → `02_structure.sql` 붙여 넣고 **Run** (과목과 분류 구조가 들어가. 문제는 없어).
   - 다시 **New query** → `03_admin.sql` 붙여 넣고, `여기에_관리자_이메일`을 **네 이메일**로 바꾼 뒤 **Run**.
   - 경고창("destructive operation" 등)이 뜨면 **Run this query**를 눌러도 돼.
4. 확인: 왼쪽 **Table Editor** → `categories` 테이블에 분류가 보이면 성공. `questions`는 비어 있는 게 맞아.

## 4단계. 익명 로그인 켜기
1. 왼쪽 메뉴 **Authentication → Sign In / Providers** (또는 **Settings**).
2. **Allow anonymous sign-ins**를 **켜고 저장**.
3. 같은 화면에서 **Email** 로그인이 켜져 있는지 확인 (관리자 로그인에 써, 보통 기본으로 켜져 있어).
4. **Allow manual linking**도 **켜기** (임시 계정에 Google 계정을 붙여서 기록을 그대로 옮길 때 필요해).

## 4-1단계. Google 로그인 켜기
1. [Google Cloud Console](https://console.cloud.google.com) → 새 프로젝트 → **APIs & Services → OAuth consent screen**: User type **External**, 앱 이름 `내신랩`, 이메일 입력 → 저장. 다 만든 뒤 **Publish app**(게시)을 눌러야 아무 Google 계정이나 로그인할 수 있어.
2. **Credentials → Create credentials → OAuth client ID** → Application type **Web application**.
   - **Authorized redirect URIs**에 `https://<내 프로젝트 ID>.supabase.co/auth/v1/callback` 추가 (Supabase의 Google 설정 화면에 이 주소가 그대로 나와 있어서 복사하면 돼).
3. 만들어진 **Client ID**와 **Client secret**을 Supabase **Authentication → Sign In / Providers → Google**에 붙여 넣고 **Enable** → **Save**.
   Client secret은 비밀번호랑 같아. 다른 사람이나 채팅에 보내지 말고 Supabase 화면에만 넣어.

## 5단계. 연결 정보 넣고 내 컴퓨터에서 실행
1. Supabase 왼쪽 아래 톱니바퀴 **Project Settings → API Keys**(또는 **Data API**)에서 두 값을 찾아:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **Publishable key** (`sb_publishable_...`). 화면에 `anon public` 키만 있으면 그걸 써도 돼.
   - ⚠️ `secret` 이나 `service_role` 키는 **절대** 쓰지 마.
2. VS Code 왼쪽 파일 목록에서 `.env.example`을 우클릭 → **Copy** → 빈 곳 우클릭 → **Paste** → 이름을 `.env.local`로 바꿔.
3. `.env.local`을 열어 `=` 오른쪽을 1번에서 찾은 값으로 바꾸고 `Ctrl+S`.
4. 터미널에 입력:
   ```
   npm run dev
   ```
5. 크롬에서 **http://localhost:3000** 열기 → 닉네임 정하고 문제 하나 맞혀 봐. TOP 5에 이름이 뜨면 성공!
   (이 주소는 네 컴퓨터에서만 열려. 친구들한테 공개하는 건 6~7단계.)
6. 끄려면 터미널에서 `Ctrl + C`.

## 6단계. GitHub에 코드 올리기
1. github.com → 오른쪽 위 **+** → **New repository** → 이름 `naesin-lab` → **Private** 선택 → **Create repository**.
2. VS Code 왼쪽 세로 메뉴에서 갈림길 모양 아이콘(**Source Control**) 클릭.
3. **Initialize Repository** → 메시지 칸에 `첫 버전` 입력 → **Commit** (스테이징 하냐고 물으면 **Yes**).
4. **Publish Branch** → GitHub 로그인 → **Publish to GitHub private repository** → `naesin-lab` 선택.
5. `.env.local`은 자동으로 제외되니까 비밀 정보가 올라갈 걱정은 안 해도 돼.

## 7단계. Vercel로 인터넷에 공개하기
1. **vercel.com** → **Sign Up** → **Continue with GitHub**.
2. **Add New → Project** → `naesin-lab` 옆 **Import**.
3. **Environment Variables** 칸을 펼쳐서 두 개 추가 (`.env.local`과 똑같이):
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Publishable key
4. **Deploy** → 1~2분 뒤 축하 화면이 나오면 끝. `naesin-lab-xxxx.vercel.app` 같은 주소가 생겨.
5. 주소 바꾸기: 프로젝트 → **Settings → Domains** → `seoyeon-rank.vercel.app`처럼 원하는 이름 추가.

## 8단계. 관리자 로그인 연결 (마지막!)
1. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: 네 Vercel 주소 (예: `https://seoyeon-rank.vercel.app`)
   - **Redirect URLs**에 **Add URL**: `https://seoyeon-rank.vercel.app/**` 와 `http://localhost:3000/**`
   - **Save**.
2. 사이트 주소 뒤에 `/admin`을 붙여서 열어 (예: `https://seoyeon-rank.vercel.app/admin`).
3. 3단계에서 등록한 이메일 입력 → **로그인 링크 받기** → 메일 속 링크를 **같은 기기**에서 누르면 관리자 화면이 열려.
   관리자 페이지는 메뉴에 안 보이게 숨겨 놨어. 주소를 아는 사람만 들어갈 수 있고, 들어와도 등록된 이메일이 아니면 아무것도 못 해.

## 문제 넣는 법
처음에는 문제가 하나도 없어. 두 가지 방법으로 채워.
1. **관리자가 직접 추가**: `/admin` → "문제 직접 추가"에서 과목·대단원·세부 유형을 고르고 문제를 쓰면 바로 공개돼. 객관식과 단답형 모두 돼.
2. **학생 제안**: 학생이 "문제 제안"에 올리면, 관리자가 승인할 때 공개되고 제안한 학생은 +5점을 받아.

분류(대단원·세부 유형)는 `/admin` → "분류 관리"에서 더하거나 뺄 수 있어. 새 단원으로 문제를 추가하면 분류도 자동으로 생겨.

## 친구들 테스트 점검표
- [ ] 관리자 페이지에서 문제를 추가하면 문제 목록에 바로 보인다
- [ ] 회원가입 없이 바로 문제를 풀 수 있다
- [ ] 새로고침해도 점수와 기록이 남아 있다
- [ ] 난이도에 맞는 점수가 들어온다
- [ ] 같은 문제를 다시 제출해도 점수가 두 번 안 들어온다
- [ ] 휴대폰과 PC 모두 화면이 잘 보인다
- [ ] 관리자만 승인·초기화를 할 수 있다
- [ ] 카톡 미리보기에 claude.ai 대신 내 주소가 뜬다

## 고친 뒤 다시 올리는 법
코드를 바꾸면 VS Code **Source Control** → 메시지 쓰고 **Commit** → **Sync Changes**. Vercel이 알아서 1~2분 안에 새 버전으로 바꿔 줘.
문제는 코드를 바꿀 필요 없이 **관리자 페이지**에서 추가하면 바로 반영돼.

## 막히면
- 빨간 오류가 나면 **오류 문장을 그대로 복사**하거나 화면을 캡처해서 AI한테 보여 줘.
- "익명 로그인이 꺼져 있어" → 4단계 확인
- "Google 로그인이 켜져 있지 않아" → 4-1단계 확인. "Manual linking" 오류 → 4단계의 4번 확인
- "Supabase 연결 정보가 없어" → 5단계 `.env.local`(내 컴퓨터) 또는 7단계 환경 변수(Vercel) 확인. Vercel에서 환경 변수를 고친 뒤에는 **Deployments → 맨 위 ⋯ → Redeploy**를 눌러야 적용돼.
- 관리자 메일 링크를 눌렀는데 홈으로만 가면 → 8단계 Redirect URLs 확인

## 알아 둘 점
- **무료 한도**: Supabase 무료 플랜은 일주일 동안 아무도 안 쓰면 프로젝트가 일시 정지돼. 대시보드에서 **Restore**를 누르면 다시 켜지고 데이터는 그대로야. 시험 기간처럼 매일 쓰면 걱정 없어.
- **임시 계정**: Google로 로그인하기 전에는 브라우저 기록을 지우거나 다른 기기로 열면 새 계정이 돼. Google로 한 번 로그인해 두면 어느 기기에서든 Google로 들어오면 같은 기록이 나와.
- **개인정보**: 실명 대신 별명을 쓰도록 안내해 줘. 서비스 운영 과정에서 접속 기록(IP 등)이 남을 수 있어.
- **저작권**: 학교 기출, 문제집 문제를 그대로 올리면 안 돼. 직접 만들거나 바꾼 문제만 승인해 줘.
- **분류**는 서연중 3학년 2학기 시험 범위를 기준으로 미리 넣어 뒀어. 영어는 Lesson 5~8을 본문 독해·어휘·문법·의사소통 표현으로 나눴고, 국어 '문학의 샘'은 작품 대신 갈래(시·소설·수필·희곡)로 나눴어. 학교 진도에 맞게 관리자 페이지에서 고치면 돼.
- **서술형**은 자동 채점이 안 돼서 아직 없어.
