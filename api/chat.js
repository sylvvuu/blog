// Vercel 서버 함수: 고용24 공고 목록을 근거로 AI가 답한다.
// 키는 환경 변수에만 둔다. JOBS_API_KEY(고용24 채용정보), ANTHROPIC_API_KEY(AI 모델).
// 질문 원문은 저장하지 않는다.
const JOBS_API = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L21.do";
const MODEL = "claude-haiku-5-5";

const SYSTEM = `당신은 신입 구직자를 돕는 상담 도우미입니다.
규칙:
1. 제공된 공고 목록 안의 정보만 근거로 답합니다.
2. 목록에서 답을 찾을 수 없으면 "목록에서 찾을 수 없습니다"라고 말합니다. 추측하지 않습니다.
3. 자격 조건, 연봉, 재무 상태는 판단하지 않습니다. 상세 공고에서 확인하라고 안내합니다.
4. 답에 근거가 된 공고 번호를 [번호] 형식으로 표시합니다.
5. 짧고 친절한 한국어로 답합니다.`;

function parseJobs(xml) {
  const blocks = xml.match(/<dhsOpenEmpInfo>[\s\S]*?<\/dhsOpenEmpInfo>/g) || [];
  const get = (b, tag) => {
    const m = b.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
  };
  return blocks.map(b => ({
    title: get(b, "empWantedTitle"),
    company: get(b, "empBusiNm"),
    kind: get(b, "coClcdNm"),
    endDate: get(b, "empWantedEndt"),
    url: /^https?:\/\//.test(get(b, "empWantedHomepgDetail")) ? get(b, "empWantedHomepgDetail") : ""
  })).filter(j => j.title);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 허용합니다." });
  const question = (req.body && req.body.question) || "";
  if (typeof question !== "string" || !question.trim() || question.length > 200) {
    return res.status(400).json({ error: "질문은 1~200자로 입력해 주세요." });
  }
  const jobsKey = process.env.JOBS_API_KEY;
  const aiKey = process.env.ANTHROPIC_API_KEY;
  if (!jobsKey || !aiKey) return res.status(503).json({ error: "상담 기능을 준비 중입니다." });

  try {
    const params = new URLSearchParams({
      authKey: jobsKey, callTp: "L", returnType: "XML", startPage: "1", display: "20",
      sortField: "regDt", sortOrderBy: "desc"
    });
    const xml = await (await fetch(`${JOBS_API}?${params}`)).text();
    const jobs = parseJobs(xml);
    if (!jobs.length) return res.status(502).json({ error: "공고 정보를 가져오지 못했습니다." });

    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: `질문: ${question}\n\n공고 목록(번호순, JSON):\n${JSON.stringify(jobs.map((j, i) => ({ no: i + 1, ...j })))}`
        }]
      })
    });
    if (!ai.ok) return res.status(502).json({ error: "상담 응답을 받지 못했습니다." });
    const data = await ai.json();
    const answer = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
    const cited = [...answer.matchAll(/\[(\d+)\]/g)].map(m => Number(m[1]))
      .filter(n => n >= 1 && n <= jobs.length);
    const sources = [...new Set(cited)].map(n => jobs[n - 1]);
    return res.status(200).json({ answer, sources });
  } catch (e) {
    return res.status(500).json({ error: "잠시 후 다시 시도해 주세요." });
  }
}
