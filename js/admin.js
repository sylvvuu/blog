import { firebaseConfig, ADMIN_EMAIL, READ_ONLY_EMAILS, READ_ONLY_EXPIRES_AT } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, orderBy, query, where, documentId, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");
if (!isConfigured) {
  $("login-msg").textContent = "js/config.js에 Firebase 설정값을 먼저 입력해 주세요.";
  $("login-btn").disabled = true;
}
const fbApp = isConfigured ? initializeApp(firebaseConfig) : null;
const auth = isConfigured ? getAuth(fbApp) : null;
const db = isConfigured ? getFirestore(fbApp) : null;

let posts = [];

$("login-btn").addEventListener("click", async () => {
  $("login-msg").textContent = "";
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    $("login-msg").textContent = "로그인에 실패했습니다: " + e.message;
  }
});
// 이메일/비밀번호 로그인: 입력값은 Firebase에만 전달하고 저장하지 않는다
$("email-login-form").addEventListener("submit", async e => {
  e.preventDefault();
  $("login-msg").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-pw").value);
    $("login-pw").value = "";
  } catch (err) {
    $("login-pw").value = "";
    $("login-msg").textContent = "로그인에 실패했습니다. 이메일이나 비밀번호를 확인해 주세요.";
  }
});
$("logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if (!user) {
    $("login-view").hidden = false;
    $("admin-view").hidden = true;
    return;
  }
  const isExpired = READ_ONLY_EXPIRES_AT ? Date.now() >= Date.parse(READ_ONLY_EXPIRES_AT) : false;
  // 검사용 읽기 전용 계정은 테스트 이메일 계정일 수 있으므로 emailVerified를 강제하지 않는다
  const readOnly = !isExpired && READ_ONLY_EMAILS.includes(user.email);
  if (user.email !== ADMIN_EMAIL && !readOnly) {
    $("login-msg").textContent = isExpired && READ_ONLY_EMAILS.includes(user.email)
      ? `${user.email} 계정의 읽기 권한이 만료되었습니다.`
      : `${user.email} 계정은 관리자 권한이 없습니다.`;
    await signOut(auth);
    return;
  }
  $("login-view").hidden = true;
  $("admin-view").hidden = false;
  $("who").textContent = user.email + (readOnly ? " (읽기 전용)" : "");
  if (readOnly) {
    // 조회만 허용: 탭 전환을 제외한 입력과 버튼을 모두 막는다
    document.querySelectorAll("#admin-view button:not(.admin-tab), #admin-view input, #admin-view textarea, #admin-view select")
      .forEach(el => { el.disabled = true; });
  }
  await loadPosts();
});

// ---- 날씨 설정 (OpenWeather 키) ----
async function loadWeatherState() {
  const snap = await getDoc(doc(db, "settings", "weather"));
  const key = snap.exists() ? snap.data().kmaServiceKey : "";
  $("weather-state").textContent = key
    ? `저장됨: ••••${key.slice(-4)} (블로그 홈에 서울 실시간 날씨 표시 중)`
    : "저장된 키가 없습니다. 위젯이 숨겨진 상태입니다.";
}

$("owm-save").addEventListener("click", async () => {
  const key = $("owm-key").value.trim();
  if (key && key.length < 20) {
    $("owm-msg").textContent = "인증키가 너무 짧습니다. 공공데이터포털에서 복사한 일반 인증키를 넣으세요.";
    return;
  }
  try {
    await setDoc(doc(db, "settings", "weather"), { kmaServiceKey: key, updatedAt: serverTimestamp() }, { merge: true });
    $("owm-key").value = "";
    $("owm-msg").textContent = key ? "저장했습니다." : "키를 지웠습니다.";
    await loadWeatherState();
  } catch (e) {
    $("owm-msg").textContent = "저장에 실패했습니다: " + e.message;
  }
});

// ---- 채용정보 인증키 ----
async function loadJobsState() {
  const snap = await getDoc(doc(db, "settings", "jobs"));
  const key = snap.exists() ? snap.data().serviceKey : "";
  $("jobs-state").textContent = key
    ? `저장됨: ••••${key.slice(-4)} (홈의 채용·교육 목록에 사용 중)`
    : "저장된 키가 없습니다. 홈 목록이 숨겨진 상태입니다.";
}

async function loadEduState() {
  const snap = await getDoc(doc(db, "settings", "education"));
  const key = snap.exists() ? snap.data().serviceKey : "";
  $("edu-state").textContent = key
    ? `저장됨: ••••${key.slice(-4)} (홈의 교육 목록에 사용 중)`
    : "저장된 키가 없습니다. 홈 교육 목록이 숨겨진 상태입니다.";
}

$("edu-save").addEventListener("click", async () => {
  const key = $("edu-key").value.trim();
  if (key && key.length < 20) {
    $("edu-msg").textContent = "인증키가 너무 짧습니다. 교육 서비스 인증키를 넣으세요.";
    return;
  }
  try {
    await setDoc(doc(db, "settings", "education"), { serviceKey: key, updatedAt: serverTimestamp() }, { merge: true });
    $("edu-key").value = "";
    $("edu-msg").textContent = key ? "저장했습니다." : "키를 지웠습니다.";
    await loadEduState();
  } catch (e) {
    $("edu-msg").textContent = "저장에 실패했습니다: " + e.message;
  }
});

$("jobs-save").addEventListener("click", async () => {
  const key = $("jobs-key").value.trim();
  if (key && key.length < 20) {
    $("jobs-msg").textContent = "인증키가 너무 짧습니다. 고용24 Open-API 인증키를 넣으세요.";
    return;
  }
  try {
    await setDoc(doc(db, "settings", "jobs"), { serviceKey: key, updatedAt: serverTimestamp() }, { merge: true });
    $("jobs-key").value = "";
    $("jobs-msg").textContent = key ? "저장했습니다." : "키를 지웠습니다.";
    await loadJobsState();
  } catch (e) {
    $("jobs-msg").textContent = "저장에 실패했습니다: " + e.message;
  }
});

// ---- 고용24 추가 API 키 (settings/work24) ----
const WORK24_FIELDS = [
  ["edu311", "사업주훈련 311L01"],
  ["edu313", "일학습병행 313L01"],
  ["edu312", "국가인적자원개발 컨소시엄 312L01"],
  ["edu217", "구직자 취업역량 217L01"],
  ["job212", "직업정보 212L01"]
];

async function loadWork24State() {
  const snap = await getDoc(doc(db, "settings", "work24"));
  const data = snap.exists() ? snap.data() : {};
  $("work24-state").textContent = WORK24_FIELDS
    .map(([k, label]) => `${label}: ${data[k] ? `••••${data[k].slice(-4)}` : "없음"}`)
    .join(" / ");
}

$("work24-save").addEventListener("click", async () => {
  const payload = {};
  for (const [k] of WORK24_FIELDS) {
    const v = $(`k-${k}`).value.trim();
    if (!v) continue;
    if (v.length < 20) {
      $("work24-msg").textContent = "인증키가 너무 짧습니다. 입력한 키를 다시 확인하세요.";
      return;
    }
    payload[k] = v;
  }
  if (!Object.keys(payload).length) {
    $("work24-msg").textContent = "입력된 키가 없습니다. 저장할 키를 넣으세요.";
    return;
  }
  try {
    await setDoc(doc(db, "settings", "work24"), { ...payload, updatedAt: serverTimestamp() }, { merge: true });
    WORK24_FIELDS.forEach(([k]) => { $(`k-${k}`).value = ""; });
    $("work24-msg").textContent = "저장했습니다.";
    await loadWork24State();
  } catch (e) {
    $("work24-msg").textContent = "저장에 실패했습니다: " + e.message;
  }
});

// ---- AI 상담 설정 (settings/chat) ----
// ---- AI 멘토 설정 (프리셋, 프롬프트 섹션, 금지 규칙, FAQ, 테스트 채팅) ----
const CHAT_API = "https://sylvieee.vercel.app/api/chat";
const SEC_IDS = ["secRole", "secTasks", "secRules", "secExamples"];
const SEC_LABEL = { secRole: "역할 및 페르소나", secTasks: "핵심 업무", secRules: "응답 원칙", secExamples: "대화 흐름 예시" };
const CHAT_DEFAULT_SOURCES = ["jobs", "education", "job"];
const PRESETS = {
  job: {
    secRole: "당신은 SV Career의 전문 AI 채용 어시스턴트입니다. 구직자가 원하는 채용 공고를 쉽고 빠르게 찾고, 지원 과정의 궁금증을 해결할 수 있도록 친절하고 명확하게 안내하는 것이 목표입니다.",
    secTasks: "1. 맞춤 공고 추천: 사용자의 직무, 경력, 희망 근무지, 기술 스택을 파악하여 가장 적합한 공고를 추천합니다.\n2. 채용 절차 및 FAQ 안내: 서류 전형, 면접 방식, 복리후생, 지원서 수정 방법 등 자주 묻는 질문에 정확히 답변합니다.\n3. 지원 독려: 안내가 끝난 후에는 해당 공고의 지원 링크나 다음 행동을 자연스럽게 제안합니다.",
    secRules: "- 반드시 제공된 채용 공고 데이터와 FAQ 문서에 있는 내용만 바탕으로 답변합니다.\n- 데이터에 없는 연봉, 합격 기준, 미공개 채용 일정은 추측하지 않습니다. 모르는 내용은 \"해당 내용은 인사담당자 확인이 필요합니다. [문의하기 링크]를 이용해 주세요.\"라고 안내합니다.\n- 전문적이면서도 따뜻한 존댓말을 사용합니다.\n- 주민등록번호, 상세 주소 등 민감한 개인정보를 요구하지 않습니다.",
    secExamples: "- 구직자가 \"개발자 공고 있어?\"처럼 모호하게 물으면: \"어떤 개발 분야(프론트엔드, 백엔드, AI 등)와 경력 연차를 찾으시나요?\"라고 한 가지만 되묻습니다."
  },
  edu: {
    secRole: "당신은 SV Career의 교육 과정 안내 어시스턴트입니다. 임직원과 구직자가 자신에게 맞는 교육 과정을 쉽게 찾고 수강 조건을 이해할 수 있도록 안내합니다.",
    secTasks: "1. 과정 추천: 질문에 맞는 훈련 과정이나 구직자 프로그램을 추천합니다.\n2. 수강 안내: 훈련 기간, 모집 일정, 신청 방법을 데이터에 있는 범위에서 설명합니다.",
    secRules: "- 반드시 제공된 교육 과정 데이터와 FAQ 문서에 있는 내용만 바탕으로 답변합니다.\n- 데이터에 없는 지원금, 수료 기준, 모집 일정은 추측하지 않습니다. 모르는 내용은 \"해당 내용은 인사담당자 확인이 필요합니다. [문의하기 링크]를 이용해 주세요.\"라고 안내합니다.\n- 전문적이면서도 따뜻한 존댓말을 사용합니다.",
    secExamples: "- 질문이 모호하면 관심 분야와 희망 기간을 한 가지씩 물어봅니다."
  }
};
let chatSec = "secRole";
let chatPreset = "job";
let chatLast = null;

function setChatSec(id) {
  chatSec = id;
  document.querySelectorAll(".ai-sec").forEach(b => b.classList.toggle("on", b.dataset.sec === id));
  SEC_IDS.forEach(k => { $("sec-" + k).hidden = k !== id; });
  $("sec-title").textContent = SEC_LABEL[id];
  updateSecCount();
}
function updateSecCount() {
  $("sec-count").textContent = `${$("sec-" + chatSec).value.length.toLocaleString()} / 1,500자`;
}
function setChatPreset(name) {
  chatPreset = name;
  document.querySelectorAll(".ai-preset").forEach(b => b.classList.toggle("on", b.dataset.preset === name));
}
function fillSections(values) {
  SEC_IDS.forEach(k => { $("sec-" + k).value = values[k] || ""; });
  updateSecCount();
}

async function loadChatState() {
  const snap = await getDoc(doc(db, "settings", "chat"));
  const d = snap.exists() ? snap.data() : {};
  chatLast = d;
  $("chat-enabled").checked = d.enabled === true;
  $("chat-badge").textContent = d.enabled === true ? "켜짐" : "꺼짐";
  $("chat-badge").className = "ai-badge " + (d.enabled === true ? "on" : "off");
  $("chat-model").value = d.model || "claude-haiku-5-5";
  const sources = Array.isArray(d.sources) ? d.sources : CHAT_DEFAULT_SOURCES;
  document.querySelectorAll(".chat-source").forEach(c => { c.checked = sources.includes(c.value); });
  $("rule-salary").checked = d.noSalary !== false;
  $("rule-personal").checked = d.noPersonal !== false;
  $("rule-link").checked = d.noAutoLink === true;
  $("chat-length").value = d.answerLength || "normal";
  $("chat-faq").value = d.faq || "";
  $("chat-rules").value = d.extraRules || "";
  setChatPreset(d.preset || "job");
  const hasSections = SEC_IDS.some(k => d[k]);
  fillSections(hasSections ? d : PRESETS.job);
  setChatSec(chatSec);
  $("chat-state").textContent = d.enabled === true
    ? "AI 답변이 켜져 있습니다. 서버의 ANTHROPIC_API_KEY가 있어야 실제 답변이 나옵니다."
    : "AI 답변이 꺼져 있습니다. 홈 챗봇은 글 검색 답변을 씁니다.";
}

document.querySelectorAll(".ai-sec").forEach(b => b.addEventListener("click", () => setChatSec(b.dataset.sec)));
SEC_IDS.forEach(k => $("sec-" + k).addEventListener("input", updateSecCount));

document.querySelectorAll(".ai-preset").forEach(b => b.addEventListener("click", () => {
  const name = b.dataset.preset;
  if (name === "custom") { setChatPreset("custom"); return; }
  const current = SEC_IDS.some(k => $("sec-" + k).value.trim());
  if (current && !confirm("현재 프롬프트 내용을 이 프리셋으로 바꿀까요? 저장하기 전까지는 적용되지 않습니다.")) return;
  setChatPreset(name);
  fillSections(PRESETS[name]);
}));

$("sec-reset").addEventListener("click", () => {
  if (chatPreset === "custom") { $("chat-msg").textContent = "직접 작성 모드에서는 기본값이 없습니다. 프리셋을 고르세요."; return; }
  if (!confirm("이 항목을 프리셋 기본값으로 되돌릴까요?")) return;
  $(("sec-" + chatSec)).value = PRESETS[chatPreset][chatSec] || "";
  updateSecCount();
});

$("sec-prev").addEventListener("click", () => {
  const raw = chatLast && chatLast.prevSnapshot;
  if (!raw) { $("chat-msg").textContent = "이전 저장본이 없습니다."; return; }
  const prev = JSON.parse(raw);
  $("chat-enabled").checked = prev.enabled === true;
  $("chat-model").value = prev.model || "claude-haiku-5-5";
  $("chat-faq").value = prev.faq || "";
  $("chat-rules").value = prev.extraRules || "";
  $("rule-salary").checked = prev.noSalary !== false;
  $("rule-personal").checked = prev.noPersonal !== false;
  $("rule-link").checked = prev.noAutoLink === true;
  $("chat-length").value = prev.answerLength || "normal";
  fillSections(prev);
  $("chat-msg").textContent = "이전 저장본을 불러왔습니다. 저장을 눌러야 적용됩니다.";
});

$("chat-save").addEventListener("click", async () => {
  const sources = [...document.querySelectorAll(".chat-source")].filter(c => c.checked).map(c => c.value);
  const snapshot = chatLast ? { ...chatLast } : {};
  delete snapshot.updatedAt;
  delete snapshot.prevSnapshot;
  try {
    await setDoc(doc(db, "settings", "chat"), {
      enabled: $("chat-enabled").checked,
      model: $("chat-model").value,
      sources,
      extraRules: $("chat-rules").value.trim().slice(0, 1000),
      preset: chatPreset,
      secRole: $("sec-secRole").value.trim().slice(0, 1500),
      secTasks: $("sec-secTasks").value.trim().slice(0, 1500),
      secRules: $("sec-secRules").value.trim().slice(0, 1500),
      secExamples: $("sec-secExamples").value.trim().slice(0, 1500),
      noSalary: $("rule-salary").checked,
      noPersonal: $("rule-personal").checked,
      noAutoLink: $("rule-link").checked,
      answerLength: $("chat-length").value,
      faq: $("chat-faq").value.trim().slice(0, 3000),
      prevSnapshot: JSON.stringify(snapshot),
      updatedAt: serverTimestamp()
    }, { merge: true });
    $("chat-msg").textContent = "저장했습니다. 홈에서 새로고침하면 반영됩니다.";
    await loadChatState();
  } catch (e) {
    $("chat-msg").textContent = "저장에 실패했습니다: " + e.message;
  }
});

// 테스트 채팅: 저장된 설정으로 실제 API를 호출해 결과를 보여 준다
async function sendChatTest(text) {
  const q = text.trim();
  if (!q) return;
  const log = $("chat-test-log");
  log.insertAdjacentHTML("beforeend", `<div class="ai-msg me">${esc(q)}</div><div class="ai-msg bot" id="chat-wait">확인 중...</div>`);
  const t0 = performance.now();
  let html;
  try {
    const res = await fetch(CHAT_API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) });
    const data = await res.json().catch(() => ({}));
    const ms = Math.round(performance.now() - t0);
    const d = data.diagnostics;
    const diag = d ? `진단: 모델 ${esc(d.model || "-")} · 정지 이유 ${esc(d.stopReason || "-")} · 응답 블록 ${esc((d.blockTypes || []).join(", ") || "-")} · 공고 ${d.items ?? "-"}건` : "";
    if (res.ok && data.answer) {
      const basis = data.uncited
        ? "근거 번호 없음 (사이트 안내 또는 일반 지식 답변)"
        : `근거 ${(data.sources || []).length}건`;
      html = `${esc(data.answer)}<div class="ai-meta">${basis} · ${ms}ms</div>${diag ? `<div class="ai-meta">${diag}</div>` : ""}`;
    } else if (data.noMatch) {
      html = `${esc(data.answer)}<div class="ai-meta">조회 결과 없음 · ${ms}ms</div>`;
    } else {
      html = `<span class="ai-err">답변 실패 (${res.status}): ${esc(data.error || "원인을 확인하세요")}</span>${diag ? `<div class="ai-meta">${diag}</div>` : ""}<div class="ai-meta">홈 챗봇은 글 검색 답변으로 대신합니다</div>`;
    }
  } catch (e) {
    html = `<span class="ai-err">서버에 연결하지 못했습니다.</span>`;
  }
  const wait = document.getElementById("chat-wait");
  if (wait) { wait.removeAttribute("id"); wait.innerHTML = html; }
  log.scrollTop = log.scrollHeight;
}
$("chat-test-send").addEventListener("click", () => {
  const input = $("chat-test-q");
  sendChatTest(input.value);
  input.value = "";
});
$("chat-test-q").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); $("chat-test-send").click(); }
});
document.querySelectorAll(".ai-chip").forEach(b => b.addEventListener("click", () => sendChatTest(b.dataset.q)));

// 연결 상태 점검: 서버 키 존재 여부(값은 표시하지 않음), 사용 여부, 공개 글 수를 보여 준다
const statusItem = (label, value, ok) =>
  `<span>${esc(label)} <b class="${ok === undefined ? "" : ok ? "ai-status-ok" : "ai-status-bad"}">${esc(value)}</b></span>`;
async function renderChatStatus() {
  const box = $("chat-status");
  box.textContent = "연결 상태 확인 중...";
  try {
    const res = await fetch(CHAT_API, { method: "GET", cache: "no-store" });
    const s = await res.json();
    if (!res.ok) throw new Error(String(res.status));
    const time = new Date(s.checkedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    box.innerHTML = [
      statusItem("서버 키", s.keyConfigured ? "있음" : "없음", s.keyConfigured),
      statusItem("AI 답변", s.enabled ? "켜짐" : "꺼짐", s.enabled),
      statusItem("모델", s.model),
      statusItem("근거 데이터", (s.sources || []).length + "종"),
      statusItem("공개 글", s.publicPosts + "개"),
      statusItem("확인", time)
    ].join("");
  } catch (e) {
    box.innerHTML = `<span class="ai-status-bad">연결 상태를 가져오지 못했습니다 (${esc(e.message)})</span>`;
  }
}
$("chat-status-refresh").addEventListener("click", renderChatStatus);
renderChatStatus();

async function loadPosts() {
  loadChatState().catch(() => { $("chat-state").textContent = "AI 설정을 불러오지 못했습니다."; });
  loadWork24State().catch(() => { $("work24-state").textContent = "추가 키 설정을 불러오지 못했습니다."; });
  loadJobsState().catch(() => { $("jobs-state").textContent = "채용정보 설정을 불러오지 못했습니다."; });
  loadEduState().catch(() => { $("edu-state").textContent = "교육정보 설정을 불러오지 못했습니다."; });
  loadWeatherState().catch(() => { $("weather-state").textContent = "날씨 설정을 불러오지 못했습니다."; });
  loadInquiries().catch(() => { $("inq-msg").textContent = "문의 목록을 불러오지 못했습니다."; });
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // 공개 설정이 없던 기존 글은 공개로 한 번 정리 (공개 목록 조회에 필요)
  for (const p of posts.filter(x => !x.visibility)) {
    await updateDoc(doc(db, "posts", p.id), { visibility: "public" });
    p.visibility = "public";
  }
  renderList();
  loadGa();
  loadViews(currentViewDays).catch(() => { $("views-msg").textContent = "조회수를 불러오지 못했습니다."; });
}

// ---------- GA4 방문자·공고 클릭 (api/analytics.js, 관리자 ID 토큰으로 호출) ----------
const ANALYTICS_API = "https://sylvieee.vercel.app/api/analytics";
async function loadGa() {
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${ANALYTICS_API}?days=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("ga");
    const d = await res.json();
    const today = dayKey(new Date());
    const valueOf = arr => ((arr || []).find(x => x.date === today) || { value: 0 }).value;
    $("ga-visitors").textContent = valueOf(d.visitors).toLocaleString("ko-KR");
    $("ga-clicks").textContent = valueOf(d.clicks).toLocaleString("ko-KR");
  } catch (err) {
    $("ga-visitors").textContent = "연결 전";
    $("ga-clicks").textContent = "연결 전";
  }
}

// ---------- 조회수 ----------
let currentViewDays = 7;
let viewsChart = null;
const dayKey = d => d.toLocaleDateString("sv-SE");

async function loadViews(days) {
  currentViewDays = days;
  document.querySelectorAll(".views-range").forEach(b => b.classList.toggle("ghost", Number(b.dataset.days) !== days));
  $("views-msg").textContent = "불러오는 중...";
  const snap = await getDocs(collection(db, "posts"));
  const rows = snap.docs.map(d => ({ id: d.id, title: d.data().title || "(제목 없음)", views: d.data().views || 0, visibility: d.data().visibility || "public" }));
  // 선택한 기간의 날짜 문서만 읽는다 (문서 이름이 YYYY-MM-DD라서 시작 날짜 이후만 고른다)
  const startDate = new Date(); startDate.setDate(startDate.getDate() - (days - 1));
  const startKey = dayKey(startDate);
  const dailyByPost = await Promise.all(rows.map(r =>
    getDocs(query(collection(db, "posts", r.id, "daily"), where(documentId(), ">=", startKey)))
      .then(s => s.docs.map(x => ({ day: x.id, count: x.data().count || 0 })))
  ));
  const byDay = {};
  dailyByPost.flat().forEach(x => { byDay[x.day] = (byDay[x.day] || 0) + x.count; });

  const labels = [], values = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    labels.push(k.slice(5)); values.push(byDay[k] || 0);
  }
  const total = rows.reduce((s, r) => s + r.views, 0);
  const today = byDay[dayKey(new Date())] || 0;
  const period = values.reduce((s, v) => s + v, 0);
  $("views-total").textContent = total.toLocaleString("ko-KR");
  $("views-today").textContent = today.toLocaleString("ko-KR");
  $("views-period").textContent = period.toLocaleString("ko-KR");

  // 나만보기 글은 TOP 5에서 뺀다
  $("views-top").innerHTML = rows.filter(r => r.views > 0 && r.visibility !== "private").sort((a, b) => b.views - a.views).slice(0, 5)
    .map(r => `<li><span>${esc(r.title)}</span><b>${r.views.toLocaleString("ko-KR")}</b></li>`).join("")
    || `<li class="msg">아직 집계된 조회수가 없습니다.</li>`;

  $("views-daily").innerHTML = labels.map((l, i) => `<tr><td>${esc(l)}</td><td>${values[i].toLocaleString("ko-KR")}</td></tr>`).reverse().join("")
    || `<tr><td colspan="2">기간 내 열람 기록이 없습니다.</td></tr>`;

  if (!window.Chart) { $("views-msg").textContent = "차트 라이브러리를 불러오지 못했습니다."; return; }
  $("views-msg").textContent = "";
  if (viewsChart) viewsChart.destroy();
  viewsChart = new Chart($("views-chart"), {
    type: "bar",
    data: { labels, datasets: [{ label: "조회수", data: values, backgroundColor: "#60a5fa", borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

document.querySelectorAll(".views-range").forEach(btn => {
  btn.addEventListener("click", () => {
    loadViews(Number(btn.dataset.days)).catch(() => { $("views-msg").textContent = "조회수를 불러오지 못했습니다."; });
  });
});

function renderList() {
  $("post-list").innerHTML = posts.length
    ? posts.map(p => `<li><button data-id="${esc(p.id)}" class="link">${esc(p.title)}</button>
        ${p.visibility === "private" ? ' <span class="tag">나만보기</span>' : ""}</li>`).join("")
    : `<li class="empty">등록된 글이 없습니다.</li>`;
}

$("post-list").addEventListener("click", e => {
  const id = e.target.dataset.id;
  if (!id) return;
  const p = posts.find(x => x.id === id);
  if (p) fillForm(p);
});

// 본문에 붙여넣은 이미지: { id, data(JPEG data URL) }, 본문에는 [[img:id]] 로 표시
let bodyImages = [];
const MAX_IMAGE_BYTES = 900000; // Firestore 문서 한도(1MiB) 안에 맞추기 위한 여유

function renderThumbs() {
  const box = $("body-images");
  box.innerHTML = bodyImages.map(im => `<div class="thumb"><img src="${im.data}" alt=""><button type="button" data-id="${im.id}">삭제</button></div>`).join("");
  const total = bodyImages.reduce((n, im) => n + im.data.length, 0);
  box.insertAdjacentHTML("beforeend", bodyImages.length ? `<p class="msg">이미지 ${bodyImages.length}장 · 약 ${Math.round(total / 1024)}KB</p>` : "");
  box.querySelectorAll("button[data-id]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.id;
    bodyImages = bodyImages.filter(im => im.id !== id);
    const ta = $("f-body");
    ta.value = ta.value.replace(new RegExp(`\\n?\\[\\[img:${id}\\]\\]\\n?`, "g"), "\n");
    renderThumbs();
  }));
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1000 / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지를 읽을 수 없습니다.")); };
    img.src = url;
  });
}

$("f-body").addEventListener("paste", async e => {
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith("image/"));
  if (!item) return; // 글자만 붙여넣을 때는 기본 동작 그대로
  e.preventDefault();
  const ta = e.target;
  try {
    const data = await compressImage(item.getAsFile());
    const id = "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    bodyImages.push({ id, data });
    const marker = `\n[[img:${id}]]\n`;
    const s = ta.selectionStart, en = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + marker + ta.value.slice(en);
    ta.selectionStart = ta.selectionEnd = s + marker.length;
    renderThumbs();
    $("form-msg").textContent = "이미지가 본문에 추가되었습니다.";
  } catch (err) {
    $("form-msg").textContent = "이미지 추가 실패: " + err.message;
  }
});

function fillForm(p = {}) {
  // 새 글 작성은 없다. 글 목록에서 고른 글만 편집 칸에 열린다.
  $("editor").hidden = !p.id;
  bodyImages = Array.isArray(p.images) ? p.images.map(im => ({ id: im.id, data: im.data })) : [];
  renderThumbs();
  $("f-id").value = p.id || "";
  $("f-visibility").value = p.visibility || "public";
  $("f-title").value = p.title || "";
  $("f-summary").value = p.summary || "";
  $("f-body").value = p.body || "";
  $("delete-btn").hidden = !p.id;
  $("form-msg").textContent = "";
}

function safeHttps(u) {
  return /^https:\/\//i.test(u) ? u : "";
}


$("post-form").addEventListener("submit", async e => {
  e.preventDefault();
  const imageBytes = bodyImages.reduce((n, im) => n + im.data.length, 0);
  if (imageBytes > MAX_IMAGE_BYTES) {
    $("form-msg").textContent = "이미지 용량이 너무 큽니다. 이미지를 줄여 주세요.";
    return;
  }
  const data = {
    images: bodyImages.map(im => ({ id: im.id, data: im.data })),
    visibility: $("f-visibility").value === "private" ? "private" : "public",
    title: $("f-title").value.trim(),
    summary: $("f-summary").value.trim(),
    body: $("f-body").value
  };
  const id = $("f-id").value;
  if (!id) {
    $("form-msg").textContent = "글 목록에서 수정할 글을 고르세요.";
    return;
  }
  try {
    await updateDoc(doc(db, "posts", id), data);
    $("form-msg").textContent = "저장되었습니다.";
    await loadPosts();
    fillForm({});
  } catch (err) {
    $("form-msg").textContent = "저장 실패: " + err.message;
  }
});

$("delete-btn").addEventListener("click", async () => {
  const id = $("f-id").value;
  if (!id || !confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) return;
  await deleteDoc(doc(db, "posts", id));
  await loadPosts();
  fillForm({});
});


// ---- 문의 관리 (답변 저장, 1년 지난 문의 정리) ----
const INQ_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
let inquiries = [];
let openInquiry = null;
const inqTime = q => (q.createdAt && q.createdAt.toMillis ? q.createdAt.toMillis() : 0);
const inqLast = q => (q.repliedAt && q.repliedAt.toMillis ? q.repliedAt.toMillis() : inqTime(q));

async function loadInquiries() {
  const snap = await getDocs(query(collection(db, "inquiries"), orderBy("createdAt", "desc")));
  inquiries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  $("inq-msg").textContent = `문의 ${inquiries.length}건`;
  $("inq-list").innerHTML = inquiries.map((q, i) => {
    const date = q.createdAt && q.createdAt.toDate ? q.createdAt.toDate().toLocaleDateString("ko-KR") : "";
    return `<tr data-i="${i}" style="cursor:pointer;"><td>${date}</td><td>${esc(q.category || "기타")}</td><td>${esc(q.title || "(제목 없음)")}</td><td>${esc(q.name || "")}</td><td>${q.isPublic === true ? "공개" : "비공개"}</td><td>${q.reply ? "답변 완료" : "대기"}</td></tr>`;
  }).join("") || `<tr><td colspan="6">문의가 없습니다.</td></tr>`;
}

$("inq-list").addEventListener("click", e => {
  const tr = e.target.closest("tr[data-i]");
  if (!tr) return;
  openInquiry = inquiries[Number(tr.dataset.i)];
  const q = openInquiry;
  const date = q.createdAt && q.createdAt.toDate ? q.createdAt.toDate().toLocaleString("ko-KR") : "";
  $("inq-detail").hidden = false;
  $("inq-d-title").textContent = q.title || "(제목 없음)";
  $("inq-d-meta").textContent = `${q.name || ""} · ${date} · ${q.isPublic === true ? "공개" : "비공개"}`;
  $("inq-d-msg").textContent = q.message || "";
  $("inq-reply").value = q.reply || "";
  $("inq-d-out").textContent = "";
});

$("inq-save").addEventListener("click", async () => {
  if (!openInquiry) return;
  const reply = $("inq-reply").value.trim();
  if (!reply) { $("inq-d-out").textContent = "답변 내용을 입력해 주세요."; return; }
  try {
    await updateDoc(doc(db, "inquiries", openInquiry.id), {
      reply: reply.slice(0, 2000),
      repliedAt: serverTimestamp(),
      status: "완료"
    });
    $("inq-d-out").textContent = "답변을 저장했습니다.";
    await loadInquiries();
  } catch (e) {
    $("inq-d-out").textContent = "저장에 실패했습니다: " + e.message;
  }
});

$("inq-cleanup").addEventListener("click", async () => {
  const cutoff = Date.now() - INQ_YEAR_MS;
  const targets = inquiries.filter(q => inqLast(q) > 0 && inqLast(q) < cutoff);
  if (!targets.length) { $("inq-msg").textContent = "1년이 지난 문의가 없습니다."; return; }
  if (!confirm(`1년이 지난 문의 ${targets.length}건을 삭제합니다. 삭제한 문의는 되돌릴 수 없습니다. 계속할까요?`)) return;
  try {
    for (const q of targets) await deleteDoc(doc(db, "inquiries", q.id));
    $("inq-msg").textContent = `${targets.length}건을 삭제했습니다.`;
    openInquiry = null;
    $("inq-detail").hidden = true;
    await loadInquiries();
  } catch (e) {
    $("inq-msg").textContent = "정리에 실패했습니다: " + e.message;
  }
});

// ---- 관리 메뉴 탭: 한 번에 한 화면만 보여 준다 (AI 멘토가 첫 화면) ----
document.querySelectorAll(".admin-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.tab;
    document.querySelectorAll(".admin-tab").forEach(b => b.classList.toggle("on", b === btn));
    document.querySelectorAll(".tab-panel").forEach(p => { p.hidden = p.dataset.panel !== name; });
  });
});
