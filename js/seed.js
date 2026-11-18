// 초기 샘플 글. 관리자 페이지에서 "샘플 글 등록" 버튼으로 한 번만 넣을 수 있습니다.
// 그림은 Unsplash 무료 사진(Unsplash License)을 사용하며 imageCredit에 출처를 적습니다.
const U = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const SEED_POSTS = [
  {
    visibility: "public",
    category: "education",
    jobType: null,
    image: null,
    imageUrl: U("photo-1675557009875-436f71457475"),
    imageCredit: "Photo by Jonathan Kemper on Unsplash",
    title: "AI 활용 교육: 업무에 바로 쓰는 생성형 AI 실무 과정",
    summary: "문서 작성, 데이터 정리, 보고서 요약을 생성형 AI로 줄이는 실습 중심 교육입니다.",
    location: "",
    deadline: "",
    body: "SY Electronics 인사팀에서 임직원 대상 AI 활용 교육을 진행합니다.\n\n교육 내용은 문서 작성, 데이터 정리, 보고서 요약 등 일상 업무에서 생성형 AI를 활용하는 방법입니다. 실습 위주로 진행하며, 개인 업무 사례를 직접 적용해 봅니다.\n\n교육 일정과 신청 방법은 사내 공지를 통해 안내드리겠습니다. 본사(서울)와 지점 임직원 모두 참여할 수 있으며, 지점 교육은 온라인으로 함께 진행합니다."
  },
  {
    visibility: "public",
    category: "education",
    jobType: null,
    image: null,
    imageUrl: U("photo-1758518731457-5ef826b75b3b"),
    imageCredit: "Photo by Vitaly Gariev on Unsplash",
    title: "AI·AX 업무 혁신 교육: 업무 자동화에서 조직 전환까지",
    summary: "업무 프로세스를 점검하고 자동화할 영역을 찾아 팀별 개선안을 만드는 워크숍입니다.",
    location: "",
    deadline: "",
    body: "AX(AI Transformation)는 AI를 도구로 쓰는 수준을 넘어 업무 방식과 조직 문화를 바꾸는 과정입니다.\n\n이번 교육에서는 업무 프로세스를 점검하고 자동화할 수 있는 영역을 찾는 방법을 다룹니다. 팀별 과제를 정해 업무 개선안을 직접 만들어 보는 워크숍을 포함합니다.\n\n관리자와 팀장급 임직원을 우선 대상으로 하며, 이후 전사로 확대할 예정입니다."
  },
  {
    visibility: "public",
    category: "recruit",
    jobType: "신입공채",
    image: null,
    imageUrl: U("photo-1542744095-fcf48d80b0fd"),
    imageCredit: "Photo by Campaign Creators on Unsplash",
    title: "[신입 공개채용] 연구원 모집",
    summary: "SY Electronics 연구원 신입 공개채용 안내입니다. 이름과 이메일로 바로 지원할 수 있습니다.",
    location: "서울 강남",
    deadline: "2026-11-30",
    body: "SY Electronics에서 함께할 신입 연구원을 모집합니다.\n\n모집 분야: 연구원\n근무지: 본사(서울) 및 지점 각 지역\n지원 자격과 전형 절차는 채용 공고 확정 후 안내드리겠습니다.\n\n지원하기 버튼을 누르고 이름과 이메일을 입력하면 지원이 접수됩니다. 세부 내용은 인사팀에 문의해 주세요."
  },
  {
    visibility: "public",
    category: "recruit",
    jobType: "경력직",
    image: null,
    imageUrl: U("photo-1705579610353-ffd640d857e9"),
    imageCredit: "Photo by ThisisEngineering on Unsplash",
    title: "[경력직 채용] 연구원 모집",
    summary: "관련 분야 경력을 가진 연구원을 모집합니다.",
    location: "서울 강남",
    deadline: "2026-11-30",
    body: "SY Electronics에서 관련 경력을 갖춘 연구원을 모집합니다.\n\n모집 분야: 연구원 (경력직)\n근무지: 본사(서울) 및 지점 각 지역\n경력 요건과 우대 사항은 채용 공고 확정 후 안내드리겠습니다.\n\n지원 방법과 세부 내용은 인사팀에 문의해 주세요."
  }
];
