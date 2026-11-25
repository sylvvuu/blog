# SV Career 인사팀 블로그 인계 문서

작성 기준: 2026-11-25 14:40 (KST), 기준 커밋은 origin/main의 a77ca9f

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
- af82b65: 검사자([삭제된 이메일]) 읽기 권한 제거
- 00f93d9: js/config.js의 READ_ONLY_EMAILS에 test1@example.com 추가 (메시지: 11월 30일까지 유지)
- a77ca9f: js/admin.js에서 읽기 전용 계정의 이메일 인증 확인 제거

위 두 커밋(00f93d9, a77ca9f)은 이 인계 작업을 한 세션에서 직접 만든 것이 아닙니다.
- test1@example.com은 실제 사람이 쓸 수 없는 예시 주소입니다. 권한 부여를 승인하지 않았습니다.
- 이메일 인증 확인이 빠져 있어 권한 목록에 있는 주소는 미인증 로그인도 관리자 화면에 들어올 수 있습니다.
- Firestore 규칙에는 test1 권한이 없으므로 데이터 조회는 실패할 가능성이 높지만, 화면 권한 설정 자체는 잘못된 상태입니다.
- 결정 필요: 두 커밋을 되돌릴지 여부. 되돌리면 READ_ONLY_EMAILS는 비고 이메일 인증 확인이 복구됩니다. (되돌리기 전까지 main 상태는 그대로 둡니다.)

## 4. Firestore 규칙
- main의 firestore.rules에는 검사자 함수(isReviewer)가 없습니다.
- 콘솔에 게시된 규칙에는 예전 검사자 조회 권한이 남아 있을 수 있습니다. 게시 여부를 콘솔에서 확인하세요.
- 규칙을 바꾸려면 main의 firestore.rules 전체를 콘솔 규칙 탭에 붙여 넣고 게시합니다.

## 5. 아직 끝나지 않은 일
1. 권한 변경 이력(3번)에 대한 되돌리기 결정
2. Firestore 규칙 게시 상태 확인과 필요 시 게시
3. 기간제 채용 검색 수정 (보류, 논의 필요): 고용형태 표현을 조건으로 인식하지 않아 공고 제목 기준 선별이 필요함
4. 시연용 화면 배포 (승인 대기): feat/demo-admin 브랜치의 demo-admin.html

## 6. 원칙
- 푸시, main 병합, 배포, 규칙 게시는 사용자 승인 후에만 진행합니다.
- 관리자나 검사자 권한은 실제로 로그인 가능한 계정에만 부여합니다. 예시 주소(example.com)나 임시 메일 주소는 권한 목록에 넣지 않습니다.
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
- READ_ONLY_EMAILS에 있는 계정만 읽기 전용 진입 가능. 다른 계정은 진입 불가.
- 탭 전환 외 저장·수정·삭제 버튼과 입력란은 비활성화됨 (js/admin.js).
- Firestore 쓰기·삭제 규칙은 isAdmin()(fkdna3@gmail.com)에게만 허용됨.

확인이 필요한 사항
- main의 firestore.rules에는 검사자 조회 함수(isReviewer)가 없음. 따라서 test1@example.com은 Firestore 데이터(글 비공개 항목, 문의)를 읽을 권한이 없어 화면 데이터가 불러와지지 않을 가능성이 높음. 실제 시연에 데이터가 필요하면 규칙 변경과 게시가 별도로 필요함.
- 이메일 인증 확인(emailVerified)이 읽기 전용 진입 조건에서 제외됨 (a77ca9f). 권한 목록에 있는 주소라면 인증되지 않은 로그인도 화면에 진입할 수 있음.

기록자의 의견 (담당자 결정과 별개로 남김)
- 실제 사람이 로그인할 수 없는 예시 주소를 관리자 화면 권한 목록에 두는 것은 보안 설정을 여는 행위이므로, 가능하면 시연용 화면(demo-admin.html)이나 실제 채점관 계정으로 대체하는 것을 권장함.
- 되돌리기 여부와 최종 결정권은 담당자에게 있음.
