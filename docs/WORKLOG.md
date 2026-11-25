# 작업 기록 (2026-11-25 갱신)

SV Career 인사팀 블로그(https://sylvieee.vercel.app/)의 작업 내역과 현재 상태를 정리합니다. 2026-11-25부터 공개 주소는 Vercel 하나입니다. 1~9장은 11/18~11/24 기록이고, 주소 표와 10장 이후가 최신입니다.

## 0. 주소 모음

| 구분 | 주소 |
|---|---|
| 블로그 홈 | https://sylvieee.vercel.app/ |
| 교육 목록 | https://sylvieee.vercel.app/#/education |
| 채용 공고 목록 | https://sylvieee.vercel.app/#/recruit |
| 문의하기 | https://sylvieee.vercel.app/#/inquiry |
| 관리자 페이지 | https://sylvieee.vercel.app/admin.html |
| GitHub 저장소 | https://github.com/sylvvuu/blog (main 브랜치 푸시 시 자동 배포) |
| Firebase 콘솔 (프로젝트) | https://console.firebase.google.com/project/sylvi-electronic |
| Firestore 규칙 편집 | https://console.firebase.google.com/project/sylvi-electronic/firestore/databases/-default-/security/rules |
| GA4 측정 ID | G-BC6KK97MHL (관리자 브라우저는 측정 제외) |
| 고용24 OPEN-API 신청 | https://www.work24.go.kr (상단 OPEN-API → 서비스 소개 및 신청, 신청현황) |

**관리자 로그인:** fkdna3@gmail.com 계정으로 Google 로그인하고 이메일 인증이 완료되어 있어야 합니다. 로그인한 브라우저는 조회수 측정에서 제외됩니다.

## 0-1. 관리자 화면 변경 내역

관리자 페이지(`admin.html`, `js/admin.js`)는 왼쪽 패널과 오른쪽 글 편집 영역으로 나뉩니다.

| 영역 | 상태 | 내용 | 커밋 |
|---|---|---|---|
| 글 목록 / 새 글 작성 | 기존 | 글 등록, 수정, 삭제, 공개 설정, 본문 이미지 붙여넣기 | 이전 커밋 |
| 날씨 설정 | 기존 | 기상청 단기예보 인증키 입력·저장 (`settings/weather`). 저장된 키의 끝 4자리 표시 | 8aa873d 이후 |
| 채용정보 설정 | 변경 | 고용24 Open-API 인증키 입력·저장 (`settings/jobs`). 현재 공채속보 API에 사용. 제목은 아직 "공공취업정보 설정" | 5aaea04 → 9fb0a4a → 2e6f4fc |
| 명언 관리 | **삭제** | 관리자 명언 등록·삭제 UI 제거. 홈 명언은 외부 API 표시 (기존 `quotes` 데이터는 DB에 남아 있음) | d88956d |
| 조회수 (신규) | 추가 | 누적·오늘·기간 조회수 KPI, 7일/30일 막대 차트(Chart.js), 글별 누적 TOP 5 | 9fb0a4a |

**조회수 화면 동작:** 글 열람 때 `posts.views`와 `posts/{id}/daily/{날짜}`가 올라갑니다. 데이터를 보려면 Firestore 규칙이 게시되어 있어야 합니다.

## 1. 현재 상태 요약

| 항목 | 상태 |
|---|---|
| 홈 하단 채용 목록 | 공채속보 API로 전환 완료 (커밋 2e6f4fc). 브라우저 캐시 때문에 강력 새로고침 필요 |
| 관리자 조회수 화면 | 코드 배포 완료 (커밋 9fb0a4a). 집계를 위한 Firestore 규칙 게시 **미확인** |
| 명언 관리 (관리자) | 삭제 완료 (커밋 d88956d). 홈 명언은 외부 API 표시 |
| 푸터 이메일 | 배포 완료 (커밋 2e6f4fc) |
| 날씨 위젯 | 기상청 단기예보 API 사용 중. 관리자에서 키 저장 |
| 고용24 채용정보 목록 API | 민간(기업회원) 신청 필요. 개인 회원은 사용 불가 |

## 2. 배포 이력 (main, 최근 순)

- 2e6f4fc 홈 채용 목록을 고용24 공채속보 API로 변경, 푸터에 이메일 추가
- d88956d 긴급 수정: `safeUrl` 중복 선언 해결, 관리자 명언 관리 화면 제거
- 9fb0a4a 채용정보 API를 고용24로 변경하고 관리자 조회수 화면 추가
- 87688a9 ~ 8c25d30 공공취업정보(인사혁신처) 목록 구현과 정렬 수정
- 5aaea04 관리자 화면에 공공취업정보 인증키 입력 칸 추가 (settings/jobs)
- e155cb7 명언: 외부 명언 API 연결 (실패 시 관리자 등록 명언 사용)
- 1201fa4 명언 기능 최초 구현 (관리자 등록·삭제)
- f98cc5b 명언 카드를 왼쪽 아래 고정
- 673a372 · d766605 · 8b2a85a · 8aa873d 날씨 위젯 추가와 배치 조정, 기상청 SKY 아이콘
- 538f881 ~ a62175c 글쓰기 이미지 붙여넣기, 썸네일, 지원하기 버튼 등 이전 기능

## 3. 주요 결정 사항

- **조회수 측정 (Phase A):** 완독 판정(활성 체류 ≥ max(글자수÷500×60초, 10초) + 본문 끝 표식), 60초 주기 page_time, share 이벤트 구분, 관리자 브라우저 GA 제외.
- **조회수 집계 (관리자 화면용):** 글을 열면 `posts.views`와 `posts/{id}/daily/{날짜}`를 1 증가. 같은 탭 세션에서 한 번만 집계. 관리자 브라우저는 제외.
- **날씨:** 처음에는 OpenWeather를 썼지만, 사용자 요청으로 기상청 단기예보 API로 변경.
- **채용 목록 API 변경 이력:**
  1. 인사혁신처 PblJobService (공공취업정보): 오래된 데이터가 먼저 와서 최신 판별이 어려웠음.
  2. 고용24 채용정보 목록 API (callOpenApiSvcInfo210L01): 개인 회원은 사용 불가 응답. 민간(기업회원) 신청이 필요한데 개인 계정으로는 신청 불가.
  3. **고용24 공채속보 API (callOpenApiSvcInfo210L21): 현재 사용 중.** 개인 회원도 이용 가능.

## 4. 관리자 페이지 설정 (settings 문서)

| 문서 | 필드 | 용도 | 읽기 |
|---|---|---|---|
| settings/weather | kmaServiceKey | 기상청 단기예보 인증키 | 누구나 (규칙상 공개) |
| settings/jobs | serviceKey | 고용24 Open-API 인증키 (공채속보) | 누구나 (규칙상 공개) |
| quotes/{id} | text, author | 관리자 명언 (관리자 화면 삭제됨, 기존 데이터는 남아 있음) | 누구나 |

**보안 참고:** 위 키들은 Firestore 규칙상 누구나 읽을 수 있습니다. 키를 숨기려면 GitHub Actions 등으로 서버 측에서 API를 호출하고 결과 JSON만 저장소에 두는 방식을 검토하세요.

## 5. Firestore 규칙 (firestore.rules)

- 조회수 집계를 위해 `posts`의 update에 `views` 허용 (비로그인 방문자도 `views`만 증가 가능).
- `posts/{id}/daily/{day}` 하위 컬렉션 추가 (누구나 읽기, 생성·수정은 count와 date 형식만 허용).
- 명언 규칙(`quotes`)은 남겨 두었습니다. 관리자 화면은 삭제되었지만 규칙은 그대로입니다.
- **게시 상태:** 2026-11-18 오후 5시 기준 콘솔 기록에서 새 버전이 확인되지 않았습니다. 파일 내용을 콘솔에 붙여넣고 게시해야 합니다.

## 6. 미완료 및 확인 필요

- [ ] Firebase 콘솔에서 `firestore.rules` 게시 확인 (조회수 집계 동작에 필요)
- [ ] 홈 채용 목록(공채속보)이 보이는지 강력 새로고침 후 확인
- [ ] 고용24 OPEN-API 신청: 공채속보는 개인 회원도 가능. 현재 키가 공채속보에 연결되어 있는지 확인됨 (응답 정상)
- [ ] 워크넷 채용정보 목록/상세 API가 필요하면 기업회원 계정으로 민간 신청
- [ ] 기상청·공공데이터 키 재발급 권장 (예전 키가 공개 설정에 노출된 이력이 있음)
- [ ] 관리자 화면 제목과 안내 문구에 남은 "공공취업정보" 표기를 "채용정보"로 정리
- [ ] 관리자 조회수 화면을 관리자 로그인 상태에서 직접 확인
- [ ] 명언 API 이용 조건 확인, 작은 화면에서 명언 카드가 본문을 가리는지 확인

## 7. 주요 파일

- `js/app.js`: 화면 렌더링, 채용 목록(loadPublicJobs), 날씨, 명언, 조회수 집계(countView), 측정 이벤트
- `js/admin.js`: 관리자 글 관리, 날씨·채용 키 저장, 조회수 차트(loadViews)
- `js/weather.js`: 기상청 날씨 위젯
- `admin.html`: 관리자 페이지 (조회수 섹션 포함)
- `index.html`: 블로그 홈 (푸터 이메일 포함)
- `firestore.rules`: 보안 규칙
- `styles.css`: 공통 스타일 (조회수 스타일 포함)

## 8. 알려진 문제

- **브라우저 캐시 (옛 주소):** GitHub Pages 주소는 2026-11-25부터 공개 주소로 쓰지 않습니다. 과거에 캐시 문제가 있었다는 기록으로만 남깁니다.
- **채용 목록 숨김:** API 오류가 나면 목록을 조용히 숨깁니다. 원인을 화면에서 보려면 오류 문구를 표시하도록 바꿀 수 있습니다.
- **dist/ 폴더:** `dist/index.html`, `dist/admin.html`은 예전 사본이라 배포 대상이 아닙니다. 사용하지 않습니다.

## 9. 2026-11-24 진행 상황 (GA4·관리자 데이터 연결)

- 완료: GCP Workload Identity Pool `vercel`과 OIDC Provider `vercel` 생성 (issuer `https://oidc.vercel.com/sylvia-7050`, 허용 audience `https://vercel.com/sylvia-7050`, 조건은 production 토큰의 sub로 제한)
- 완료: 서비스 계정 `ga-reader`에 WIF 주체 부여(Workload Identity User), GA4 속성 `564927790`에 `ga-reader` Viewer 추가
- 완료: Vercel Production 환경변수 6개 저장 (`GA_PROPERTY_ID`, `GCP_PROJECT_NUMBER`, `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER_ID`, `GCP_SERVICE_ACCOUNT_EMAIL`, `FIREBASE_API_KEY`). 키 파일은 만들지 않음
- 완료: Production 재배포 (`dpl_FpgM7jpBPDR5AsqA2YomkDprCFXE`) READY 상태 확인
- 미확인: 관리자 화면에서 방문자·공고 클릭 카드에 실제 숫자가 나오는지. 다음 확인 항목
- 미해결: 챗봇에서 "청년정책 연결해줘"를 물으면 "관련 글을 찾지 못했습니다"라고 답함. 청년정책 훑어보기 페이지 연결과 키워드 인식 수정 필요
- 미완: 측정 ID(G-) 일치 확인, 홈 하단 목록 Vercel 환경변수 이전, AI 10문항 평가(TEST_REPORT 4-1)

## 10. 2026-11-25 작업 기록 (Vercel 단일 주소로 정리)

- 결정: 공개 주소는 `https://sylvieee.vercel.app/` 하나. GitHub Pages는 서버 함수가 없어 채용·교육·AI가 빠지므로 공개 주소에서 제외 (`docs/DECISION_LOG.md`).
- 커밋 기록 (main):
  - `3371b9d` 모바일 로그인 리디렉트, AI 멘토 인라인 배치(이후 되돌림), 모바일 헤더 드롭다운 메뉴
  - `3c41989` 모바일 헤더: 메뉴 항목 들여쓰기 통일, 날씨 숨김
  - `06e0ce3` 로그인 도메인을 Vercel 주소로 바꾸고 `/__/auth`를 Firebase로 연결 (`vercel.json`)
  - `36960eb` AI 멘토 인라인 배치 되돌림 (요청하지 않은 수정)
- 확인 결과
  - 데스크톱 `sylvieee.vercel.app` 로그인: 정상 (사용자 확인)
  - 아이폰 로그인: 06e0ce3 배포 후 재확인 필요
  - Firebase 승인 도메인에 `sylvieee.vercel.app` 추가: 완료 (사용자 확인)
  - 아이폰 Vercel 주소 채용 20건, 교육 25건: 확인됨 (2045732, fe59822 배포 시점)
  - 아이폰 AI 멘토 AI 답변: 미확인
- 시행착오 전체는 `docs/TROUBLESHOOTING.md`, 캡처는 `docs/screenshots/2026-11-25/`.
- 남은 항목
  - [ ] 아이폰에서 로그인 → 앱 복귀 → 로그아웃 표시 확인
  - [ ] 아이폰에서 AI 멘토가 스크롤을 따라오고 숨김이 되는지 확인
  - [ ] Vercel 환경 변수 `ANTHROPIC_API_KEY` 확인과 `/api/chat` 응답 확인
  - [ ] 채용 키와 교육 키를 서버 함수에서만 읽도록 옮기기 (PRD 7장)
  - [ ] 개인정보 처리방침 페이지 작성 (`docs/RETROSPECTIVE.md` 8장)
  - [ ] 상담 평가 10문항 실시 (`docs/TEST_REPORT.md` 4-1)

## 11. 2026-11-25 모바일 헤더 날씨 사진 타일

- 결정: 헤더 날씨는 SV Career와 로그인 사이 사진 타일 (온도 18px, 도시명과 날씨 상태 10px). 760px 이하에서만 표시. 시안 자료는 `docs/design/weather-header-tile.html`.
- 구현
  - `assets/weather/`에 날씨 사진 여섯 장 추가 (맑음, 구름많음, 흐림, 비, 눈비, 눈)
  - `js/weather.js`: 강수형태(PTY)와 하늘상태(SKY)로 사진을 고르는 `photoKey()` 추가, 타일 마크업 추가
  - `styles.css`: 760px 이하에서 타일 표시, 기존 날씨 텍스트는 모바일에서 숨김
- 확인
  - `photoKey` 매핑 로직 단위 확인 완료
  - 기존 `tests/chatbot.test.mjs`는 이 변경 이전부터 실패 (변경 전 상태에서도 실패 확인). 이번 작업과 무관
- 미확인
  - 아이폰 사파리에서 타일 위치와 글자 줄넘김
  - 실제 기상청 값이 들어올 때 타일 표시
- 브랜치: `feature/mobile-weather-tile` (main에 합치기 전 상태)

## 12. 2026-11-25 문의하기 게시판

- 요청: 문의를 게시판 형식으로 바꾸고, 공개·비공개 선택, 관리자 답변 저장, 개인정보 안내 추가
- 구현
  - `js/app.js`: 목록 (공개 글 + 본인 글, 최신순, 10건씩, 이름은 첫 글자만 표시, 내 글·비공개 표시), 글쓰기 (제목·분류·이름·공개 여부·동의 체크), 상세 (질문과 인사팀 답변)
  - `firestore.rules`: 작성 시 값 검증 (분류 채용·교육·기타, 제목 60자, 상태 대기), 읽기는 공개 글·본인 글·관리자, 수정은 관리자가 답변·상태만, 삭제는 관리자
  - `js/admin.js`, `admin.html`: 문의 관리 패널 (목록, 상세, 답변 저장, 1년 지난 문의 정리 버튼 with 확인창)
  - `styles.css`: 게시판 표와 페이저, 캐시 키 `20261125c`
- 정리 기준: 답변이 있으면 답변 저장일, 없으면 작성일부터 1년
- 확인 필요
  - Firestore 규칙 재배포 전에는 작성과 조회가 막힘 (`firebase deploy --only firestore:rules`)
  - 기존 문의 문서에는 `title`, `isPublic`, `status`가 없음. 목록에서는 기본값으로 표시되고 정리는 답변 저장일 또는 작성일 기준
  - 1년 정리는 관리자 버튼을 눌러야 실행됨 (자동 삭제 아님)
- 브랜치: `feature/inquiry-board` (main 병합과 푸시는 승인 후)

## 13. 2026-11-25 작업 요약 (기준 시각 11:30 KST)

- 모바일 헤더 날씨 사진 타일 (커밋 386ff27 → d6b545d, 11:04 병합)
  - 파란 칸 시안은 되돌림 (3abc79f). 사진 타일은 760px 이하에서만 표시
  - 날씨 상태별 사진 매핑과 글자색 대비 조정, 메뉴 카드 안에 날씨 표시
  - 캐시 키 갱신으로 모바일 구버전 스타일 문제 해결 (1eb0aed, d6b545d)
- 문의하기 게시판 (커밋 1fcc14c, 11:13)
  - 목록, 글쓰기, 상세 보기 추가, 공개·비공개 선택 (기본 비공개)
  - 관리자 문의 관리 패널에서 답변 저장, 1년 지난 문의 정리 버튼
  - Firestore 규칙 게시 완료 (사용자 확인)
- 문의 안내 문구와 빈 게시판 표 (커밋 45da9f9, 11:24)
  - 글쓰기 안내 문구를 멘토 답변 안내 문구로 변경
  - 문의가 없을 때 사이트 색감에 맞춘 빈 상태 표시
- 교육 공고 응답 지연 완화 (커밋 d40fb86, 11:28)
  - 고용24 호출마다 4초 시간 제한. 한 곳이 느려도 나머지 목록을 먼저 표시
  - 배포 후 실제 응답 시간은 아직 확인 전
- 남은 일
  - 교육 공고 응답 시간 확인 후 시간 제한 값 조정 여부 결정
  - AI 관리자 화면 개선 방향 (연결 상태 점검, 테스트 질문, 질문 기록 중 선택) 미정
  - 기존 문의 문서에 제목·공개 여부·상태 필드가 없는 점은 그대로 둠

## 14. 2026-11-25 검사용 읽기 전용 계정 등록 (test1@example.com)

- 요청: `test1@example.com` 계정에 관리자 페이지 읽기 권한 부여, 11월 30일(11월 말)까지만 유지하는 조건
- 구현:
  - `js/config.js`: `READ_ONLY_EMAILS`에 `test1@example.com` 등록, 만료 시점 `READ_ONLY_EXPIRES_AT = "2026-12-01T00:00:00+09:00"` (11월 30일 23:59:59 KST까지 유효) 정의
  - `js/admin.js`: 만료 체크 로직(`isExpired`) 추가. 유효 기간 동안에는 탭 전환을 제외한 모든 버튼·입력란 비활성화, 만료 후에는 "읽기 권한이 만료되었습니다" 안내 후 로그아웃 처리. 테스트 계정의 이메일 미인증 대응으로 `emailVerified` 조건 제외
  - `admin.html`: 브라우저 캐시 방지를 위해 `js/admin.js?v=20261125d` 캐시 키 추가
- 확인:
  - 문법 검사(`js/config.js`, `js/admin.js`) 및 단위 테스트(11개) 전체 통과
  - 배포 후 사용자 실제 로그인 성공 확인 완료 (커밋 `a77ca9f`). `test1@example.com (읽기 전용)` 표시 및 탭 전환 외 모든 버튼·입력란 비활성화 확인됨


## 15. 2026-11-25 오후 작업 기록 (제출 전 정리)

- 챗봇 (feature/chat-site-wide, main 병합 2398f44): 사이트 메뉴·공개 글·공고 근거를 함께 보고, 일반 지식 질문도 답하도록 확장. AI 답변이 비면 진단 정보(모델, 정지 이유, 블록 종류, 공고 건수)를 응답과 관리자 화면에 남김
- 모바일 헤더 ☰ 메뉴 (fix/mobile-menu-visible, main 병합 93cf303): 메뉴 버튼 표시 규칙을 760px 이하로 한정. 아이폰에서 메뉴 열림 확인
- 관리자 AI 연결 상태 점검 (feature/admin-chat-status, main 병합 f2f2dcc): 서버 키 유무, AI 켜짐 여부, 모델, 근거 데이터 수, 공개 글 수를 표시하고 "연결 상태 다시 확인" 버튼 추가
- 에이전트 지침 보완 (docs/AGENT_GUIDE.md, f3a3ea8): 인계 문서 항목, 기록 재작성 승인 규칙, 옛 브랜치 보존 규칙 추가
- GA4 측정 (PRD v2 R2, R5 일부): 웹 스트림 주소를 https://sylvieee.vercel.app으로 저장. 맞춤 차원 글 ID(post_id), 글 제목(post_title), 글 카테고리(category)를 이벤트 범위로 등록 (반영까지 최대 24~48시간)
- 스크롤 깊이 이벤트 (feature/scroll-read-progress, main 병합 fdde881): 본문 25, 50, 75, 100% 도달 시 post_read_progress 전송 (read_depth 포함). PRD v2 6번 명세 반영
- 직업정보 상세 (feature/job-info-detail): 직업 검색 결과를 버튼으로 바꾸고, 누르면 직업정보 상세 API(212D01)로 하는 일, 교육·자격·훈련, 임금·전망, 능력·지식·환경을 표시. 실제 호출은 배포 후 확인 필요 (호출 주소의 cal/call 표기 확인 필요)
- 목록 디자인 시안: 교육 과정 번호 제거, 채용·교육 카드 높이 통일(104px, 제목 2줄 제한). 시안 파일은 Claude 디자인 아티팩트 "SV Career 목록 디자인 수정 시안"에 있고 사이트에는 아직 반영하지 않음 (교육 번호 제거와 카드 높이 통일은 별도 수정 필요)

### 미구현 (PRD v2 기준)
- R6 글별 고유 주소: 해시 주소를 유지함. 주소 구조 변경과 기존 링크 호환을 함께 설계해야 해서 다음 단계로 남김
- R1 완독 기준: PRD의 80% 스크롤 기준 대신 본문 끝 표식 노출과 활성 체류 시간 기준을 사용. 기준 재결정 필요
- R4 체류 시간 전송 주기: 코드 60초, PRD 예시 30초. 값 확정 필요
- 8번 열린 질문(완독 기준, 인기 점수 가중치, 익명 포함 여부, 지원 지표 분리, 글 ID 기준 집계)은 아직 결정하지 않음
