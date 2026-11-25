// Firebase 웹 앱 설정값. Firebase 콘솔 > 프로젝트 설정 > 내 앱 > SDK 구성에서 복사해 붙여넣으세요.
export const firebaseConfig = {
  apiKey: "AIzaSyC6CHywgzwyALWZKEfrZFvo4TT9hjpGyZk",
  // Vercel 주소에서는 같은 도메인의 /__/auth 경로(vercel.json에서 Firebase로 연결)를 써서 아이폰 사파리의 로그인 정보 차단을 피함
  // GitHub Pages 주소는 기존 Firebase 도메인을 그대로 사용
  authDomain: location.hostname.endsWith("github.io") ? "sylvi-electronic.firebaseapp.com" : "sylvieee.vercel.app",
  projectId: "sylvi-electronic",
  storageBucket: "sylvi-electronic.firebasestorage.app",
  messagingSenderId: "852910515729",
  appId: "1:852910515729:web:dcaebdc2f2fc9cd5a4f3b0",
  measurementId: "G-BC6KK97MHL"
};

// 관리자 페이지에 로그인할 수 있는 Google 계정
export const ADMIN_EMAIL = "fkdna3@gmail.com";

// 검사용 읽기 전용 계정: 관리자 화면을 조회만 할 수 있다 (저장·삭제 버튼 비활성, 11월 30일까지 유지)
export const READ_ONLY_EMAILS = ["test1@example.com"];
// 읽기 전용 계정 만료 시점 (11월 30일 23:59:59 KST까지 유지)
export const READ_ONLY_EXPIRES_AT = "2026-12-01T00:00:00+09:00";

export const COMPANY_NAME = "SV";

// 홈 화면 회사 소개. 아래 문구는 초안이므로 확정된 소개 문구로 바꿔 주세요.
export const COMPANY_INTRO = {
  kicker: "ABOUT SV",
  title: "사람이 기술을 완성합니다",
  body: "SV는 본사 서울과 전국 지점이 함께 일하는 회사입니다. 임직원이 실무 역량을 키울 수 있도록 교육을 지원하고, 함께 성장할 인재를 찾고 있습니다.",
  values: [
    { title: "성장", desc: "실무 중심 교육으로 역량을 키웁니다" },
    { title: "협업", desc: "본사와 지점이 한 팀으로 일합니다" },
    { title: "기술", desc: "AI를 실제 업무에 적용합니다" }
  ]
};
