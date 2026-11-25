// Vercel 서버 함수: 고용24 공채속보(210L21) 최신 목록을 서버에서 가져와 JSON으로 돌려준다.
// 브라우저가 고용24를 직접 호출하면 사파리(아이폰)에서 응답을 읽지 못하므로, 호출을 서버로 옮겼다.
// 키: JOBS_API_KEY(Vercel 환경 변수, 있으면 우선) 또는 Firestore settings/jobs의 serviceKey.
// 응답: { items: [{ title, company, kind, endDate, url }] }

import { fetchJobPostings } from "./chat.js";

const PROJECT_ID = "sylvi-electronic";
const FS_DOC = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/jobs`;
const ALLOWED_ORIGINS = ["https://sylvvuu.github.io", "https://sylvieee.vercel.app"];
const MAX_DISPLAY = 20;

const decodeKey = k => {
  if (!k) return "";
  try { return decodeURIComponent(k); } catch (e) { return k; }
};

// 환경 변수가 없으면 관리자가 저장한 settings/jobs 문서에서 키를 읽는다
async function jobsKey() {
  if (process.env.JOBS_API_KEY) return decodeKey(process.env.JOBS_API_KEY);
  try {
    const res = await fetch(FS_DOC);
    if (!res.ok) return "";
    const doc = await res.json();
    return decodeKey(doc.fields?.serviceKey?.stringValue || "");
  } catch (e) {
    return "";
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

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET만 허용합니다." });

  const key = await jobsKey();
  if (!key) return res.status(503).json({ error: "공고 키가 없습니다.", disabled: true });

  const all = await fetchJobPostings(key);
  // null은 조회 실패, 배열은 조회 성공(빈 배열 포함)
  if (all === null) return res.status(502).json({ error: "공고 정보를 가져오지 못했습니다." });

  const display = Math.min(Number(req.query?.display) || MAX_DISPLAY, MAX_DISPLAY);
  const items = all.slice(0, display).map(j => ({
    title: j.title,
    company: j.company,
    kind: j.kind,
    endDate: j.end,
    url: j.url
  }));
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({ items });
}
