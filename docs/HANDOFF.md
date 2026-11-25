# SV Career 인사팀 블로그 인계 문서

최종 수정: 2026-11-25 (KST), 코드 기준 커밋: a77ca9f (이후 커밋은 문서 수정)

## 1. 기본 정보
- 저장소: https://github.com/sylvvuu/blog (기본 브랜치 main)
- 배포 주소: https://sylvieee.vercel.app/
- Vercel 프로젝트: sylvieee (ID: prj_7vRy4ELVArEC00mFJtoo4V1GvDk1)
- Firebase 프로젝트: SV Career (프로젝트 ID: sylvi-electronic)
- 관리자 계정: fkdna3@gmail.com (Google 로그인)

## 2. main의 현재 상태 (a77ca9f)
반영된 기능
- 문의 게시판 (공개/비공개, 관리자 답변)
- 관리자 화면 탭 구조, AI 질문 도우미 설정 화면
- 챗봇: 근거 번호 재요청, 422 원인 표시, 직전 대화 기억
- 관리자 로그인: Google 로그인과 이메일/비밀번호 로그인

## 3. 권한 관련 변경 이력 (주의)
- af82b65: 검사자 읽기 권한 제거
- 00f93d9: js/config.js의 READ_ONLY_EMAILS에 test1@example.com 추가 (메시지: 11월 30일까지 유지)
- a77ca9f: js/admin.js에서 읽기 전용 계정의 이메일 인증 확인 제거

위 세 커밋은 이 인계 세션에서 직접 만든 것이 아닙니다.
- test1@example.com은 example.com 예약 도메인 주소라 인증 메일을 받을 수 없습니다. 이메일/비밀번호 로그인은 성공이 확인되었습니다.
- 이메일 인증 확인이 빠져 있어 이 주소로 미인증 로그인도 관리자 화면에 들어올 수 있습니다.
- Firestore 규칙에는 test1 권한이 없으므로 데이터 조회는 실패할 가능성이 높습니다.
- 결정: 되돌리지 않고 main 상태를 유지합니다 (9번 섹션 참고).

## 4. Firestore 규칙
- main의 firestore.rules에는 검사자 함수(isReviewer)가 없습니다.
- 콘솔에 게시된 규칙에는 예전 검사자 조회 권한이 남아 있을 수 있습니다. 게시 여부를 콘솔에서 확인하세요.
- 규칙을 바꾸려면 main의 firestore.rules 전체를 콘솔 규칙 탭에 붙여 넣고 게시합니다.

## 5. 아직 끝나지 않은 일
1. 권한 변경 이력(3번): 되돌리지 않기로 결정됨 (9번 섹션)
2. Firestore 규칙 게시 상태 확인과 필요 시 게시
3. 기간제 채용 검색 수정 (보류, 논의 필요): 고용형태 표현을 조건으로 인식하지 않아 공고 제목 기준 선별이 필요함
4. 시연용 화면(demo-admin.html): 배포하지 않기로 함. feat/demo-admin 브랜치는 로컬에만 있고 원격에 없음

## 6. 원칙
- 푸시, main 병합, 배포, 규칙 게시는 사용자 승인 후에만 진행합니다.
- 관리자나 검사자 권한은 실제로 로그인 가능한 계정에 부여하는 것을 원칙으로 합니다. 예외: test1@example.com은 담당자 결정으로 9번 섹션에 기록되어 있습니다.
- 관리자 화면을 누구나 열 수 있게 공개하지 않습니다.
- 비밀 키(인증키, 서비스 키)는 출력하거나 기록하지 않습니다. 관리자 화면에서는 마스킹만 사용합니다.
- 디자인이나 시안 요청은 코드에 반영하지 않습니다. 의견 요청은 푸시하지 않습니다.
- 커밋 메시지 끝에 다음 두 줄을 넣습니다.
  - Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>
  - Claude-Session: https://claude.ai/code/session_01WtdLWdCwpuR1YuMmo2Ksva

## 7. 주요 파일
- api/chat.js: 챗봇 서버
- js/chatbot.js, js/app.js: 챗봇 화면과 호출
- admin.html, js/admin.js: 관리자 화면 (로그인, 탭, AI 설정, 문의 관리)
- js/config.js: ADMIN_EMAIL, READ_ONLY_EMAILS
- firestore.rules: 보안 규칙

## 9. 권한 결정 기록 (담당자 결정, 2026-11-25 14:41 KST)

담당자 결정
- 현재 main 상태를 유지하고 되돌리지 않음.
- test1@example.com은 과제 평가용 모의 시연 계정으로, 이메일/비밀번호 로그인과 읽기 전용 화면을 점검하기 위한 용도.
- 시한은 2026-12-01 00:00 KST (config.js의 READ_ONLY_EXPIRES_AT). 이후 화면 진입이 차단됨.

반영된 보호 장치 (main 기준으로 확인한 내용)
- 관리자 계정(ADMIN_EMAIL)과 READ_ONLY_EMAILS에 있는 계정만 관리자 화면에 진입 가능. 그 외 계정은 로그아웃됨.
- 탭 전환 외 저장·수정·삭제 버튼과 입력란은 비활성화됨 (js/admin.js).
- Firestore 쓰기·삭제 규칙은 isAdmin()(fkdna3@gmail.com)에게만 허용됨.

확인이 필요한 사항
- main의 firestore.rules에는 검사자 조회 함수(isReviewer)가 없음. 따라서 test1@example.com은 Firestore 데이터(글 비공개 항목, 문의)를 읽을 권한이 없어 화면 데이터가 불러와지지 않을 가능성이 높음. 실제 시연에 데이터가 필요하면 규칙 변경과 게시가 별도로 필요함.
- 이메일 인증 확인(emailVerified)이 읽기 전용 진입 조건에서 제외됨 (a77ca9f). 권한 목록에 있는 주소라면 인증되지 않은 로그인도 화면에 진입할 수 있음.

기록자의 의견 (담당자 결정과 별개로 남김)
- test1@example.com은 example.com 주소라 인증 메일을 받을 수 없습니다. 이메일 인증 확인을 되살리면 이 계정은 진입할 수 없게 되므로, 실제 채점관 계정으로 대체하는 것을 권장함.
- 되돌리기 여부와 최종 결정권은 담당자에게 있음.
