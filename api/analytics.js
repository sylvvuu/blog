// Vercel 서버 함수: 관리자만 GA4 일간 방문자(activeUsers)와 공고 클릭(job_item_click)을 읽는다.
// 키 없이 동작한다. Vercel OIDC 토큰 → Google Workload Identity Federation → ga-reader 서비스 계정 가장(impersonation) → GA4 Data API.
// 필요한 환경 변수(Vercel Production):
//   GA_PROPERTY_ID, GCP_PROJECT_NUMBER, GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_PROVIDER_ID,
//   GCP_SERVICE_ACCOUNT_EMAIL, FIREBASE_API_KEY(웹 API 키, 공개값), ADMIN_EMAIL(선택, 기본은 관리자 계정)
// 요청: GET /api/analytics?days=7, Authorization: Bearer <Firebase ID 토큰>

const ALLOWED_ORIGINS = ["https://sylvvuu.github.io", "https://sylvieee.vercel.app"];
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "fkdna3@gmail.com";

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Vary", "Origin");
}

// Firebase ID 토큰이 관리자 계정의 것인지 확인한다 (인증 서버의 accounts:lookup 사용)
async function isAdmin(idToken) {
  const key = process.env.FIREBASE_API_KEY;
  if (!key || !idToken) return false;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  if (!r.ok) return false;
  const j = await r.json();
  const u = j.users && j.users[0];
  return !!u && u.email === ADMIN_EMAIL && u.emailVerified === true;
}

// Vercel OIDC 토큰을 Google 임시 토큰으로 바꾸고, ga-reader 계정 권한의 GA4 읽기 토큰을 받는다
async function googleAccessToken(oidcToken) {
  const { GCP_PROJECT_NUMBER, GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_PROVIDER_ID, GCP_SERVICE_ACCOUNT_EMAIL } = process.env;
  const audience = `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_PROVIDER_ID}`;
  const sts = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience,
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
      subjectToken: oidcToken
    })
  });
  if (!sts.ok) throw new Error("sts");
  const { access_token: federated } = await sts.json();
  const imp = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${federated}` },
    body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/analytics.readonly"] })
  });
  if (!imp.ok) throw new Error("impersonate");
  return (await imp.json()).accessToken;
}

async function runReport(token, propertyId, body) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("ga");
  return r.json();
}

// GA 날짜 형식 20261124 → 2026-11-24
const fmtDate = v => `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
const toSeries = r => (r.rows || []).map(x => ({ date: fmtDate(x.dimensionValues[0].value), value: Number(x.metricValues[0].value) }));

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "방식 오류" });

  const days = Math.min(30, Math.max(1, Number(req.query && req.query.days) || 7));
  const env = process.env;
  const configured = env.GA_PROPERTY_ID && env.GCP_PROJECT_NUMBER && env.GCP_WORKLOAD_IDENTITY_POOL_ID
    && env.GCP_WORKLOAD_IDENTITY_PROVIDER_ID && env.GCP_SERVICE_ACCOUNT_EMAIL;
  const oidc = req.headers["x-vercel-oidc-token"];
  if (!configured || !oidc) return res.status(503).json({ disabled: true, error: "GA4 연결 설정이 없습니다." });

  const idToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    if (!(await isAdmin(idToken))) return res.status(403).json({ error: "관리자만 볼 수 있습니다." });
    const token = await googleAccessToken(oidc);
    const dateRanges = [{ startDate: `${days - 1}daysAgo`, endDate: "today" }];
    const [visitors, clicks] = await Promise.all([
      runReport(token, env.GA_PROPERTY_ID, {
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }]
      }),
      runReport(token, env.GA_PROPERTY_ID, {
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { value: "job_item_click" } } }
      })
    ]);
    return res.status(200).json({ visitors: toSeries(visitors), clicks: toSeries(clicks) });
  } catch (e) {
    return res.status(502).json({ error: "GA4 정보를 가져오지 못했습니다.", fallback: true });
  }
}
