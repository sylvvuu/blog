import { firebaseConfig } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, getDocs, getDoc, setDoc, deleteDoc, addDoc, updateDoc, doc,
  query, orderBy, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = document.getElementById("app");
const authBtn = document.getElementById("auth-btn");
const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");
const fbApp = isConfigured ? initializeApp(firebaseConfig) : null;
const db = fbApp ? getFirestore(fbApp) : null;
const auth = fbApp ? getAuth(fbApp) : null;
let user = null;

const COLUMNS = {
  education: { title: "교육", desc: "임직원의 업무 역량을 키우는 교육 프로그램을 안내합니다. 실무 중심으로 진행하며 본사와 지점 모두 참여할 수 있습니다." },
  recruit: { title: "채용 공고", desc: "SY Electronics와 함께할 인재를 찾습니다. 신입공채와 경력직 채용 공고를 확인해 보세요." },
  inquiry: { title: "문의하기", desc: "채용이나 교육에 관해 궁금한 점을 남겨 주세요. 로그인 후 문의를 남기면 인사팀이 확인합니다." }
};

// 글에 쓰는 그림 (직접 그린 SVG, 외부 이미지 없음)
const ART = {
  ai: '<svg viewBox="0 0 160 110" role="img" aria-label="AI 칩"><rect x="50" y="26" width="60" height="58" rx="8" fill="#1f4e79"/><rect x="63" y="39" width="34" height="32" rx="4" fill="#dbe8f5"/><circle cx="80" cy="55" r="6" fill="#4a90c2"/><path d="M36 40h14M36 55h14M36 70h14M110 40h14M110 55h14M110 70h14" stroke="#1f4e79" stroke-width="4" stroke-linecap="round"/></svg>',
  ax: '<svg viewBox="0 0 160 110" role="img" aria-label="업무 혁신 톱니바퀴"><circle cx="62" cy="55" r="26" fill="none" stroke="#1f4e79" stroke-width="10" stroke-dasharray="8 6"/><circle cx="62" cy="55" r="14" fill="#1f4e79"/><circle cx="110" cy="50" r="18" fill="none" stroke="#4a90c2" stroke-width="8" stroke-dasharray="6 5"/><circle cx="110" cy="50" r="8" fill="#4a90c2"/></svg>',
  recruit: '<svg viewBox="0 0 160 110" role="img" aria-label="팀"><circle cx="58" cy="38" r="12" fill="#1f4e79"/><path d="M38 92c0-22 40-22 40 0z" fill="#1f4e79"/><circle cx="102" cy="38" r="12" fill="#4a90c2"/><path d="M82 92c0-22 40-22 40 0z" fill="#4a90c2"/></svg>',
  career: '<svg viewBox="0 0 160 110" role="img" aria-label="서류 가방"><path d="M62 38V28h36v10" fill="none" stroke="#1f4e79" stroke-width="6"/><rect x="42" y="38" width="76" height="54" rx="6" fill="#1f4e79"/><rect x="42" y="62" width="76" height="4" fill="#dbe8f5"/><rect x="72" y="56" width="16" height="12" rx="2" fill="#dbe8f5"/></svg>',
  education: '<svg viewBox="0 0 160 110" role="img" aria-label="책"><path d="M28 34h52v54H28z" fill="#dbe8f5"/><path d="M80 34h52v54H80z" fill="#4a90c2"/><path d="M80 34v54" stroke="#1f4e79" stroke-width="2"/><path d="M38 50h30M38 62h24M92 50h30M92 62h24" stroke="#1f4e79" stroke-width="3" stroke-linecap="round"/></svg>',
  inquiry: '<svg viewBox="0 0 160 110" role="img" aria-label="대화"><rect x="36" y="28" width="88" height="48" rx="12" fill="#1f4e79"/><path d="M58 76l-8 16 24-16z" fill="#1f4e79"/><rect x="58" y="44" width="44" height="5" rx="2" fill="#dbe8f5"/><rect x="58" y="56" width="28" height="5" rx="2" fill="#dbe8f5"/></svg>'
};
const HEART = '<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.6 2.6 5 6.2 5c2 0 3.5 1.1 4.3 2.5h3C14.3 6.1 15.8 5 17.8 5c3.6 0 5.3 3.6 3.8 6.8C19.5 16.4 12 21 12 21z"/></svg>';
const BOOK = '<svg class="book" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = ts => (ts && ts.toDate ? ts.toDate().toLocaleDateString("ko-KR") : "");
const artOf = p => ART[p.image] || ART[p.category === "recruit" ? "recruit" : "education"];

// GA4 이벤트 전송 (index.html의 gtag가 로드된 경우)
function track(name, params = {}) {
  if (typeof window.gtag === "function") window.gtag("event", name, params);
}

function statusOf(p) {
  const d = Date.parse(p.deadline);
  if (!isNaN(d) && d < Date.now() - 86400000) return "마감";
  return "접수중";
}

function safeUrl(u = "") {
  return /^https?:\/\//i.test(u) ? u : "";
}

let cache = null;
async function loadPosts() {
  if (cache) return cache;
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return cache;
}

async function signIn() {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    console.error("로그인 실패", e);
  }
}

// ---------- 목록 화면 ----------

function featuredCard(p) {
  return `<a class="feature" href="#/post/${esc(p.id)}">
    <div class="art">${artOf(p)}</div>
    ${p.category === "recruit" ? `<span class="pill ${statusOf(p) === "접수중" ? "open" : "closed"}">${statusOf(p)}</span>` : ""}
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.summary)}</p>
    <time>${fmtDate(p.createdAt)}</time>
  </a>`;
}

function columnBlock(key, list) {
  const c = COLUMNS[key];
  const feat = list[0];
  return `<section class="col col-${key}">
    <header class="col-head">
      <h2>${esc(c.title)}</h2>
      <p>${esc(c.desc)}</p>
      <a class="more" href="#/${key}">전체 보기 (${list.length}) &rarr;</a>
    </header>
    ${feat ? featuredCard(feat) : `<p class="empty">등록된 글이 없습니다.</p>`}
  </section>`;
}

function renderHome(posts) {
  const edu = posts.filter(p => p.category === "education");
  const rec = posts.filter(p => p.category === "recruit");
  app.innerHTML = `<div class="columns">
    ${columnBlock("education", edu)}
    ${columnBlock("recruit", rec)}
    <section class="col col-inquiry">
      <header class="col-head">
        <h2>${esc(COLUMNS.inquiry.title)}</h2>
        <p>${esc(COLUMNS.inquiry.desc)}</p>
        <a class="more" href="#/inquiry">문의 작성하기 &rarr;</a>
      </header>
      <div class="art">${ART.inquiry}</div>
    </section>
  </div>`;
}

function renderList(key, posts) {
  const c = COLUMNS[key];
  const list = posts.filter(p => p.category === key);
  const body = list.length
    ? `<div class="grid">${list.map(p => `<a class="card" href="#/post/${esc(p.id)}">
        <div class="thumb">${artOf(p)}</div>
        ${p.category === "recruit" ? `<span class="badge">${esc(p.jobType || "채용")}</span>` : `<span class="badge">교육</span>`}
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.summary)}</p>
        <time>${fmtDate(p.createdAt)}</time>
      </a>`).join("")}</div>`
    : `<p class="empty">등록된 글이 없습니다.</p>`;
  app.innerHTML = `<section class="hero"><h1>${esc(c.title)}</h1><p>${esc(c.desc)}</p></section>${body}`;
}

// ---------- 글 상세 ----------

function heartPop(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.className = "pop";
    s.innerHTML = HEART;
    s.style.left = (r.left + r.width / 2 - 10 + (i - 1) * 12) + "px";
    s.style.top = (r.top - 4) + "px";
    s.style.setProperty("--dx", ((i - 1) * 18 + (Math.random() * 10 - 5)) + "px");
    s.style.setProperty("--r", ((i - 1) * 15) + "deg");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

async function renderPost(posts, id) {
  const p = posts.find(x => x.id === id);
  if (!p) {
    app.innerHTML = `<p class="empty">글을 찾을 수 없습니다. <a href="#/">홈으로</a></p>`;
    return;
  }
  const base = { post_id: id, post_title: p.title, category: p.category };
  const isRec = p.category === "recruit";
  const st = isRec ? statusOf(p) : "";
  const isNew = isRec && p.jobType === "신입공채";
  const applyBtn = !isRec ? "" : isNew
    ? `<button class="btn primary" id="apply-open" type="button">지원하기</button>`
    : (safeUrl(p.applyUrl)
      ? `<a class="btn primary" href="${esc(safeUrl(p.applyUrl))}" target="_blank" rel="noopener" id="apply-btn">지원하기</a>`
      : `<span class="btn muted">지원 방법은 인사팀 문의</span>`);
  // 신입 지원: 이름과 전화번호만 입력
  const applyPanel = isNew ? `<section id="apply-box" class="apply-box" hidden>
      <h2>신입 지원</h2>
      <p class="who">이름과 전화번호만 남기면 지원이 접수됩니다.</p>
      <form id="apply-form" class="comment-form">
        <input id="ap-name" maxlength="20" placeholder="이름" required>
        <input id="ap-phone" type="tel" maxlength="20" placeholder="전화번호 (예: 010-1234-5678)" required>
        <button type="submit">지원 완료하기</button>
        <p class="msg" id="ap-msg"></p>
      </form>
    </section>` : "";
  const paras = String(p.body || "").split(/\n\s*\n/).map(t => `<p>${esc(t).replace(/\n/g, "<br>")}</p>`).join("");

  app.innerHTML = `<article class="post">
    <a class="back" href="#/${p.category}">&larr; ${esc(COLUMNS[p.category].title)} 목록</a>
    <div class="post-art">${artOf(p)}</div>
    <div class="job-head"><div>
      ${isRec ? `<span class="pill ${st === "접수중" ? "open" : "closed"}">${st}</span>` : `<span class="badge">교육</span>`}
      <h1>${esc(p.title)}</h1>
      ${isRec ? `<p class="job-sub"><span class="badge">${esc(p.jobType || "채용")}</span> ${esc(p.location || "")}</p>` : ""}
      ${isRec && p.deadline ? `<p class="job-period">마감 ${esc(p.deadline)}</p>` : ""}
      ${!isRec ? `<time>${fmtDate(p.createdAt)}</time>` : ""}
    </div>
    <div class="job-actions">${applyBtn}</div></div>
    ${applyPanel}
    <div class="body">${paras}</div>

    <div class="actions">
      <button class="act" id="like-btn" aria-pressed="false">${HEART}<span>좋아요</span> <strong id="like-count">0</strong></button>
      <button class="act" id="scrap-btn" aria-pressed="false">${BOOK}<span>스크랩</span> <strong id="scrap-count">0</strong></button>
      <button class="act" id="share-btn">공유하기</button>
    </div>
    <p class="msg" id="action-msg"></p>

    <section id="comments" class="comments">
      <h2>댓글 <span id="comment-count">0</span></h2>
      <ul id="comment-list" class="comment-list"><li class="empty">불러오는 중...</li></ul>
      <div id="comment-box"></div>
    </section>

    <div class="bottom-nav"><a class="btn ghost" href="#/${p.category}">목록으로</a></div>
  </article>`;

  track("post_view", base);

  // 내 상태 확인 (로그인한 경우에만)
  let liked = false, scraped = false, likeCount = p.likes || 0, scrapCount = p.scraps || 0;
  if (user) {
    const [l, s] = await Promise.all([
      getDoc(doc(db, "posts", id, "likes", user.uid)),
      getDoc(doc(db, "users", user.uid, "scraps", id))
    ]);
    liked = l.exists();
    scraped = s.exists();
  }

  const likeBtn = document.getElementById("like-btn");
  const scrapBtn = document.getElementById("scrap-btn");
  const actionMsg = document.getElementById("action-msg");

  function paint() {
    likeBtn.setAttribute("aria-pressed", String(liked));
    scrapBtn.setAttribute("aria-pressed", String(scraped));
    document.getElementById("like-count").textContent = likeCount;
    document.getElementById("scrap-count").textContent = scrapCount;
  }
  paint();

  // 좋아요: 로그인 필요, 누를 때 하트 효과
  likeBtn.onclick = async () => {
    if (!user) return signIn();
    likeBtn.disabled = true;
    const on = !liked;
    try {
      const ref = doc(db, "posts", id, "likes", user.uid);
      if (on) await setDoc(ref, { at: serverTimestamp() });
      else await deleteDoc(ref);
      await updateDoc(doc(db, "posts", id), { likes: increment(on ? 1 : -1) });
      liked = on;
      likeCount = Math.max(0, likeCount + (on ? 1 : -1));
      paint();
      if (on) heartPop(likeBtn);
      track(on ? "post_like" : "post_unlike", base);
    } catch (e) {
      actionMsg.textContent = "좋아요 처리에 실패했습니다: " + e.message;
    } finally {
      likeBtn.disabled = false;
    }
  };

  // 스크랩: 로그인(구글 계정 인증) 후 내 계정에 저장
  scrapBtn.onclick = async () => {
    if (!user) return signIn();
    scrapBtn.disabled = true;
    const on = !scraped;
    try {
      const ref = doc(db, "users", user.uid, "scraps", id);
      if (on) await setDoc(ref, { title: p.title, at: serverTimestamp() });
      else await deleteDoc(ref);
      await updateDoc(doc(db, "posts", id), { scraps: increment(on ? 1 : -1) });
      scraped = on;
      scrapCount = Math.max(0, scrapCount + (on ? 1 : -1));
      paint();
      actionMsg.textContent = on ? "내 계정에 스크랩했습니다." : "스크랩을 취소했습니다.";
      track(on ? "post_scrap" : "post_unscrap", base);
    } catch (e) {
      actionMsg.textContent = "스크랩 처리에 실패했습니다: " + e.message;
    } finally {
      scrapBtn.disabled = false;
    }
  };

  // 공유하기: 현재 주소 공유 또는 복사
  document.getElementById("share-btn").onclick = async () => {
    const link = location.href.split("#")[0] + "#/post/" + id;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url: link });
      else await navigator.clipboard.writeText(link);
      actionMsg.textContent = "공유 링크를 준비했습니다.";
    } catch (e) {
      actionMsg.textContent = "공유에 실패했습니다. 주소창의 주소를 직접 복사해 주세요.";
    }
    track("post_share", base);
  };

  document.getElementById("apply-btn")?.addEventListener("click", () => track("post_apply", base));

  const applyOpen = document.getElementById("apply-open");
  if (applyOpen) {
    applyOpen.onclick = () => {
      const box = document.getElementById("apply-box");
      box.hidden = false;
      box.scrollIntoView({ behavior: "smooth" });
      track("post_apply", base);
    };
    document.getElementById("apply-form").onsubmit = async e => {
      e.preventDefault();
      const out = document.getElementById("ap-msg");
      const name = document.getElementById("ap-name").value.trim().slice(0, 20);
      const phone = document.getElementById("ap-phone").value.trim();
      if (!/^[0-9+\-\s]{9,20}$/.test(phone)) {
        out.textContent = "전화번호 형식을 확인해 주세요. 숫자와 하이픈만 입력할 수 있습니다.";
        return;
      }
      try {
        await addDoc(collection(db, "applications"), {
          postId: id,
          postTitle: p.title,
          name,
          phone,
          createdAt: serverTimestamp()
        });
        e.target.reset();
        out.textContent = "지원이 접수되었습니다. 감사합니다.";
        track("post_apply_submit", base);
      } catch (err) {
        out.textContent = "지원 접수에 실패했습니다: " + err.message;
      }
    };
  }

  // 댓글: 로그인 필요
  async function loadComments() {
    const snap = await getDocs(query(collection(db, "posts", id, "comments"), orderBy("createdAt", "asc")));
    const list = snap.docs.map(d => d.data());
    document.getElementById("comment-count").textContent = list.length;
    document.getElementById("comment-list").innerHTML = list.length
      ? list.map(c => `<li><div class="c-head"><strong>${esc(c.name)}</strong> <time>${fmtDate(c.createdAt)}</time></div><p>${esc(c.text)}</p></li>`).join("")
      : `<li class="empty">첫 댓글을 남겨 주세요.</li>`;
  }
  await loadComments();

  const box = document.getElementById("comment-box");
  if (!user) {
    box.innerHTML = `<div class="login-box"><p>댓글은 Google 로그인 후 남길 수 있습니다.</p><button class="btn primary" id="comment-login">Google 로그인</button></div>`;
    document.getElementById("comment-login").onclick = signIn;
  } else {
    box.innerHTML = `<form id="comment-form" class="comment-form">
      <p class="who">${esc(user.displayName || user.email)} 님으로 작성</p>
      <textarea id="c-text" maxlength="500" placeholder="댓글을 남겨 주세요 (최대 500자)" required></textarea>
      <button type="submit">댓글 등록</button>
      <p class="msg" id="c-msg"></p>
    </form>`;
    document.getElementById("comment-form").onsubmit = async e => {
      e.preventDefault();
      const text = document.getElementById("c-text").value.trim();
      if (!text) return;
      try {
        await addDoc(collection(db, "posts", id, "comments"), {
          uid: user.uid,
          name: String(user.displayName || user.email || "사용자").slice(0, 20),
          text,
          createdAt: serverTimestamp()
        });
        document.getElementById("c-text").value = "";
        document.getElementById("c-msg").textContent = "댓글이 등록되었습니다.";
        track("post_comment", { ...base, comment_length: text.length });
        await loadComments();
      } catch (err) {
        document.getElementById("c-msg").textContent = "댓글 등록에 실패했습니다: " + err.message;
      }
    };
  }
}

// ---------- 문의하기 ----------

function renderInquiry() {
  const body = user
    ? `<form id="inq-form" class="comment-form">
        <p class="who">${esc(user.email)} 계정으로 문의합니다.</p>
        <input id="q-name" maxlength="20" value="${esc(user.displayName || "")}" placeholder="이름" required>
        <textarea id="q-msg" maxlength="1000" placeholder="문의 내용 (최대 1000자)" required></textarea>
        <button type="submit">문의 보내기</button>
        <p class="msg" id="q-out"></p>
      </form>`
    : `<div class="login-box"><p>문의는 Google 로그인 후 남길 수 있습니다.</p><button class="btn primary" id="inq-login">Google 로그인</button></div>`;
  app.innerHTML = `<section class="hero"><h1>${esc(COLUMNS.inquiry.title)}</h1><p>${esc(COLUMNS.inquiry.desc)}</p></section><div class="inquiry">${body}</div>`;
  if (!user) {
    document.getElementById("inq-login").onclick = signIn;
    return;
  }
  document.getElementById("inq-form").onsubmit = async e => {
    e.preventDefault();
    const out = document.getElementById("q-out");
    try {
      await addDoc(collection(db, "inquiries"), {
        uid: user.uid,
        name: document.getElementById("q-name").value.trim().slice(0, 20),
        email: user.email || "",
        message: document.getElementById("q-msg").value.trim(),
        createdAt: serverTimestamp()
      });
      document.getElementById("q-msg").value = "";
      out.textContent = "문의가 접수되었습니다. 확인 후 답변드리겠습니다.";
      track("inquiry_submit");
    } catch (err) {
      out.textContent = "문의 접수에 실패했습니다: " + err.message;
    }
  };
}

// ---------- 라우팅 ----------

async function route() {
  if (!isConfigured) {
    app.innerHTML = `<div class="notice">Firebase 설정이 필요합니다. js/config.js의 값을 입력해 주세요.</div>`;
    return;
  }
  const hash = location.hash.replace(/^#/, "") || "/";
  if (hash === "/inquiry") return renderInquiry();
  app.innerHTML = `<p class="loading">불러오는 중...</p>`;
  try {
    const posts = await loadPosts();
    if (hash.startsWith("/post/")) return await renderPost(posts, decodeURIComponent(hash.slice(6)));
    if (hash === "/education" || hash === "/recruit") return renderList(hash.slice(1), posts);
    renderHome(posts);
  } catch (e) {
    app.innerHTML = `<div class="notice">글을 불러오지 못했습니다: ${esc(e.message)}</div>`;
  }
}

if (authBtn) authBtn.addEventListener("click", () => (user ? signOut(auth) : signIn()));
window.addEventListener("hashchange", route);

if (isConfigured) {
  // 로그인 상태가 바뀌면 현재 화면을 다시 그린다
  onAuthStateChanged(auth, u => {
    user = u;
    if (authBtn) authBtn.textContent = u ? "로그아웃" : "로그인";
    route();
  });
} else {
  route();
}
