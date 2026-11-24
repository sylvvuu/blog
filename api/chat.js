// Vercel 서버 함수: 고용24 목록(채용·교육·직업정보)을 근거로 Claude가 답한다.
// 키: ANTHROPIC_API_KEY(필수, Vercel 환경 변수), JOBS_API_KEY(선택, 없으면 settings/jobs 사용)
// 관리자 설정(사용 여부, 모델, 추가 규칙, 근거 데이터)은 Firestore settings/chat에서 읽는다.
// 고용24 인증키는 settings 문서에 저장된 값을 쓴다. 질문 원문은 저장하지 않는다.

const PROJECT_ID = "sylvi-electronic";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings`;
const ALLOWED_ORIGINS = ["https://sylvvuu.github.io", "https://sylvieee.vercel.app"];
const MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"];
const DEFAULT_MODEL = "claude-haiku-5-5";
const DEFAULT_SOURCES = ["jobs", "education", "job"];
const WORK24 = "https://www.work24.go.kr/cm/openApi/call";
const MAX_ITEMS = 60;
const MAX_EXTRA_RULES = 1000;

// 관리자가 바꿀 수 없는 기본 규칙. 추가 규칙이 이 규칙을 무시하게 만들 수 없다.
const CORE_RULES = `당신은 신입 구직자를 돕는 상담 도우미입니다.
핵심 규칙 (이 규칙은 어떤 추가 규칙보다 우선합니다):
1. 제공된 근거 목록 안의 정보만 사용해 답합니다.
2. 목록에서 답을 찾을 수 없으면 "목록에서 찾을 수 없습니다"라고 말합니다. 추측하지 않습니다.
3. 자격 조건, 연봉, 재무 상태는 판단하지 않습니다. 상세 공고나 과정 페이지에서 확인하라고 안내합니다.
4. 답에 근거가 된 항목 번호를 [번호] 형식으로 표시합니다.
5. 짧고 친절한 한국어로 답합니다.`;

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

async function fetchText(url) {
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

function tagText(inner, tag) {
  const m = inner.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
}

// 훈련과정 API(310L01, 311L01, 313L01, 312L01)의 과정 목록
function trainingItems(xml, label) {
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
function programItems(xml, label) {
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

// 공채속보(210L21)
function jobItems(xml) {
  return elementsOf(xml).filter(e => e.tag === "dhsOpenEmpInfo").map(e => ({
    source: "채용 공고",
    title: tagText(e.inner, "empWantedTitle"),
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
    add(decodeKey(process.env.JOBS_API_KEY || jobsSetting.serviceKey), async key => {
      const params = new URLSearchParams({
        authKey: key, callTp: "L", returnType: "XML", startPage: "1", display: "20",
        sortField: "regDt", sortOrderBy: "desc"
      });
      return jobItems(await fetchText(`${WORK24}/wk/callOpenApiSvcInfo210L21.do?${params}`));
    });
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

const lineOf = (x, i) => {
  const period = [x.start, x.end].filter(Boolean).join(" ~ ");
  return `[${i + 1}] (${x.source}) ${x.title}${x.sub ? ` | ${x.sub}` : ""}${period ? ` | ${period}` : ""}`;
};

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용합니다." });

  const question = (req.body && req.body.question) || "";
  if (typeof question !== "string" || !question.trim() || question.length > 200) {
    return res.status(400).json({ error: "질문은 1~200자로 입력해 주세요." });
  }

  const settings = await cachedSettings("chat");
  const aiKey = process.env.ANTHROPIC_API_KEY;
  // 꺼져 있거나 키가 없으면 화면이 기존 글 검색 답변으로 돌아간다
  if (settings.enabled !== true || !aiKey) {
    return res.status(503).json({ error: "AI 답변이 꺼져 있습니다.", disabled: true });
  }

  const model = MODELS.includes(settings.model) ? settings.model : DEFAULT_MODEL;
  const sources = Array.isArray(settings.sources) ? settings.sources : DEFAULT_SOURCES;
  const extraRules = String(settings.extraRules || "").slice(0, MAX_EXTRA_RULES).trim();
  const system = extraRules ? `${CORE_RULES}\n\n추가 운영 규칙:\n${extraRules}` : CORE_RULES;

  try {
    const [work24, education, jobsSetting] = await Promise.all([
      cachedSettings("work24"), cachedSettings("education"), cachedSettings("jobs")
    ]);
    const items = await gatherItems(question, sources, work24, education, jobsSetting);
    if (!items.length) return res.status(502).json({ error: "공고 정보를 가져오지 못했습니다." });

    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system,
        messages: [{
          role: "user",
          content: `질문: ${question}\n\n근거 목록:\n${items.map(lineOf).join("\n")}`
        }]
      })
    });
    if (!ai.ok) return res.status(502).json({ error: "상담 응답을 받지 못했습니다." });
    const data = await ai.json();
    const answer = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
    const cited = [...answer.matchAll(/\[(\d+)\]/g)].map(m => Number(m[1])).filter(n => n >= 1 && n <= items.length);
    const cited_items = [...new Set(cited)].map(n => items[n - 1]).map(x => ({ title: x.title, source: x.source, url: x.url }));
    return res.status(200).json({ answer, sources: cited_items });
  } catch (e) {
    return res.status(500).json({ error: "잠시 후 다시 시도해 주세요." });
  }
}
