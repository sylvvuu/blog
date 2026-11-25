// Vercel 서버 함수: 고용24 교육 과정(훈련 4종 + 구직자 취업역량)을 서버에서 가져와 JSON으로 돌려준다.
// 브라우저가 고용24를 직접 호출하면 아이폰 사파리에서 응답을 읽지 못하므로 호출을 서버로 옮겼다.
// 키: settings/education.serviceKey(국민내일배움카드), settings/work24의 edu311·edu313·edu312·edu217.
// 응답: { items: [{ source, title, sub, start, end, url }] } (시작일 순서)

import { trainingItems, programItems } from "./chat.js";

// 고용24 한 곳이 느려도 전체 목록이 늦지 않도록 호출마다 시간 제한을 둔다
const SOURCE_TIMEOUT_MS = 4000;

async function fetchTextWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok ? await res.text() : "";
  } catch (e) {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

const PROJECT_ID = "sylvi-electronic";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings`;
const WORK24 = "https://www.work24.go.kr/cm/openApi/call";
const ALLOWED_ORIGINS = ["https://sylvvuu.github.io", "https://sylvieee.vercel.app"];

const decodeKey = k => {
  if (!k) return "";
  try { return decodeURIComponent(k); } catch (e) { return k; }
};

// settings 문서를 문자열 필드만 골라 읽는다. 문서가 없으면 빈 객체다.
async function readSettings(name) {
  try {
    const res = await fetch(`${FS_BASE}/${name}`);
    if (!res.ok) return {};
    const doc = await res.json();
    const out = {};
    for (const [k, v] of Object.entries(doc.fields || {})) {
      if ("stringValue" in v) out[k] = v.stringValue;
    }
    return out;
  } catch (e) {
    return {};
  }
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

// 훈련과정 API는 오늘부터 석 달 안에 시작하는 과정을 달라고 요청한다
function trainingParams(key) {
  const today = new Date();
  const end = new Date(today);
  end.setMonth(end.getMonth() + 3);
  const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return new URLSearchParams({
    authKey: key, returnType: "XML", outType: "1", pageNum: "1", pageSize: "5",
    srchTraStDt: ymd(today), srchTraEndDt: ymd(end), sort: "ASC", sortCol: "2"
  });
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET만 허용합니다." });

  const [edu, work24] = await Promise.all([readSettings("education"), readSettings("work24")]);
  const sources = [
    { label: "국민내일배움카드", key: decodeKey(edu.serviceKey), path: "hr/callOpenApiSvcInfo310L01.do", kind: "training" },
    { label: "사업주훈련", key: decodeKey(work24.edu311), path: "hr/callOpenApiSvcInfo311L01.do", kind: "training" },
    { label: "일학습병행", key: decodeKey(work24.edu313), path: "hr/callOpenApiSvcInfo313L01.do", kind: "training" },
    { label: "국가인적자원개발 컨소시엄", key: decodeKey(work24.edu312), path: "hr/callOpenApiSvcInfo312L01.do", kind: "training" },
    { label: "구직자 취업역량", key: decodeKey(work24.edu217), path: "wk/callOpenApiSvcInfo217L01.do", kind: "program" }
  ];

  // 키가 없거나 호출이 실패한 API는 건너뛰고, 나머지를 합친다
  const groups = await Promise.all(sources.filter(s => s.key).map(async s => {
    try {
      const params = s.kind === "training"
        ? trainingParams(s.key)
        : new URLSearchParams({ authKey: s.key, returnType: "XML", startPage: "1", display: "5" });
      const xml = await fetchTextWithTimeout(`${WORK24}/${s.path}?${params.toString()}`);
      if (!xml) return [];
      return s.kind === "training" ? trainingItems(xml, s.label) : programItems(xml, s.label);
    } catch (e) {
      return [];
    }
  }));

  const startKey = d => String(d || "").replace(/\D/g, "") || "99999999";
  const items = groups.flat().sort((a, b) => startKey(a.start).localeCompare(startKey(b.start)));
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({ items });
}
