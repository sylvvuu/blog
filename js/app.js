import { firebaseConfig } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, orderBy, query, doc, updateDoc, addDoc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = document.getElementById("app");
const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");
const db = isConfigured ? getFirestore(initializeApp(firebaseConfig)) : null;

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = ts => (ts && ts.toDate ? ts.toDate().toLocaleDateString("ko-KR") : "");

// GA4 이벤트 전송 (index.html / admin.html의 gtag가 로드된 경우에만)
function track(name, params = {}) {
  if (typeof window.gtag === "function") window.gtag("event", name, params);
}

// 같은 브라우저에서 중복 좋아요·스크랩을 막기 위한 로컬 상태
const memo = {
  get: (kind, id) => localStorage.getItem(`hrblog:${kind}:${id}`) === "1",
  set: (kind, id, on) => (on ? localStorage.setItem(`hrblog:${kind}:${id}`, "1") : localStorage.removeItem(`hrblog:${kind}:${id}`))
};

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

async function renderPost(posts, id) {
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

    <div class="actions">
      <button class="act" id="like-btn" aria-pressed="${memo.get("like", id)}">
        <span>좋아요</span> <strong id="like-count">${p.likes || 0}</strong>
      </button>
      <button class="act" id="scrap-btn" aria-pressed="${memo.get("scrap", id)}">
        <span>스크랩</span> <strong id="scrap-count">${p.scraps || 0}</strong>
      </button>
      <a class="act" href="#comments"><span>댓글</span> <strong id="comment-count">0</strong></a>
    </div>

    <section id="comments" class="comments">
      <h2>댓글</h2>
      <ul id="comment-list" class="comment-list"><li class="empty">불러오는 중...</li></ul>
      <form id="comment-form" class="comment-form">
        <input id="c-name" maxlength="20" placeholder="이름" required>
        <textarea id="c-text" maxlength="500" placeholder="댓글을 남겨 주세요 (최대 500자)" required></textarea>
        <button type="submit">댓글 등록</button>
        <p id="c-msg" class="msg"></p>
      </form>
    </section>
  </article>`;

  const ref = doc(db, "posts", id);
  const base = { post_id: id, post_title: p.title, category: p.category || "education" };

  // 좋아요: 누르면 +1, 다시 누르면 -1 (같은 브라우저 기준)
  document.getElementById("like-btn").addEventListener("click", async e => {
    const btn = e.currentTarget;
    const on = !memo.get("like", id);
    btn.disabled = true;
    try {
      await updateDoc(ref, { likes: increment(on ? 1 : -1) });
      memo.set("like", id, on);
      btn.setAttribute("aria-pressed", String(on));
      const c = document.getElementById("like-count");
      c.textContent = Math.max(0, Number(c.textContent) + (on ? 1 : -1));
      track(on ? "post_like" : "post_unlike", base);
    } finally { btn.disabled = false; }
  });

  // 스크랩: 누르면 +1, 다시 누르면 -1 (같은 브라우저 기준)
  document.getElementById("scrap-btn").addEventListener("click", async e => {
    const btn = e.currentTarget;
    const on = !memo.get("scrap", id);
    btn.disabled = true;
    try {
      await updateDoc(ref, { scraps: increment(on ? 1 : -1) });
      memo.set("scrap", id, on);
      btn.setAttribute("aria-pressed", String(on));
      const c = document.getElementById("scrap-count");
      c.textContent = Math.max(0, Number(c.textContent) + (on ? 1 : -1));
      track(on ? "post_scrap" : "post_unscrap", base);
    } finally { btn.disabled = false; }
  });

  await loadComments(id);

  document.getElementById("comment-form").addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("c-name").value.trim();
    const text = document.getElementById("c-text").value.trim();
    const msg = document.getElementById("c-msg");
    if (!name || !text) return;
    try {
      await addDoc(collection(db, "posts", id, "comments"), { name, text, createdAt: serverTimestamp() });
      document.getElementById("c-text").value = "";
      msg.textContent = "댓글이 등록되었습니다.";
      track("post_comment", { ...base, comment_length: text.length });
      await loadComments(id);
    } catch (err) {
      msg.textContent = "댓글 등록에 실패했습니다: " + err.message;
    }
  });
}

async function loadComments(postId) {
  const snap = await getDocs(query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc")));
  const list = snap.docs.map(d => d.data());
  document.getElementById("comment-count").textContent = list.length;
  document.getElementById("comment-list").innerHTML = list.length
    ? list.map(c => `<li><div class="c-head"><strong>${esc(c.name)}</strong> <time>${fmtDate(c.createdAt)}</time></div><p>${esc(c.text)}</p></li>`).join("")
    : `<li class="empty">첫 댓글을 남겨 주세요.</li>`;
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
    if (hash.startsWith("/post/")) return await renderPost(posts, decodeURIComponent(hash.slice(6)));
    if (hash === "/education") return renderList(posts.filter(p => p.category === "education"), "교육", "임직원 대상 교육 프로그램 안내");
    if (hash === "/recruit") return renderList(posts.filter(p => p.category === "recruit"), "채용 공고", "Sylvi 일렉트로닉 채용 공고");
    renderList(posts, "최신 글", "인사팀이 전하는 채용과 교육 소식");
  } catch (e) {
    app.innerHTML = `<div class="notice">글을 불러오지 못했습니다: ${esc(e.message)}</div>`;
  }
}

window.addEventListener("hashchange", route);
route();
