import { firebaseConfig, ADMIN_EMAIL } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, orderBy, query, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { SEED_POSTS } from "./seed.js";

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

// ---- 공공취업정보 인증키 ----
async function loadJobsState() {
  const snap = await getDoc(doc(db, "settings", "jobs"));
  const key = snap.exists() ? snap.data().serviceKey : "";
  $("jobs-state").textContent = key
    ? `저장됨: ••••${key.slice(-4)} (홈 맨 아래 공공취업정보 표시 대상)`
    : "저장된 키가 없습니다. 홈 목록이 숨겨진 상태입니다.";
}

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

// ---- 명언 관리 ----
async function loadQuotes() {
  const snap = await getDocs(query(collection(db, "quotes"), orderBy("createdAt", "desc")));
  $("quote-list").innerHTML = snap.size
    ? snap.docs.map(d => {
        const q = d.data();
        return `<li><span>${esc(q.text)}${q.author ? ` — ${esc(q.author)}` : ""}</span> <button type="button" class="danger" data-del="${esc(d.id)}">삭제</button></li>`;
      }).join("")
    : '<li class="msg">등록된 명언이 없습니다.</li>';
}

$("quote-add").addEventListener("click", async () => {
  const text = $("quote-text").value.trim();
  const author = $("quote-author").value.trim();
  if (!text) return ($("quote-msg").textContent = "명언을 입력하세요.");
  if (text.length > 200) return ($("quote-msg").textContent = "명언은 200자 이하로 입력하세요.");
  try {
    await addDoc(collection(db, "quotes"), { text, author, createdAt: serverTimestamp() });
    $("quote-text").value = "";
    $("quote-author").value = "";
    $("quote-msg").textContent = "추가했습니다.";
    await loadQuotes();
  } catch (e) {
    $("quote-msg").textContent = "추가에 실패했습니다: " + e.message;
  }
});

$("quote-list").addEventListener("click", async (e) => {
  const id = e.target.dataset.del;
  if (!id || !confirm("이 명언을 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "quotes", id));
    await loadQuotes();
  } catch (err) {
    $("quote-msg").textContent = "삭제에 실패했습니다: " + err.message;
  }
});

async function loadPosts() {
  loadQuotes().catch(() => { $("quote-msg").textContent = "명언 목록을 불러오지 못했습니다."; });
  loadJobsState().catch(() => { $("jobs-state").textContent = "채용정보 설정을 불러오지 못했습니다."; });
  loadWeatherState().catch(() => { $("weather-state").textContent = "날씨 설정을 불러오지 못했습니다."; });
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // 공개 설정이 없던 기존 글은 공개로 한 번 정리 (공개 목록 조회에 필요)
  for (const p of posts.filter(x => !x.visibility)) {
    await updateDoc(doc(db, "posts", p.id), { visibility: "public" });
    p.visibility = "public";
  }
  $("seed-btn").hidden = posts.length > 0;
  renderList();
  loadViews(currentViewDays).catch(() => { $("views-msg").textContent = "조회수를 불러오지 못했습니다."; });
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
  const rows = snap.docs.map(d => ({ id: d.id, title: d.data().title || "(제목 없음)", views: d.data().views || 0 }));
  // 글마다 날짜별 조회수를 모은다 (최근 30일까지 계산해 두고 기간별로 잘라 쓴다)
  const dailyByPost = await Promise.all(rows.map(r =>
    getDocs(collection(db, "posts", r.id, "daily")).then(s => s.docs.map(x => ({ day: x.id, count: x.data().count || 0 })))
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

  $("views-top").innerHTML = rows.filter(r => r.views > 0).sort((a, b) => b.views - a.views).slice(0, 5)
    .map(r => `<li><span>${esc(r.title)}</span><b>${r.views.toLocaleString("ko-KR")}</b></li>`).join("")
    || `<li class="msg">아직 집계된 조회수가 없습니다.</li>`;

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
        <span class="tag">${p.category === "recruit" ? esc(p.jobType || "채용") : "교육"}</span>${p.visibility === "private" ? ' <span class="tag">나만보기</span>' : ""}</li>`).join("")
    : `<li class="empty">등록된 글이 없습니다.</li>`;
}

$("post-list").addEventListener("click", e => {
  const id = e.target.dataset.id;
  if (!id) return;
  const p = posts.find(x => x.id === id);
  if (p) fillForm(p);
});

function syncJobType() {
  $("job-fields").hidden = $("f-category").value !== "recruit";
}
$("f-category").addEventListener("change", syncJobType);

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
  bodyImages = Array.isArray(p.images) ? p.images.map(im => ({ id: im.id, data: im.data })) : [];
  renderThumbs();
  $("f-id").value = p.id || "";
  $("f-visibility").value = p.visibility || "public";
  $("f-category").value = p.category || "education";
  $("f-jobType").value = p.jobType || "신입공채";
  $("f-title").value = p.title || "";
  $("f-summary").value = p.summary || "";
  $("f-location").value = p.location || "";
  $("f-deadline").value = p.deadline || "";
  $("f-applyUrl").value = p.applyUrl || "";
  $("f-image").value = p.image || "";
  $("f-imageUrl").value = p.imageUrl || "";
  $("f-imageCredit").value = p.imageCredit || "";
  $("f-body").value = p.body || "";
  $("delete-btn").hidden = !p.id;
  $("form-title").textContent = p.id ? "글 수정" : "새 글 작성";
  $("form-msg").textContent = "";
  syncJobType();
}

function safeHttps(u) {
  return /^https:\/\//i.test(u) ? u : "";
}

$("new-btn").addEventListener("click", () => fillForm({}));

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
    category: $("f-category").value,
    jobType: $("f-category").value === "recruit" ? $("f-jobType").value : null,
    title: $("f-title").value.trim(),
    summary: $("f-summary").value.trim(),
    location: $("f-location").value.trim(),
    deadline: $("f-deadline").value.trim(),
    applyUrl: $("f-applyUrl").value.trim(),
    image: $("f-image").value || null,
    imageUrl: safeHttps($("f-imageUrl").value.trim()),
    imageCredit: $("f-imageCredit").value.trim(),
    body: $("f-body").value
  };
  const id = $("f-id").value;
  try {
    if (id) {
      await updateDoc(doc(db, "posts", id), data);
    } else {
      await addDoc(collection(db, "posts"), { ...data, createdAt: serverTimestamp() });
    }
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

$("seed-btn").addEventListener("click", async () => {
  if (!confirm("샘플 글 " + SEED_POSTS.length + "개를 등록할까요?")) return;
  for (const p of SEED_POSTS) {
    await addDoc(collection(db, "posts"), { ...p, createdAt: serverTimestamp() });
  }
  await loadPosts();
});

syncJobType();
