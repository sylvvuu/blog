# 작업 기록 (2026-11-18 기준)

SY Electronics 인사팀 블로그(https://sylvvuu.github.io/blog/)의 작업 내역과 현재 상태를 정리합니다.

## 0. 주소 모음

| 구분 | 주소 |
|---|---|
| 블로그 홈 | https://sylvvuu.github.io/blog/ |
| 교육 목록 | https://sylvvuu.github.io/blog/#/education |
| 채용 공고 목록 | https://sylvvuu.github.io/blog/#/recruit |
| 문의하기 | https://sylvvuu.github.io/blog/#/inquiry |
| 관리자 페이지 | https://sylvvuu.github.io/blog/admin.html |
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

- **브라우저 캐시:** GitHub Pages는 `js/app.js`를 약 10분간 캐시합니다. 배포 직후에는 강력 새로고침(Ctrl+Shift+R)이 필요합니다.
- **채용 목록 숨김:** API 오류가 나면 목록을 조용히 숨깁니다. 원인을 화면에서 보려면 오류 문구를 표시하도록 바꿀 수 있습니다.
- **dist/ 폴더:** `dist/index.html`, `dist/admin.html`은 예전 사본이라 배포 대상이 아닙니다. 사용하지 않습니다.
