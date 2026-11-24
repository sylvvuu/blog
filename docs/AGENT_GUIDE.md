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
| `js/config.js` | 회사명, 설정값 |
| `js/seed.js` | 샘플 글 |
| `firestore.rules` | 보안 규칙 |
| `docs/PRD.md` | 기획서 |
| `docs/DECISION_LOG.md` | 결정 로그 |
| `docs/SUCCESS_FAILURE_LOG.md` | 성공·실패 로그 |
| `docs/TEST_REPORT.md` | 테스트 결과 |
| `docs/WORKLOG.md` | 이전 작업 기록 (수정하지 않음) |

`dist/` 폴더는 배포에 쓰지 않는 오래된 복사본입니다. 수정하지 않습니다.

## 3. 이벤트 이름
- **이벤트 이름은 반드시 `js/app.js`의 실제 `track()` 호출을 기준으로 합니다.** README나 옛 문서의 이름을 믿지 않습니다.
- 현재 이름: `page_view`, `page_time`, `post_read`, `post_like`, `post_unlike`, `post_scrap`, `post_unscrap`, `post_comment`, `share`, `post_apply`, `post_apply_submit`, `inquiry_submit`, `chatbot_open`, `chatbot_question`, `chatbot_link_click`, `job_list_view`, `job_item_click`, `job_filter_change`, `edu_list_view`, `edu_item_click`
- 옛 이름: `post_complete`(11/18 이전 완독), `post_view`(11/18 이전 조회). 과거 데이터를 볼 때만 참고합니다.
- 관리자 브라우저에서는 이벤트를 보내지 않습니다(`isOwnerBrowser` 규칙). 테스트는 로그아웃 상태나 시크릿 창에서 합니다.

## 4. Git 규칙
- 커밋 메시지는 한글로, 무엇을 바꿨는지 한 줄로 씁니다.
- 커밋 마지막에 `Co-Authored-By`와 `Claude-Session` 줄을 넣습니다.
- 원격에 새 커밋이 있으면 **강제 푸시(`--force`)를 하지 않습니다.** 먼저 가져와서 충돌을 확인하고, 원격 변경을 지우지 않는 방식으로 맞춥니다.
- 리베이스 중 충돌이 나면 `--ours`와 `--theirs`의 뜻을 확인한 뒤 고릅니다. (리베이스 중에는 `--ours`가 가져온 쪽입니다.)

## 5. 개인정보
- 공고 제목이나 개인 이름을 이벤트 파라미터로 보내지 않습니다. 순번이나 카테고리처럼 식별할 수 없는 값만 보냅니다.
- 사이트 안 지원 폼의 이름과 이메일은 Firestore `applications`에 저장됩니다. 문서에 접근 권한과 보관 기간을 함께 적습니다.

## 6. 실패했던 사례에서 얻은 규칙
- 대문자 표기도 함께 검색합니다 (`SY ELECTRONICS`, `SY Electronics`).
- 웹 페이지 내용을 확인할 때 도구의 캐시를 의심합니다. 실제 화면을 브라우저로 한 번 더 확인합니다.
- 문서를 고칠 때 원격 쪽 변경이 있는지 먼저 확인합니다.
