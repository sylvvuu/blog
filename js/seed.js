// 초기 샘플 글. 관리자 페이지에서 "샘플 글 등록" 버튼으로 한 번만 넣을 수 있습니다.
// 세부 자격 요건, 마감일, 근무 조건은 실제 공고에 맞게 관리자 페이지에서 수정하세요.
export const SEED_POSTS = [
  {
    category: "education",
    jobType: null,
    image: "ai",
    title: "AI 활용 교육 안내: 임직원 생성형 AI 실무 과정",
    summary: "업무에 바로 쓸 수 있는 생성형 AI 활용법을 배우는 실무 중심 교육입니다.",
    location: "",
    deadline: "",
    body: "SY Electronics 인사팀에서 임직원 대상 AI 활용 교육을 진행합니다.\n\n교육 내용은 문서 작성, 데이터 정리, 보고서 요약 등 일상 업무에서 생성형 AI를 활용하는 방법입니다. 실습 위주로 진행하며, 개인 업무 사례를 직접 적용해 봅니다.\n\n교육 일정과 신청 방법은 사내 공지를 통해 안내드리겠습니다. 본사(서울)와 지점 임직원 모두 참여할 수 있으며, 지점 교육은 온라인으로 함께 진행합니다."
  },
  {
    category: "education",
    jobType: null,
    image: "ax",
    title: "AI·AX 업무 혁신 교육: 업무 자동화에서 조직 전환까지",
    summary: "AI 기반 업무 혁신(AX)의 개념과 실제 적용 사례를 함께 살펴보는 교육입니다.",
    location: "",
    deadline: "",
    body: "AX(AI Transformation)는 AI를 도구로 쓰는 수준을 넘어 업무 방식과 조직 문화를 바꾸는 과정입니다.\n\n이번 교육에서는 업무 프로세스를 점검하고 자동화할 수 있는 영역을 찾는 방법을 다룹니다. 팀별 과제를 정해 업무 개선안을 직접 만들어 보는 워크숍을 포함합니다.\n\n관리자와 팀장급 임직원을 우선 대상으로 하며, 이후 전사로 확대할 예정입니다."
  },
  {
    category: "recruit",
    jobType: "신입공채",
    image: "recruit",
    title: "[신입 공개채용] 연구원 모집",
    summary: "SY Electronics 연구원 신입 공개채용 안내입니다.",
    location: "본사(서울) 및 지점 각 지역",
    deadline: "추후 공지",
    body: "SY Electronics에서 함께할 신입 연구원을 모집합니다.\n\n모집 분야: 연구원\n근무지: 본사(서울) 및 지점 각 지역\n지원 자격과 전형 절차는 채용 공고 확정 후 안내드리겠습니다.\n\n지원 방법과 세부 내용은 인사팀에 문의해 주세요."
  },
  {
    category: "recruit",
    jobType: "경력직",
    image: "career",
    title: "[경력직 채용] 연구원 모집",
    summary: "관련 분야 경력을 가진 연구원을 모집합니다.",
    location: "본사(서울) 및 지점 각 지역",
    deadline: "추후 공지",
    body: "SY Electronics에서 관련 경력을 갖춘 연구원을 모집합니다.\n\n모집 분야: 연구원 (경력직)\n근무지: 본사(서울) 및 지점 각 지역\n경력 요건과 우대 사항은 채용 공고 확정 후 안내드리겠습니다.\n\n지원 방법과 세부 내용은 인사팀에 문의해 주세요."
  }
];
