# 에이전트 작업 지침

> 목적: 이 저장소에서 AI 에이전트가 작업할 때 지켜야 할 규칙입니다. 다음 개발자가 에이전트에게 같은 기준으로 일을 맡길 수 있도록 작성했습니다.

## 1. 기본 원칙
- 근거 없는 수치를 쓰지 않습니다. 데이터가 없으면 "데이터 없음"이라고 적습니다.
- 사용자 행동을 기준으로 판단합니다. 기능 수를 늘리는 방향으로 해결책을 만들지 않습니다.
- 추측한 내용을 사실처럼 쓰지 않습니다. 확인하지 못한 항목은 확인 필요로 표시합니다.

## 2. 파일 구조
| 경로 | 용도 |
|---|---|
| `index.html`, `admin.html` | 화면 |
| `js/app.js` | 블로그 화면 로직과 GA 이벤트 전송 |
| `js/admin.js` | 관리자 화면 로직 |
| `js/config.js` | 회사명, Firebase 설정값 |
| `js/chatbot.js` | 질문 도우미 (블로그 글 검색, AI 답변 호출) |
| `js/weather.js` | 날씨 위젯 |
| `api/chat.js` | AI 상담 서버 함수 (Vercel). 공고 목록을 가져와 Claude API에 질문 |
| `api/jobs.js` | 채용 공고 목록 서버 함수 (고용24 공채속보, 키는 `settings/jobs` 또는 `JOBS_API_KEY`) |
| `api/education.js` | 교육 목록 서버 함수 (고용24 훈련과정 등, 키는 `settings/education`) |
| `api/analytics.js` | 관리자 분석 서버 함수 (GA4 Data API, Workload Identity 인증) |
| `vercel.json` | `/__/auth/` 경로를 Firebase 로그인 도메인으로 연결 |
| `tests/chatbot.test.mjs` | 질문 도우미 단위 테스트 |
| `firestore.rules` | 보안 규칙 (Firebase 콘솔에 따로 게시해야 적용됨) |
| `docs/PRD.md` | 기획서 (수업 양식 12개 항목) |
| `docs/drafts/PRD-v0.1-draft.md` | 초안 PRD (11/24 10:30) |
| `docs/design/` | 홈 시안 3종과 드롭다운 시안 (정적 목업) |
| `docs/DECISION_LOG.md` | 결정 로그 |
| `docs/SUCCESS_FAILURE_LOG.md` | 성공·실패 로그 |
| `docs/TEST_REPORT.md` | 테스트 결과 |
| `docs/WORKLOG.md` | 작업 기록 (11/25에 주소와 10장 갱신) |
| `docs/TROUBLESHOOTING.md` | 시행착오 기록과 캡처 (`docs/screenshots/2026-11-25/`) |

`js/seed.js`는 11/24에 삭제했습니다. 샘플 글을 다시 넣는 코드는 없습니다.

`dist/` 폴더는 배포에 쓰지 않는 오래된 복사본입니다 (11/24 09:16 상태). 스크립트 경로가 맞지 않아 HTML만 갱신하면 동작하지 않으므로 2026-11-25에는 갱신하지 않았습니다. 삭제 여부는 담당자가 결정합니다.

## 3. 이벤트 이름
- **이벤트 이름은 반드시 `js/app.js`의 실제 `track()` 호출을 기준으로 합니다.** README나 옛 문서의 이름을 믿지 않습니다.
- 현재 이름: `page_view`, `page_time`, `post_read`, `post_like`, `post_unlike`, `post_scrap`, `post_unscrap`, `post_comment`, `share`, `post_apply`, `post_apply_submit`, `inquiry_submit`, `chatbot_open`, `chatbot_question`, `chatbot_ai`, `chatbot_link_click`, `chatbot_source_click`, `chatbot_character_change`, `job_list_view`, `job_item_click`, `job_filter_change`, `job_search`, `edu_list_view`, `edu_item_click`, `edu_filter_change`
- 옛 이름: `post_complete`(11/18 이전 완독), `post_view`(11/18 이전 조회). 과거 데이터를 볼 때만 참고합니다.
- 관리자 브라우저에서는 이벤트를 보내지 않습니다(`isOwnerBrowser` 규칙). 테스트는 로그아웃 상태나 시크릿 창에서 합니다.

## 4. Git 규칙
- 깃허브 반영은 담당자(이은정)가 승인한 뒤에만 합니다. 승인 전에는 로컬에서만 고칩니다. "고쳐 줘"는 푸시 승인이 아닙니다. 푸시 전에 커밋 목록을 보여 주고 승인을 받습니다. (2026-11-25에 승인 없이 푸시한 기록이 있습니다. `docs/TROUBLESHOOTING.md` 8번)
- 구현, 기획, 기록 변경은 모두 커밋으로 남깁니다. 기획서만 고치고 기록 문서를 빼지 않습니다.
- 커밋 메시지는 한글로, 무엇을 바꿨는지 한 줄로 씁니다.
- 커밋 마지막에 `Co-Authored-By`와 `Claude-Session` 줄을 넣습니다.
- 원격에 새 커밋이 있으면 **강제 푸시(`--force`)를 하지 않습니다.** 먼저 가져와서 충돌을 확인하고, 원격 변경을 지우지 않는 방식으로 맞춥니다.
- 리베이스 중 충돌이 나면 `--ours`와 `--theirs`의 뜻을 확인한 뒤 고릅니다. (리베이스 중에는 `--ours`가 가져온 쪽입니다.)

## 5. 개인정보
- 공고 제목이나 개인 이름을 이벤트 파라미터로 보내지 않습니다. 순번이나 카테고리처럼 식별할 수 없는 값만 보냅니다.
- 사이트 안 지원 폼의 이름과 이메일은 Firestore `applications`에 저장됩니다. 문서에 접근 권한과 보관 기간을 함께 적습니다.
- 검사자나 외부 담당자의 실제 이메일 주소는 저장소, 문서, 커밋 메시지에 적지 않습니다. 언급이 필요하면 "[삭제된 메일]"로만 씁니다.

## 5-1. 키와 설정값
- API 키를 채팅이나 저장소 파일에 적지 않습니다.
- 고용24 채용 키는 관리자 화면에서 `settings/jobs`에, 교육 키는 `settings/education`에 저장합니다. 서비스마다 키가 다릅니다.
- AI 키(`ANTHROPIC_API_KEY`)와 공고 키(`JOBS_API_KEY`)는 Vercel 환경 변수에만 둡니다. 키가 없으면 `api/chat.js`는 503을 반환합니다.
- `firestore.rules`를 고치면 Firebase 콘솔 > Firestore > 규칙에서 **게시**해야 실제로 적용됩니다.

## 6. 실패했던 사례에서 얻은 규칙
- 대문자 표기도 함께 검색합니다 (`SY ELECTRONICS`, `SY Electronics`).
- 웹 페이지 내용을 확인할 때 도구의 캐시를 의심합니다. 실제 화면을 브라우저로 한 번 더 확인합니다.
- 문서를 고칠 때 원격 쪽 변경이 있는지 먼저 확인합니다.
- 공고와 교육 데이터는 고용24 오픈 API에서만 가져옵니다. 블로그에 가상 공고를 만들지 않습니다 (11/24 샘플 글 삭제).
- 질문 도우미(`js/chatbot.js`)는 블로그 글만 검색합니다. 블로그 글이 거의 없어 답이 약합니다.
- AI 상담(`api/chat.js`)은 고용24 공고 목록 안에서만 답합니다. 목록에 없는 내용은 "찾을 수 없습니다"로 답하도록 규칙을 두었습니다. 규칙을 바꾸면 PRD 6.3과 `docs/TEST_REPORT.md`를 함께 고칩니다.
- 채용 목록 드롭다운은 API의 `coClcdNm` 값으로 나눕니다. 제목 대괄호를 기준으로 쓰지 않습니다.
- 이미지는 챗지피티로 만든 것만 씁니다. 외부 사진이나 이미지 주소를 넣지 않습니다.
- 지표 기준선: 11/24 이전 수치는 가상 글 기준이므로 같은 기준으로 직접 비교하지 않습니다.
- 지원은 우리 사이트에서 받지 않습니다. 외부 지원 페이지 이동 클릭(`job_item_click`)만 측정합니다.

## 7. 2026-11-25 추가 규칙
- 공개 주소는 **https://sylvieee.vercel.app/** 하나입니다. 문서와 화면에 GitHub Pages 주소를 공개 주소로 적지 않습니다.
- 채용, 교육, AI 상담, 분석은 `api/` 서버 함수에서 처리합니다. 로컬 정적 서버에서는 동작하지 않을 수 있습니다.
- 요청하지 않은 변경을 하지 않습니다. 스타일이나 배치를 바꿀 때는 바꿀 범위를 먼저 말하고, 사용자 확인 뒤 커밋합니다.
- 모바일 동작은 아이폰 사파리에서 확인합니다. 데스크톱 확인으로 대신하지 않습니다.
- 로그인 도메인(`js/config.js`의 `authDomain`)과 `vercel.json`의 `/__/auth` 연결은 함께 바꿉니다. 한쪽만 바꾸면 로그인 복귀가 실패합니다.
- 캡처는 `docs/screenshots/날짜/` 폴더에 날짜별로 저장하고, 기록 문서에서 상대 경로로 연결합니다.
