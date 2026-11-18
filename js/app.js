import { firebaseConfig } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = document.getElementById("app");
const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");
const db = isConfigured ? getFirestore(initializeApp(firebaseConfig)) : null;

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = ts => (ts && ts.toDate ? ts.toDate().toLocaleDateString("ko-KR") : "");

let cache = null;
async function loadPosts() {
  if (cache) return cache;
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return cache;
}

function badgeOf(p) {
  return p.category === "recruit" ? (p.jobType || "채용") : "교육";
}

function card(p) {
  return `<a class="card" href="#/post/${esc(p.id)}">
    <span class="badge">${esc(badgeOf(p))}</span>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.summary)}</p>
    <time>${fmtDate(p.createdAt)}</time>
  </a>`;
}

function renderList(posts, title, desc) {
  const list = posts.length
    ? `<div class="grid">${posts.map(card).join("")}</div>`
    : `<p class="empty">등록된 글이 없습니다.</p>`;
  app.innerHTML = `<section class="hero"><h1>${esc(title)}</h1><p>${esc(desc)}</p></section>${list}`;
}

function renderPost(posts, id) {
  const p = posts.find(x => x.id === id);
  if (!p) {
    app.innerHTML = `<p class="empty">글을 찾을 수 없습니다. <a href="#/">홈으로</a></p>`;
    return;
  }
  const meta = p.category === "recruit"
    ? `<dl class="meta">
        <dt>구분</dt><dd>${esc(p.jobType || "-")}</dd>
        <dt>근무지</dt><dd>${esc(p.location || "-")}</dd>
        <dt>마감</dt><dd>${esc(p.deadline || "-")}</dd>
      </dl>`
    : "";
  const paras = String(p.body || "").split(/\n\s*\n/).map(t => `<p>${esc(t).replace(/\n/g, "<br>")}</p>`).join("");
  app.innerHTML = `<article class="post">
    <a class="back" href="#/">&larr; 목록으로</a>
    <span class="badge">${esc(badgeOf(p))}</span>
    <h1>${esc(p.title)}</h1>
    <time>${fmtDate(p.createdAt)}</time>
    ${meta}
    <div class="body">${paras}</div>
  </article>`;
}

async function route() {
  if (!isConfigured) {
    app.innerHTML = `<div class="notice">Firebase 설정이 필요합니다. js/config.js의 값을 입력해 주세요.</div>`;
    return;
  }
  const hash = location.hash.replace(/^#/, "") || "/";
  app.innerHTML = `<p class="loading">불러오는 중...</p>`;
  try {
    const posts = await loadPosts();
    if (hash.startsWith("/post/")) return renderPost(posts, decodeURIComponent(hash.slice(6)));
    if (hash === "/education") return renderList(posts.filter(p => p.category === "education"), "교육", "임직원 대상 교육 프로그램 안내");
    if (hash === "/recruit") return renderList(posts.filter(p => p.category === "recruit"), "채용 공고", "Sylvi 일렉트로닉 채용 공고");
    renderList(posts, "최신 글", "인사팀이 전하는 채용과 교육 소식");
  } catch (e) {
    app.innerHTML = `<div class="notice">글을 불러오지 못했습니다: ${esc(e.message)}</div>`;
  }
}

window.addEventListener("hashchange", route);
route();
