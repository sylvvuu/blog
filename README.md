# SV Career

채용 공고와 교육 과정을 고용24 공공 API에서 가져와 보여 주는 구직 안내 사이트입니다. HTML과 JavaScript로 만들었고, 설정과 글 데이터는 Firebase Firestore에 저장합니다. 채용·교육 목록, AI 멘토의 AI 답변, 관리자 분석은 Vercel 서버 함수(`api/`)에서 처리합니다.

**공개 주소: https://sylvieee.vercel.app/** (단일 주소, 2026-11-25 결정)

- 기획서: `docs/PRD.md` (문제 정의, 해결 방안, 기능, 디자인, 일정, 개선 필요 사항)
- 결정 기록: `docs/DECISION_LOG.md`
- 성공과 실패 기록: `docs/SUCCESS_FAILURE_LOG.md`
- 시행착오 기록(캡처 포함): `docs/TROUBLESHOOTING.md`
- 작업 기록: `docs/WORKLOG.md`
- 에이전트 작업 지침: `docs/AGENT_GUIDE.md`
- 테스트 결과: `docs/TEST_REPORT.md`
- 회고: `docs/RETROSPECTIVE.md`

## 로컬에서 작업하기 (Antigravity IDE)

빌드 도구가 없는 정적 사이트라 설치할 패키지가 없습니다. 저장소를 받아 폴더로 열면 됩니다.

1. 저장소 받기: `git clone https://github.com/sylvvuu/blog.git` 후 Antigravity에서 **File > Open Folder**로 `blog` 폴더를 엽니다.
2. 화면 확인: 폴더에서 `python3 -m http.server 8000`을 실행하고 `http://localhost:8000`에 접속합니다. 다만 채용·교육·AI·분석은 `api/` 서버 함수를 호출하므로 로컬에서는 동작하지 않을 수 있습니다. 이 기능은 Vercel 주소에서 확인합니다.
3. 테스트: Node.js 18 이상에서 `node --test tests/chatbot.test.mjs`를 실행합니다.
4. 서버 함수(`api/`): 로컬에서 실행하지 않습니다. `main` 브랜치에 푸시하면 Vercel이 배포하고, 키는 Vercel 환경 변수에서 읽습니다.
5. 반영: 수정 후 담당자 승인을 받고 `git add`, `git commit`, `git push origin main`을 실행합니다. Vercel이 자동으로 배포합니다.

- 키는 저장소에 넣지 않습니다. Firebase 웹 설정(`js/config.js`)은 공개 값이고, AI 키와 고용24 키는 Vercel 환경 변수나 관리자 페이지 설정에만 둡니다.
- 에이전트에게 작업을 맡길 때는 `docs/AGENT_GUIDE.md`를 먼저 읽게 합니다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 홈 (AI 멘토, 채용 공고 목록과 드롭다운, 교육 패널, 문의) |
| `admin.html` | 관리자 페이지 (Google 로그인, 글 수정·삭제, 날씨·채용·교육 키 설정, 분석) |
| `js/config.js` | Firebase 설정값, 관리자 이메일, 회사명. Vercel 주소에서는 로그인 도메인을 `sylvieee.vercel.app`으로 씀 |
| `js/app.js` | 홈 화면 로직, 채용·교육 API 호출, GA4 이벤트 전송, 모바일 메뉴 |
| `js/chatbot.js` | AI 멘토 UI (블로그 글 검색, AI 답변 호출) |
| `js/weather.js` | 날씨 위젯 |
| `js/admin.js` | 관리자 화면 로직 |
| `api/jobs.js` | 채용 공고 목록 서버 함수 (고용24 공채속보 210L21) |
| `api/education.js` | 교육 목록 서버 함수 (고용24 훈련과정 310L01, 취업역량 217L01 등) |
| `api/chat.js` | AI 상담 서버 함수 (공고 목록을 근거로 Claude API 호출) |
| `api/analytics.js` | 관리자 분석 서버 함수 (GA4 Data API, Vercel OIDC와 Workload Identity로 인증) |
| `vercel.json` | `/__/auth/` 경로를 Firebase 로그인 도메인으로 연결 (아이폰 로그인 복귀 문제 대응) |
| `tests/chatbot.test.mjs` | AI 멘토 단위 테스트 (`node --test tests/chatbot.test.mjs`) |
| `firestore.rules` | 설정 문서는 누구나 읽기, 쓰기는 관리자만. 글은 공개 글만 읽기 |
| `docs/` | 기획서, 결정 로그, 성공과 실패 로그, 시행착오, 에이전트 지침, 테스트 결과, 회고, 시안 |

## 1. Firebase 설정

1. Firebase 콘솔에서 프로젝트 `sylvi-electronic`을 엽니다. 프로젝트 표시 이름은 `SV Career`, 웹 앱 닉네임은 `sv-career-web`입니다. 프로젝트 ID는 바꿀 수 없으므로 그대로 둡니다.
2. **Firestore Database**를 만들고 위치를 `asia-northeast3 (서울)`로 선택합니다.
3. **Authentication > 시작하기 > Google**을 사용 설정하고 지원 이메일을 `fkdna3@gmail.com`으로 지정합니다.
4. **프로젝트 설정 > 일반 > 내 앱 > 웹 앱 추가**를 하고 표시되는 `firebaseConfig` 값을 `js/config.js`에 붙여넣습니다.
5. **Firestore > 규칙** 탭에 `firestore.rules` 내용을 붙여넣고 **게시**합니다. 파일을 고친 뒤에도 콘솔에서 다시 게시해야 적용됩니다.
6. **Authentication > 설정 > 승인된 도메인**에 `sylvieee.vercel.app`이 있어야 합니다. 철자를 배포 주소와 한 글자씩 맞춰 확인합니다. (`sylvielectronics.vercel.app`은 다른 주소입니다.)
7. 로그인 방식: Vercel 주소에서는 로그인 도메인을 `sylvieee.vercel.app`으로 쓰고, `vercel.json`이 `/__/auth/` 경로를 Firebase로 연결합니다. 모바일은 팝업 대신 같은 탭 이동(리디렉트) 방식으로 로그인합니다.

## 2. Google Analytics와 Clarity

- `index.html`과 `admin.html`에 GA4 측정 ID(`G-BC6KK97MHL`)가 들어 있습니다. 새 속성을 쓸 때만 바꿉니다.
- 관리자 분석 화면은 `api/analytics.js`가 GA4 Data API를 호출해 방문자와 공고 클릭을 보여 줍니다. 키 파일은 없고, Vercel OIDC 토큰과 GCP Workload Identity Federation으로 인증합니다.
- Vercel 환경 변수: `GA_PROPERTY_ID`, `GCP_PROJECT_NUMBER`, `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER_ID`, `GCP_SERVICE_ACCOUNT_EMAIL`, `FIREBASE_API_KEY`. 값이 없으면 분석 카드는 연결 전 상태로 표시합니다.
- Microsoft Clarity 설치 코드는 `index.html`에만 있습니다(프로젝트 `zihm71wl5g`). 공개 페이지에서만 쓰고, 개인정보 처리방침에 설치 사실을 적는 것을 확인합니다.

## 3. 외부 API 키 설정

고용24 서비스마다 인증키가 따로 발급되므로 칸을 나눠 두었습니다.

| 기능 | 키 저장 위치 | 읽는 곳 | 화면 반영 |
| --- | --- | --- | --- |
| 공채속보 (고용24 210L21) | 관리자 > 채용 키 (`settings/jobs`) 또는 Vercel `JOBS_API_KEY` | `api/jobs.js` | 홈 채용 목록, 드롭다운으로 기업 구분 필터 |
| 국민내일배움카드 훈련과정 (고용24 310L01 외) | 관리자 > 교육 키 (`settings/education`) | `api/education.js` | 홈 교육 패널. 키가 없거나 응답이 없으면 패널 숨김 |
| 서울 실시간 날씨 (기상청) | 관리자 > 날씨 키 (`settings/weather`) | 브라우저 (`js/weather.js`) | 헤더 날씨 위젯 (모바일에서는 숨김) |

> 주의: 현재 채용·교육 키는 Firestore 설정 문서에 있고, 보안 규칙상 누구나 읽을 수 있습니다. 서버 함수에서만 읽도록 옮기는 것이 다음 단계입니다 (PRD 7장).

### AI 상담 키 (Vercel 환경 변수)

`api/chat.js`는 아래 값을 Vercel 프로젝트의 환경 변수에서 읽습니다. 채팅이나 파일에 키를 적지 않습니다.

| 환경 변수 | 용도 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 호출 (모델 `claude-haiku-5-5`) |
| `JOBS_API_KEY` | 고용24 공채속보 목록 조회 (관리자 채용 키와 같은 값) |

`ANTHROPIC_API_KEY`가 없으면 `/api/chat`은 503을 반환하고, AI 멘토는 기존 글 검색으로 답합니다. 관리자 화면의 "AI 답변 사용" 체크는 별도로 켜져 있어야 합니다.

## 4. 관리자 사용법

1. `admin.html`에서 `fkdna3@gmail.com` 계정으로 로그인합니다.
2. **고용24 채용 정보 API 키**와 **교육 정보 API 키** 칸에 각각 키를 넣고 저장합니다.
3. 글은 **+ 새 글 작성**으로 일반 글만 씁니다. 교육과 채용 목록은 API에서 자동으로 나옵니다.
4. 관리자 브라우저에서 한 방문은 분석에서 빼기 위해 이벤트를 보내지 않습니다.

## 5. 배포

- 공개 주소는 **https://sylvieee.vercel.app/** 하나입니다.
- GitHub Pages(`sylvvuu.github.io/blog/`)는 2026-11-25부터 공개 주소로 쓰지 않습니다. 서버 함수가 동작하지 않아 채용·교육·AI 기능이 빠지기 때문입니다. 옛 주소의 방문 기록은 GA에 남아 있으므로 호스트 이름으로 나눠 봅니다.
- `sylvielectronics.vercel.app`은 위 주소로 307 리다이렉트됩니다.
- `main` 브랜치에 push하면 Vercel이 배포합니다. 배포 후 아이폰 사파리에서 주소를 열고 채용·교육·로그인을 확인합니다.

## 6. GitHub 업데이트

커밋과 푸시는 담당자 승인 후에 합니다. 커밋 메시지는 한글로 쓰고, `Co-Authored-By`와 `Claude-Session` 줄을 함께 넣습니다. 강제 푸시(`--force`)는 하지 않습니다.

```bash
git add <바꾼 파일>
git commit -m "변경 내용 한 줄"
git pull --rebase origin main
git push origin main
```

## 7. 이미지와 콘텐츠

- 사이트의 이미지와 일러스트는 모두 챗지피티로 만든 것입니다. 외부 사진이나 이미지 주소는 쓰지 않습니다.
- 글마다 **공개** 또는 **나만보기**를 고를 수 있습니다. 나만보기 글은 관리자만 볼 수 있습니다.
- GA4 이벤트 목록 (실제 코드 기준, `js/app.js`와 `js/chatbot.js`의 `track()` 호출)
  - 화면: `page_view`, `page_time`
  - 글: `post_read`(완독), `post_like`, `post_unlike`, `post_scrap`, `post_unscrap`, `post_comment`, `share`
  - 지원: `post_apply`, `post_apply_submit`
  - 문의: `inquiry_submit`
  - 채용: `job_list_view`, `job_item_click`, `job_filter_change`, `job_search`
  - 교육: `edu_list_view`, `edu_item_click`, `edu_filter_change`
  - AI 멘토: `chatbot_open`, `chatbot_question`(찾은 글 수만), `chatbot_ai`, `chatbot_link_click`, `chatbot_source_click`, `chatbot_character_change`
- 11/18 이전에는 완독 이벤트 이름이 `post_complete`였고, 글 조회 이벤트 `post_view`도 있었습니다. 이전 데이터를 볼 때 이 이름 변경을 고려합니다.
- 11/24 이전 샘플 글 기간의 수치는 가상 데이터 기준이라 기준선으로 쓰지 않습니다.
