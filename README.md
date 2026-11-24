# SV Career

채용 공고와 교육 과정을 고용24 공공 API에서 가져와 보여 주는 구직 안내 사이트입니다. HTML과 JavaScript로 만들었고, 설정과 글 데이터는 Firebase Firestore에 저장합니다. 질문에 답하는 상담 기능은 Vercel 서버 함수에서 Claude API를 호출합니다.

- 기획서: `docs/PRD.md` (문제 정의, 해결 방안, 기능, 디자인, 일정, 개선 필요 사항)
- 결정 기록: `docs/DECISION_LOG.md`
- 성공과 실패 기록: `docs/SUCCESS_FAILURE_LOG.md`
- 에이전트 작업 지침: `docs/AGENT_GUIDE.md`
- 테스트 결과: `docs/TEST_REPORT.md`

## 로컬에서 작업하기 (Antigravity IDE)

빌드 도구가 없는 정적 사이트라 설치할 패키지가 없습니다. 저장소를 받아 폴더로 열면 됩니다.

1. 저장소 받기: `git clone https://github.com/sylvvuu/blog.git` 후 Antigravity에서 **File > Open Folder**로 `blog` 폴더를 엽니다.
2. 화면 확인: `index.html`을 브라우저로 열거나, 폴더에서 `python3 -m http.server 8000`을 실행하고 `http://localhost:8000`에 접속합니다. Firebase와 외부 API를 쓰므로 인터넷 연결이 필요합니다.
3. 테스트: Node.js 18 이상에서 `node --test tests/chatbot.test.mjs`를 실행합니다.
4. 서버 함수(`api/chat.js`): 로컬에서 실행하지 않습니다. `main` 브랜치에 푸시하면 Vercel이 배포하고, 키는 Vercel 환경 변수에서 읽습니다.
5. 반영: 수정 후 `git add`, `git commit`, `git push origin main`을 실행하면 GitHub Pages와 Vercel이 함께 배포합니다. 푸시 전에 홈 화면을 로컬에서 확인합니다.

- 키는 저장소에 넣지 않습니다. Firebase 웹 설정(`js/config.js`)은 공개 값이고, AI 키와 고용24 키는 Vercel 환경 변수나 관리자 페이지에만 둡니다.
- 에이전트에게 작업을 맡길 때는 `docs/AGENT_GUIDE.md`를 먼저 읽게 합니다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 홈 (질문 도우미, 채용 공고 목록과 드롭다운, 교육 패널, 문의) |
| `admin.html` | 관리자 페이지 (Google 로그인, 글 작성, 날씨·채용·교육 키 설정) |
| `js/config.js` | Firebase 설정값, 관리자 이메일, 회사명 |
| `js/app.js` | 홈 화면 로직, 채용과 교육 API 호출, GA4 이벤트 전송 |
| `js/chatbot.js` | 질문 도우미 (블로그 글 검색, 외부 키 없음) |
| `js/weather.js` | 날씨 위젯 |
| `js/admin.js` | 관리자 화면 로직 |
| `api/chat.js` | AI 상담 서버 함수 (고용24 공고 목록을 근거로 Claude API 호출) |
| `tests/chatbot.test.mjs` | 질문 도우미 단위 테스트 (`node --test tests/chatbot.test.mjs`) |
| `firestore.rules` | 설정 문서는 누구나 읽기, 쓰기는 관리자만. 글은 공개 글만 읽기 |
| `docs/` | 기획서, 결정 로그, 성공과 실패 로그, 에이전트 지침, 테스트 결과, 시안 |

## 1. Firebase 설정

1. Firebase 콘솔에서 프로젝트 `sylvi-electronic`을 엽니다. 프로젝트 표시 이름은 `SV Career`, 웹 앱 닉네임은 `sv-career-web`입니다. 프로젝트 ID는 바꿀 수 없으므로 그대로 둡니다.
2. **Firestore Database**를 만들고 위치를 `asia-northeast3 (서울)`로 선택합니다.
3. **Authentication > 시작하기 > Google**을 사용 설정하고 지원 이메일을 `fkdna3@gmail.com`으로 지정합니다.
4. **프로젝트 설정 > 일반 > 내 앱 > 웹 앱 추가**를 하고 표시되는 `firebaseConfig` 값을 `js/config.js`에 붙여넣습니다.
5. **Firestore > 규칙** 탭에 `firestore.rules` 내용을 붙여넣고 **게시**합니다. 파일을 고친 뒤에도 콘솔에서 다시 게시해야 적용됩니다.
6. **Authentication > 설정 > 승인된 도메인**에 `sylvieee.vercel.app`과 `sylvvuu.github.io`를 추가합니다.

## 2. Google Analytics와 Clarity

- `index.html`과 `admin.html`에 GA4 측정 ID(`G-BC6KK97MHL`)가 들어 있습니다. 새 속성을 쓸 때만 바꿉니다.
- Microsoft Clarity 설치 코드는 `index.html`에만 있습니다(프로젝트 `zihm71wl5g`). 공개 페이지에서만 쓰고, 개인정보 처리방침에 설치 사실을 적는 것을 확인합니다.

## 3. 외부 API 키 설정 (관리자 페이지)

고용24 서비스마다 인증키가 따로 발급되므로 칸을 나눠 두었습니다. 관리자 페이지에 키를 저장하면 홈에 반영됩니다.

| 기능 | 저장 위치 (Firestore) | 화면 반영 |
| --- | --- | --- |
| 공채속보 (고용24 210L21) | `settings/jobs` | 홈 채용 목록 최신 20건 중 5건 표시, 드롭다운으로 기업 구분 필터 |
| 국민내일배움카드 훈련과정 (고용24 310L01) | `settings/education` | 홈 교육 패널, 석 달 안에 시작하는 과정 5건. 키가 없거나 응답이 없으면 패널 숨김 |
| 서울 실시간 날씨 (기상청) | `settings/weather` | 헤더 아래 날씨 위젯 |

> 주의: 키는 Firestore 설정 문서에 저장되고, 현재 보안 규칙상 누구나 읽을 수 있습니다. 서버 함수로 옮기는 것이 다음 단계입니다 (PRD 7장).

### AI 상담 키 (Vercel 환경 변수)

`api/chat.js`는 아래 두 값을 Vercel 프로젝트의 환경 변수에서 읽습니다. 채팅이나 파일에 키를 적지 않습니다.

| 환경 변수 | 용도 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 호출 (모델 `claude-haiku-5-5`) |
| `JOBS_API_KEY` | 고용24 공채속보 목록 조회 (`settings/jobs`와 같은 키) |

두 값이 없으면 `/api/chat`은 503을 반환합니다.

## 4. 로컬 확인

```bash
npx serve .
```

브라우저에서 `http://localhost:3000`과 `http://localhost:3000/admin.html`을 엽니다. 로컬 주소를 승인된 도메인에 추가해야 관리자 로그인이 됩니다. `/api/chat`은 Vercel 환경에서만 동작합니다.

## 5. 관리자 사용법

1. `admin.html`에서 `fkdna3@gmail.com` 계정으로 로그인합니다.
2. **고용24 채용 정보 API 키**와 **교육 정보 API 키** 칸에 각각 키를 넣고 저장합니다.
3. 글은 **+ 새 글 작성**으로 일반 글만 씁니다. 교육과 채용 분류 칸은 없습니다. 채용과 교육 목록은 API에서 자동으로 나옵니다.

## 6. 배포

- 공개 배포 주소 2곳 (같은 main 코드):
  - Vercel: `https://sylvieee.vercel.app/`
  - GitHub Pages: `https://sylvvuu.github.io/blog/`
- `sylvielectronics.vercel.app`은 위 주소로 307 리다이렉트됩니다.
- 두 주소 모두 `main` 브랜치 push 후 반영됩니다. 같은 측정 ID를 쓰므로 GA에서 호스트 이름으로 나눠 봅니다.

## 7. GitHub 업데이트

커밋은 담당자 승인 후에 합니다. 커밋 메시지는 한글로 쓰고, `Co-Authored-By`와 `Claude-Session` 줄을 함께 넣습니다. 강제 푸시(`--force`)는 하지 않습니다.

```bash
git add <바꾼 파일>
git commit -m "변경 내용 한 줄"
git pull --rebase origin main
git push origin main
```

## 8. 이미지와 콘텐츠

- 사이트의 이미지와 일러스트는 모두 챗지피티로 만든 것입니다. 외부 사진이나 이미지 주소는 쓰지 않습니다.
- 글마다 **공개** 또는 **나만보기**를 고를 수 있습니다. 나만보기 글은 관리자만 볼 수 있습니다.
- GA4 이벤트 목록 (실제 코드 기준, `js/app.js`의 `track()` 호출)
  - 화면: `page_view`, `page_time`
  - 글: `post_read`(완독), `post_like`, `post_unlike`, `post_scrap`, `post_unscrap`, `post_comment`, `share`
  - 지원: `post_apply`, `post_apply_submit`
  - 문의: `inquiry_submit`
  - 채용: `job_list_view`, `job_item_click`, `job_filter_change`
  - 교육: `edu_list_view`, `edu_item_click`
  - 질문 도우미: `chatbot_open`, `chatbot_question`(찾은 글 수만), `chatbot_link_click`, `chatbot_character_change`
- 11/18 이전에는 완독 이벤트 이름이 `post_complete`였고, 글 조회 이벤트 `post_view`도 있었습니다. 이전 데이터를 볼 때 이 이름 변경을 고려합니다.
- 11/24 이전 샘플 글 기간의 수치는 가상 데이터 기준이라 기준선으로 쓰지 않습니다.
