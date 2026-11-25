// Vercel 서버 함수: 사이트 전체 질문, 고용24 채용 공고·교육 과정 질문, 일반 상식 질문에 Claude가 답한다.
// 키: ANTHROPIC_API_KEY(필수, Vercel 환경 변수), JOBS_API_KEY(선택, 없으면 settings/jobs 사용)
// 관리자 설정(사용 여부, 모델, 추가 규칙, 근거 데이터)은 Firestore settings/chat에서 읽는다.
// 고용24 인증키는 settings 문서에 저장된 값을 쓴다. 질문 원문은 저장하지 않는다.

const PROJECT_ID = "sylvi-electronic";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings`;
const FS_POSTS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/posts`;
const ALLOWED_ORIGINS = ["https://sylvvuu.github.io", "https://sylvieee.vercel.app"];
const MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"];
const DEFAULT_MODEL = "claude-haiku-5-5";
const DEFAULT_SOURCES = ["jobs", "education", "job"];
const WORK24 = "https://www.work24.go.kr/cm/openApi/call";
const MAX_ITEMS = 60;
const MAX_EXTRA_RULES = 1000;
const MAX_SECTION = 1500;
const MAX_FAQ = 3000;

// 해시 단일 페이지 메뉴 및 사이트 고정 안내 문구
export const SITE_MENU_GUIDE = `[SV Career 사이트 안내]
- 사이트 소개: SV Career(https://sylvieee.vercel.app/)는 청년·신입 구직자를 위한 채용 공고와 직업 교육 훈련 정보를 제공하는 구직 안내 사이트입니다.
- 홈 (#/): 실시간 날씨 위젯, 최신 채용 공고 5건과 기업 구분(대기업·중견기업 등) 드롭다운 필터, 고용24 직업정보 검색창, AI 멘토를 제공합니다.
- 채용 공고 (#/recruit): 고용24 공채속보와 연동되어 최신 20건의 채용 공고를 기업 구분별로 확인하고 외부 공식 지원 페이지로 이동할 수 있습니다.
- 교육 (#/education): 국민내일배움카드 훈련과정 등 고용24 교육 정보 5종(사업주훈련, 일학습병행, 컨소시엄, 구직자 프로그램)을 시작일순으로 모아볼 수 있습니다.
- 문의하기 (#/inquiry): 구직자가 채용이나 교육에 대해 질문을 남길 수 있는 게시판입니다. 공개 또는 비공개로 글을 작성할 수 있으며, 인사팀이 확인해 답변드립니다.
- 관리자 페이지 (admin.html): 관리자 로그인을 통해 AI 멘토 설정, 문의 관리 및 멘토 답변 작성, 공고 API 키 관리를 할 수 있습니다.`;

// Firestore REST API로 공개 글(posts)을 읽는다 (visibility == 'public')
export async function fetchPublicPosts() {
  const url = `${FS_POSTS}?pageSize=50`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const docs = data.documents || [];
  return docs.map(d => {
    const fields = d.fields || {};
    const visibility = fields.visibility && fields.visibility.stringValue ? fields.visibility.stringValue : "public";
    if (visibility !== "public") return null;
    const title = fields.title && fields.title.stringValue ? fields.title.stringValue : "";
    const summary = fields.summary && fields.summary.stringValue ? fields.summary.stringValue : "";
    const body = fields.body && fields.body.stringValue ? fields.body.stringValue.slice(0, 200) : "";
    const category = fields.category && fields.category.stringValue ? fields.category.stringValue : "";
    return { title, summary, body, category };
  }).filter(Boolean).filter(p => p.title);
}

// 공개 글은 60초간 캐시한다
export async function cachedPublicPosts(ttl = 60000) {
  const hit = cacheMem.get("public_posts");
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = await fetchPublicPosts().catch(() => []);
  cacheMem.set("public_posts", { at: Date.now(), value });
  return value;
}

// 사이트 고정 안내와 공개 글 요약을 하나의 컨텍스트로 합친다
export function buildSiteContext(posts = []) {
  const postsText = posts.length
    ? `\n\n[블로그 공개 글 요약]\n` + posts.map((p, i) =>
        `- 글 ${i + 1}: [${p.category || "일반"}] ${p.title}${p.summary ? ` | ${p.summary}` : ""}${p.body ? ` | ${p.body}` : ""}`
      ).join("\n")
    : "";
  return `${SITE_MENU_GUIDE}${postsText}`;
}

// 관리자 화면에서 고친 프롬프트 조각을 하나의 시스템 프롬프트로 합친다
// 인용 번호 규칙(CORE_RULES)은 항상 붙여서 근거 없는 답변이 나가지 않게 한다
const SECTION_TITLES = [
  ["secRole", "# 역할 및 페르소나"],
  ["secTasks", "# 핵심 업무"],
  ["secRules", "# 응답 원칙 및 제약사항"],
  ["secExamples", "# 대화 흐름 예시"]
];
const LENGTH_RULES = {
  short: "답은 2문장 이내로 짧게 씁니다.",
  long: "필요하면 3~5문장으로 자세히 씁니다."
};
const PLACEHOLDERS = [
  [/\[채용사이트 또는 기업명\]/g, "SV Career"],
  [/\[문의하기 링크\]/g, "문의하기 화면(#/inquiry)"]
];

const CITE_RETRY_HINT = "반드시 추천하거나 언급한 공고 뒤에 [번호]를 붙이세요. 번호 없이 답하지 마세요.";

function buildSystem(s) {
  const clip = (v, n) => String(v || "").slice(0, n).trim();
  const persona = SECTION_TITLES
    .map(([k, title]) => (clip(s[k], MAX_SECTION) ? `${title}\n${clip(s[k], MAX_SECTION)}` : ""))
    .filter(Boolean).join("\n\n");
  const guards = [
    s.noSalary === true ? "- 연봉, 합격 기준, 미공개 채용 일정은 추측하지 않습니다." : "",
    s.noPersonal === true ? "- 주민등록번호, 상세 주소 등 민감한 개인정보를 요구하지 않습니다." : "",
    s.noAutoLink === true ? "- 지원 링크나 다음 행동은 질문에 답한 뒤에만 안내합니다." : ""
  ].filter(Boolean);
  const faq = clip(s.faq, MAX_FAQ);
  const extra = clip(s.extraRules, MAX_EXTRA_RULES);
  const system = [
    persona,
    CORE_RULES,
    guards.length ? `추가 금지 규칙:\n${guards.join("\n")}` : "",
    LENGTH_RULES[s.answerLength] || "",
    faq ? `FAQ 문서:\n${faq}` : "",
    extra ? `추가 운영 규칙:\n${extra}` : ""
  ].filter(Boolean).join("\n\n");
  return PLACEHOLDERS.reduce((t, [re, to]) => t.replace(re, to), system);
}

// 공고 필드 이름. 지역과 고용형태는 실제 210L21 응답에서 확인한 뒤 고쳐야 한다.
// 값이 비어 있는 공고는 해당 조건을 충족하지 않은 것으로 본다.
export const JOB_FIELDS = {
  region: "workRegion",
  employType: "empTpNm"
};
const REGIONS = ["서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const EMP_TYPES = ["정규직", "계약직", "인턴", "파견", "프리랜서", "아르바이트", "시간제"];

// 관리자가 바꿀 수 없는 기본 규칙. 사이트 정보, 공고 추천, 일반 지식 질문을 모두 처리한다.
export const CORE_RULES = `당신은 SV Career의 AI 멘토입니다. 사이트 전반에 대한 질문, 채용 및 교육 공고 질문, 그리고 일반 상식 질문에 답합니다.

1. 사이트 안내 및 채용·교육 질문:
- 제공된 사이트 안내 및 공고·교육 목록 자료에 근거하여 답합니다.
- 공고 목록에서 특정 공고나 교육 과정을 추천·언급할 때는 반드시 해당 항목 뒤에 [번호]를 붙이세요. (예: [1], [2])
- 사이트 소개, 메뉴별 기능(홈, 채용 공고, 교육, 문의하기 등) 및 블로그 글에 대한 질문은 사이트 안내 자료를 바탕으로 친절하게 설명하세요. 이때는 [번호]를 붙이지 않습니다.
- 제공되지 않은 회사명, 지원 자격, 연봉, 마감일, 외부 링크는 임의로 만들어 내지 마세요.
- 사용자가 명시한 조건(지역, 고용형태 등)에 맞는 공고를 찾지 못했다면 조회 범위 안에서 결과가 없다고 안내하세요.

2. 날씨 및 실시간 정보 질문:
- 날씨, 주가, 실시간 교통 등 실시간 정보는 서버에서 실시간 데이터를 확인할 수 없다고 안내하세요. (예: "실시간 날씨 정보는 홈 화면 상단의 날씨 위젯에서 확인해 주세요.")

3. 사이트와 무관한 일반 질문 (상식, 개념 설명 등):
- 일반 지식을 활용하여 친절하고 정확하게 답하세요. 이때는 [번호]를 붙이지 않습니다.

답변 방식:
- 자연스러운 한국어로 친절하게 답합니다.
- 공고를 추천할 때는 공고 제목이나 기간을 길게 나열하기보다 [번호]를 붙여 추천 이유를 설명하세요. (목록은 화면의 카드가 보여 줍니다)
- 자격 조건, 연봉, 재무 상태는 판단하지 않고 상세 공고 원문에서 확인하라고 안내합니다.`;

const cacheMem = new Map();

// Firestore REST API로 settings 문서를 읽는다 (settings는 공개 읽기)
async function readSettings(name) {
  const res = await fetch(`${FS_BASE}/${name}`);
  if (!res.ok) return {};
  const doc = await res.json();
  const out = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("booleanValue" in v) out[k] = v.booleanValue;
    else if ("arrayValue" in v) out[k] = (v.arrayValue.values || []).map(x => x.stringValue).filter(Boolean);
  }
  return out;
}

// 설정은 잠깐 캐시한다 (관리자가 바꾼 뒤 최대 30초 안에 반영)
async function cachedSettings(name, ttl = 30000) {
  const hit = cacheMem.get(name);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = await readSettings(name).catch(() => ({}));
  cacheMem.set(name, { at: Date.now(), value });
  return value;
}

const decodeKey = k => {
  if (!k) return "";
  try { return decodeURIComponent(k); } catch (e) { return k; }
};
const safeUrl = u => (/^https?:\/\//.test(u || "") ? u : "");

export async function fetchText(url) {
  const res = await fetch(url);
  return res.ok ? res.text() : "";
}

// XML의 각 요소 안쪽 내용을 모두 꺼낸다. 겹치는 요소도 찾도록 lookahead를 쓴다.
function elementsOf(xml) {
  const out = [];
  const re = /(?=<([A-Za-z_][\w]*)>((?:(?!<\/\1>)[\s\S])*)<\/\1>)/g;
  let m;
  while ((m = re.exec(xml))) {
    out.push({ tag: m[1], inner: m[2] });
    re.lastIndex = m.index + 1; // 같은 자리에서 멈추지 않도록 한 칸 옮긴다
  }
  return out;
}

// XML 문자 참조를 풀어 준다. 링크의 &amp;가 &로 바뀌지 않으면 고용24가 다른 페이지를 연다.
function decodeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagText(inner, tag) {
  const m = inner.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? decodeXml(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : "";
}

// 훈련과정 API(310L01, 311L01, 313L01, 312L01)의 과정 목록
export function trainingItems(xml, label) {
  return elementsOf(xml).filter(e => e.tag.toLowerCase() === "scn_list").map(e => ({
    source: label,
    title: tagText(e.inner, "title"),
    sub: tagText(e.inner, "subTitle"),
    start: tagText(e.inner, "traStartDate"),
    end: tagText(e.inner, "traEndDate"),
    url: safeUrl(tagText(e.inner, "titleLink"))
  })).filter(x => x.title);
}

// 구직자 취업역량 강화프로그램(217L01): pgmNm이 한 번만 있는 요소가 항목이다
export function programItems(xml, label) {
  return elementsOf(xml)
    .filter(e => (e.inner.match(/<pgmNm>/g) || []).length === 1)
    .map(e => ({
      source: label,
      title: tagText(e.inner, "pgmNm"),
      sub: tagText(e.inner, "orgNm"),
      start: tagText(e.inner, "pgmStdt"),
      end: tagText(e.inner, "pgmEndt"),
      url: ""
    }))
    .filter(x => x.title);
}

// 공채속보(210L21) 항목. 지역과 고용형태는 JOB_FIELDS에 적힌 이름으로 읽는다.
export function jobItems(xml) {
  return elementsOf(xml).filter(e => e.tag === "dhsOpenEmpInfo").map(e => ({
    source: "채용 공고",
    title: tagText(e.inner, "empWantedTitle"),
    company: tagText(e.inner, "empBusiNm"),
    kind: tagText(e.inner, "coClcdNm"),
    region: tagText(e.inner, JOB_FIELDS.region),
    employType: tagText(e.inner, JOB_FIELDS.employType),
    sub: [tagText(e.inner, "empBusiNm"), tagText(e.inner, "coClcdNm")].filter(Boolean).join(" · "),
    start: "",
    end: tagText(e.inner, "empWantedEndt"),
    url: safeUrl(tagText(e.inner, "empWantedHomepgDetail"))
  })).filter(x => x.title);
}

// 직업정보(212L01) 키워드 검색 결과
function occupationItems(xml) {
  return elementsOf(xml).filter(e => e.tag.toLowerCase() === "joblist").map(e => ({
    source: "직업 정보",
    title: tagText(e.inner, "jobNm"),
    sub: tagText(e.inner, "jobClcdNM"),
    start: "",
    end: "",
    url: ""
  })).filter(x => x.title);
}

// 210L21 공고를 가져온다. 호출이 실패하면 null을, 조회에 성공하면 목록(없으면 [])을 돌려준다.
export async function fetchJobPostings(key) {
  const params = new URLSearchParams({
    authKey: key, callTp: "L", returnType: "XML", startPage: "1", display: "20",
    sortField: "regDt", sortOrderBy: "desc"
  });
  const xml = await fetchText(`${WORK24}/wk/callOpenApiSvcInfo210L21.do?${params}`);
  return xml ? jobItems(xml) : null;
}

// 질문에서 지역과 고용형태 조건을 찾는다. 명시되지 않은 조건은 빈 문자열이다.
export function extractConditions(question) {
  const q = String(question || "");
  const region = REGIONS.find(r => q.includes(r)) || "";
  // "비정규직"의 "정규직"은 고용형태 조건으로 보지 않는다
  const employType = EMP_TYPES.find(t => t === "정규직" ? (q.includes("정규직") && !q.includes("비정규직")) : q.includes(t)) || "";
  return { region, employType };
}

// 명시된 조건을 모두 만족하는 공고만 남긴다. 필드 값이 없으면 충족하지 않은 것으로 본다.
// 지역 필드가 비어 있어도 제목·회사명에 지역 이름이 있으면 일치로 본다 (예: "대전HR 물품 검수 채용").
// 지역과 고용형태 필드가 모두 비어 있으면 조건을 충족하지 않는다.
export function matchJobs(items, cond) {
  return items.filter(x => {
    if (cond.region) {
      const text = `${x.region || ""} ${x.title || ""} ${x.company || ""}`;
      if (!text.includes(cond.region)) return false;
    }
    if (cond.employType) {
      const text = `${x.employType || ""} ${x.title || ""}`;
      if (!text.includes(cond.employType)) return false;
    }
    return true;
  });
}

// 조건에 맞는 공고가 없을 때 안내 문장. 조정해 볼 조건 하나를 제안한다.
export function noMatchText(cond) {
  const drop = cond.employType
    ? `고용형태("${cond.employType}")`
    : `지역("${cond.region}")`;
  return `현재 조회한 공고에서는 조건에 맞는 결과를 찾지 못했어요. ${drop} 조건을 빼고 다시 찾아볼까요?`;
}

// 근거 목록을 모은다. 키가 없거나 호출이 실패한 API는 건너뛴다.
async function gatherItems(question, sources, work24, education, jobsSetting) {
  const today = new Date();
  const end = new Date(today);
  end.setMonth(end.getMonth() + 3);
  const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const trainingParams = key => new URLSearchParams({
    authKey: key, returnType: "XML", outType: "1", pageNum: "1", pageSize: "10",
    srchTraStDt: ymd(today), srchTraEndDt: ymd(end), sort: "ASC", sortCol: "2"
  });
  const tasks = [];
  const add = (key, promiseFn) => { if (key) tasks.push(promiseFn(key).catch(() => [])); };

  if (sources.includes("jobs")) {
    add(decodeKey(process.env.JOBS_API_KEY || jobsSetting.serviceKey), async key => (await fetchJobPostings(key)) || []);
  }
  if (sources.includes("education")) {
    const training = [
      ["국민내일배움카드", decodeKey(education.serviceKey), "hr/callOpenApiSvcInfo310L01.do"],
      ["사업주훈련", decodeKey(work24.edu311), "hr/callOpenApiSvcInfo311L01.do"],
      ["일학습병행", decodeKey(work24.edu313), "hr/callOpenApiSvcInfo313L01.do"],
      ["국가인적자원개발 컨소시엄", decodeKey(work24.edu312), "hr/callOpenApiSvcInfo312L01.do"]
    ];
    for (const [label, key, path] of training) {
      add(key, async k => trainingItems(await fetchText(`${WORK24}/${path}?${trainingParams(k)}`), label));
    }
    add(decodeKey(work24.edu217), async k => {
      const params = new URLSearchParams({ authKey: k, returnType: "XML", startPage: "1", display: "10" });
      return programItems(await fetchText(`${WORK24}/wk/callOpenApiSvcInfo217L01.do?${params}`), "구직자 취업역량");
    });
  }
  if (sources.includes("job")) {
    add(decodeKey(work24.job212), async k => {
      const params = new URLSearchParams({
        authKey: k, returnType: "XML", target: "JOBCD", srchType: "K", keyword: question.slice(0, 30)
      });
      return occupationItems(await fetchText(`${WORK24}/wk/callOpenApiSvcInfo212L01.do?${params}`));
    });
  }

  const groups = await Promise.all(tasks);
  // 같은 항목이 두 번 잡히는 경우를 제거한다
  const seen = new Set();
  return groups.flat().filter(x => {
    const id = `${x.source}|${x.title}|${x.start}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, MAX_ITEMS);
}

// Claude 프롬프트에 넣는 공고 한 줄. 값이 없는 항목은 적지 않는다.
const lineOf = (x, i) => {
  const parts = [
    x.title,
    x.company,
    x.kind,
    x.region && `지역: ${x.region}`,
    x.employType && `고용형태: ${x.employType}`,
    x.endDate && `마감: ${x.endDate}`,
    x.start && x.end && `기간: ${x.start} ~ ${x.end}`
  ].filter(Boolean);
  return `[${i + 1}] (${x.source}) ${parts.join(" | ")}`;
};

// 답변의 [번호] 중 실제 목록 범위 안의 번호만 중복 없이 돌려준다
export function citedIndexes(answer, count) {
  const nums = [...String(answer || "").matchAll(/\[(\d+)\]/g)].map(m => Number(m[1]));
  return [...new Set(nums.filter(n => n >= 1 && n <= count))];
}

// 화면에 보여 줄 근거 항목 (원문 링크는 실제 공고 데이터에서 가져온다)
const toSource = x => ({
  title: x.title,
  source: x.source,
  company: x.company || "",
  region: x.region || "",
  employType: x.employType || "",
  endDate: x.end || "",
  url: x.url || ""
});

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

// 직전 대화(최대 3턴)를 정리한다. 클라이언트가 보낸 값이라 형식과 길이를 검사한다
const MAX_HISTORY = 6;
const MAX_HISTORY_TEXT = 300;
function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(h => h && (h.role === "user" || h.role === "assistant") && typeof h.text === "string")
    .map(h => ({ role: h.role, text: h.text.trim().slice(0, MAX_HISTORY_TEXT) }))
    .filter(h => h.text)
    .slice(-MAX_HISTORY);
}

async function askClaude({ aiKey, model, system, question, items, history = [], hint = "" }) {
  const past = history.length
    ? `이전 대화:\n${history.map(h => `${h.role === "user" ? "질문" : "답변"}: ${h.text}`).join("\n")}\n\n`
    : "";
  const ai = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      system: hint ? `${system}\n\n${hint}` : system,
      messages: [{
        role: "user",
        content: `${past}질문: ${question}\n\n근거 목록:\n${items.map(lineOf).join("\n")}`
      }]
    })
  });
  if (!ai.ok) throw new Error("claude-failed");
  const data = await ai.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  return {
    text: blocks.filter(c => c.type === "text").map(c => c.text).join("\n").trim(),
    diagnostics: {
      model,
      stopReason: data.stop_reason || "",
      blockTypes: [...new Set(blocks.map(c => c.type))],
      items: items.length
    }
  };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  // 관리자 화면의 연결 상태 점검: 키 값은 빼고 있는지 여부와 설정 요약만 돌려준다
  if (req.method === "GET") {
    const chat = await cachedSettings("chat");
    const posts = await cachedPublicPosts();
    return res.status(200).json({
      keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
      enabled: chat.enabled === true,
      model: MODELS.includes(chat.model) ? chat.model : DEFAULT_MODEL,
      sources: Array.isArray(chat.sources) ? chat.sources : DEFAULT_SOURCES,
      publicPosts: posts.length,
      checkedAt: new Date().toISOString()
    });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용합니다." });

  const question = (req.body && req.body.question) || "";
  if (typeof question !== "string" || !question.trim() || question.length > 200) {
    return res.status(400).json({ error: "질문은 1~200자로 입력해 주세요." });
  }
  const history = sanitizeHistory(req.body && req.body.history);
  // "그중 기간제는?"처럼 짧은 후속 질문은 직전 사용자 질문과 함께 찾아야 공고를 제대로 찾는다
  const lastUserQ = [...history].reverse().find(h => h.role === "user");
  const searchQ = lastUserQ ? `${lastUserQ.text} ${question}` : question;

  const settings = await cachedSettings("chat");
  const siteContext = buildSiteContext(await cachedPublicPosts());
  const aiKey = process.env.ANTHROPIC_API_KEY;
  // 꺼져 있거나 키가 없으면 화면이 기존 글 검색 답변으로 돌아간다
  if (settings.enabled !== true || !aiKey) {
    return res.status(503).json({ error: "AI 답변이 꺼져 있습니다.", disabled: true, fallback: true });
  }

  const model = MODELS.includes(settings.model) ? settings.model : DEFAULT_MODEL;
  const sources = Array.isArray(settings.sources) ? settings.sources : DEFAULT_SOURCES;
  const system = `${buildSystem(settings)}\n\n${siteContext}`;

  try {
    const [work24, education, jobsSetting] = await Promise.all([
      cachedSettings("work24"), cachedSettings("education"), cachedSettings("jobs")
    ]);

    let items;
    const cond = extractConditions(searchQ);
    if (cond.region || cond.employType) {
      // 지역이나 고용형태를 말했다면 공고 목록에서 먼저 조건을 확인한다
      if (!sources.includes("jobs")) {
        return res.status(422).json({ error: "공고 근거 데이터가 꺼져 있습니다.", fallback: true });
      }
      const key = decodeKey(process.env.JOBS_API_KEY || jobsSetting.serviceKey);
      if (!key) return res.status(503).json({ error: "공고 키가 없습니다.", fallback: true });
      const all = await fetchJobPostings(key);
      // 조회 자체가 실패한 것과 조회했지만 맞는 공고가 없는 것을 구분한다
      if (all === null) return res.status(502).json({ error: "공고 정보를 가져오지 못했습니다.", fallback: true });
      items = matchJobs(all, cond).slice(0, MAX_ITEMS);
      if (!items.length) {
        return res.status(200).json({ noMatch: true, answer: noMatchText(cond), sources: [] });
      }
    } else {
      items = await gatherItems(searchQ, sources, work24, education, jobsSetting);
    }

    const first = await askClaude({ aiKey, model, system, question, items, history });
    let answer = first.text;
    let diagnostics = first.diagnostics;
    let used = citedIndexes(answer, items.length);
    // 공고 근거가 있는데 번호가 없으면 번호를 붙이도록 한 번 더 요청한다
    if (answer && items.length && !used.length) {
      const second = await askClaude({ aiKey, model, system, question, items, history, hint: CITE_RETRY_HINT });
      answer = second.text;
      diagnostics = second.diagnostics;
      used = citedIndexes(answer, items.length);
    }
    // 빈 답만 실패로 본다. 번호가 없는 답은 사이트 안내나 일반 지식 답변일 수 있어 그대로 보여 준다
    if (!answer) {
      return res.status(422).json({ error: "AI 응답이 비어 있습니다.", fallback: true, diagnostics });
    }
    return res.status(200).json({
      answer,
      sources: used.map(n => toSource(items[n - 1])),
      uncited: items.length > 0 && used.length === 0,
      diagnostics
    });
  } catch (e) {
    return res.status(500).json({ error: "잠시 후 다시 시도해 주세요.", fallback: true });
  }
}
