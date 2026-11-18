// Firebase 웹 앱 설정값. Firebase 콘솔 > 프로젝트 설정 > 내 앱 > SDK 구성에서 복사해 붙여넣으세요.
export const firebaseConfig = {
  apiKey: "AIzaSyC6CHywgzwyALWZKEfrZFvo4TT9hjpGyZk",
  authDomain: "sylvi-electronic.firebaseapp.com",
  projectId: "sylvi-electronic",
  storageBucket: "sylvi-electronic.firebasestorage.app",
  messagingSenderId: "852910515729",
  appId: "1:852910515729:web:dcaebdc2f2fc9cd5a4f3b0",
  measurementId: "G-BC6KK97MHL"
};

// 관리자 페이지에 로그인할 수 있는 Google 계정
export const ADMIN_EMAIL = "fkdna3@gmail.com";

export const COMPANY_NAME = "SY Electronics";

// 홈 화면 회사 소개. 아래 문구는 초안이므로 확정된 소개 문구로 바꿔 주세요.
export const COMPANY_INTRO = {
  kicker: "ABOUT SY ELECTRONICS",
  title: "사람이 기술을 완성합니다",
  body: "SY Electronics는 본사 서울과 전국 지점이 함께 일하는 회사입니다. 임직원이 실무 역량을 키울 수 있도록 교육을 지원하고, 함께 성장할 인재를 찾고 있습니다.",
  values: [
    { title: "성장", desc: "실무 중심 교육으로 역량을 키웁니다" },
    { title: "협업", desc: "본사와 지점이 한 팀으로 일합니다" },
    { title: "기술", desc: "AI를 실제 업무에 적용합니다" }
  ]
};
