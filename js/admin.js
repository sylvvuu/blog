import { firebaseConfig, ADMIN_EMAIL } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, orderBy, query, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

async function loadPosts() {
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // 공개 설정이 없던 기존 글은 공개로 한 번 정리 (공개 목록 조회에 필요)
  for (const p of posts.filter(x => !x.visibility)) {
    await updateDoc(doc(db, "posts", p.id), { visibility: "public" });
    p.visibility = "public";
  }
  $("seed-btn").hidden = posts.length > 0;
  renderList();
}

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

function fillForm(p = {}) {
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
  const data = {
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
