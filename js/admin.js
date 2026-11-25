import { firebaseConfig, ADMIN_EMAIL } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
$("logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if (!user) {
    $("login-view").hidden = false;
    $("admin-view").hidden = true;
    return;
  }
  if (user.email !== ADMIN_EMAIL) {
    $("login-msg").textContent = `${user.email} 계정은 관리자 권한이 없습니다.`;
    await signOut(auth);
    return;
  }
  $("login-view").hidden = true;
  $("admin-view").hidden = false;
  $("who").textContent = user.email;
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
async function loadChatState() {
  const snap = await getDoc(doc(db, "settings", "chat"));
  const d = snap.exists() ? snap.data() : {};
  $("chat-enabled").checked = d.enabled === true;
  $("chat-model").value = d.model || "claude-haiku-5-5";
  const sources = Array.isArray(d.sources) ? d.sources : ["jobs", "education", "job"];
  document.querySelectorAll(".chat-source").forEach(c => { c.checked = sources.includes(c.value); });
  $("chat-rules").value = d.extraRules || "";
  $("chat-state").textContent = d.enabled === true
    ? "AI 답변이 켜져 있습니다. 서버의 ANTHROPIC_API_KEY가 있어야 실제 답변이 나옵니다."
    : "AI 답변이 꺼져 있습니다. 홈 챗봇은 글 검색 답변을 씁니다.";
}

$("chat-save").addEventListener("click", async () => {
  const sources = [...document.querySelectorAll(".chat-source")].filter(c => c.checked).map(c => c.value);
  try {
    await setDoc(doc(db, "settings", "chat"), {
      enabled: $("chat-enabled").checked,
      model: $("chat-model").value,
      sources,
      extraRules: $("chat-rules").value.trim().slice(0, 1000),
      updatedAt: serverTimestamp()
    }, { merge: true });
    $("chat-msg").textContent = "저장했습니다. 홈에서 새로고침하면 반영됩니다.";
    await loadChatState();
  } catch (e) {
    $("chat-msg").textContent = "저장에 실패했습니다: " + e.message;
  }
});

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
  $("inq-d-meta").textContent = `${q.name || ""} · ${q.email || ""} · ${date} · ${q.isPublic === true ? "공개" : "비공개"}`;
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
