import { firebaseConfig, ADMIN_EMAIL, COMPANY_INTRO } from "./config.js";
import { startSeoulWeather } from "./weather.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, getDocs, getDoc, setDoc, deleteDoc, addDoc, updateDoc, doc,
  query, where, orderBy, increment, serverTimestamp
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

const SITE_TITLE = "SY Electronics Careers";
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = ts => (ts && ts.toDate ? ts.toDate().toLocaleDateString("ko-KR") : "");
const artOf = p => ART[p.image] || ART[p.category === "recruit" ? "recruit" : "education"];
// 글 그림: 웹에서 찾은 사진(imageUrl)이 있으면 사진, 없으면 직접 그린 SVG
// 본문에서 처음 나오는 이미지(검사 통과한 것만)를 찾는다
const bodyThumb = p => {
  const m = String(p.body || "").match(/\[\[img:([\w-]+)\]\]/);
  const im = m && (Array.isArray(p.images) ? p.images : []).find(i => i && i.id === m[1]);
  return im && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(im.data) ? im.data : null;
};
// useBody: 목록 카드에서만 대표 이미지가 없으면 본문 첫 이미지를 쓴다
const artHtml = (p, useBody = false) => {
  if (p.imageUrl) return `<img src="${esc(p.imageUrl)}" alt="" loading="lazy">`;
  const thumb = useBody ? bodyThumb(p) : null;
  return thumb ? `<img src="${thumb}" alt="" loading="lazy">` : artOf(p);
};
const creditHtml = p => (p.imageCredit ? `<p class="credit">${esc(p.imageCredit)}</p>` : "");

// 관리자(소유자) 브라우저: 관리자로 한 번 로그인하면 표시를 남기고, 로그아웃 후에도 측정하지 않는다
const OWNER_KEY = "sy_owner";
const isOwnerBrowser = () => {
  try { return localStorage.getItem(OWNER_KEY) === "1"; } catch (e) { return false; }
};

// GA4 이벤트 전송 (index.html의 gtag가 로드된 경우)
function track(name, params = {}) {
  if (isOwnerBrowser()) return;
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
let cacheUser = undefined;
const isAdminUser = () => !!user && user.email === ADMIN_EMAIL && user.emailVerified;
const tsOf = p => (p.createdAt && p.createdAt.toMillis ? p.createdAt.toMillis() : Date.now());
async function loadPosts() {
  // 로그인 상태가 바뀌면 다시 불러옴
  if (cache && cacheUser === (user ? user.uid : null)) return cache;
  // 관리자는 모든 글, 일반 사용자는 공개 글만 조회 (보안 규칙과 같은 조건)
  const base = collection(db, "posts");
  const snap = await getDocs(isAdminUser() ? base : query(base, where("visibility", "==", "public")));
  cache = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => tsOf(b) - tsOf(a));
  cacheUser = user ? user.uid : null;
  return cache;
}

async function signIn() {
  if (!isConfigured) {
    alert("Firebase 설정값을 js/config.js에 입력한 뒤 사용할 수 있습니다.");
    return;
  }
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    console.error("로그인 실패", e);
  }
}

// ---------- 목록 화면 ----------

function featuredCard(p) {
  return `<a class="feature" href="#/post/${esc(p.id)}">
    <div class="art">${artHtml(p, true)}</div>
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
  document.title = SITE_TITLE;
  const edu = posts.filter(p => p.category === "education");
  const rec = posts.filter(p => p.category === "recruit");
  const intro = `<section class="about">
    <p class="kicker">${esc(COMPANY_INTRO.kicker)}</p>
    <h2>${esc(COMPANY_INTRO.title)}</h2>
    <p>${esc(COMPANY_INTRO.body)}</p>
    <ul class="values">${COMPANY_INTRO.values.map(v => `<li><strong>${esc(v.title)}</strong><span>${esc(v.desc)}</span></li>`).join("")}</ul>
  </section>`;
  app.innerHTML = `${intro}<section class="banner"><p class="kicker">SY ELECTRONICS CAREERS</p><h1>채용과 교육 소식</h1><p>교육과 채용 소식을 한곳에서 확인하고, 궁금한 점은 문의하기로 남겨 주세요.</p></section>
  <div class="columns">
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
  </div>
  <section class="jobs-panel" id="jobs-panel" hidden></section>`;
  loadPublicJobs();
}

// 채용정보 최신 5건 (고용24 채용정보 Open-API, 채용정보 목록 callOpenApiSvcInfo210L01, 응답은 XML)
const JOBS_API = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do";
const WORK24_HOME = "https://www.work24.go.kr";

// 워크넷이 주는 상세 링크가 http(s)일 때만 사용한다
const workUrl = u => (u && /^https?:\/\//.test(u)) ? u : (u ? `${WORK24_HOME}${u.startsWith("/") ? "" : "/"}${u}` : "");

// 목록을 가져와 채용정보 항목을 돌려준다 (sortOrderBy=DESC: 등록일 기준 정렬)
async function fetchLatestJobs(raw, display) {
  const params = new URLSearchParams({
    authKey: raw,
    callTp: "L",
    returnType: "XML",
    startPage: "1",
    display: String(display),
    sortOrderBy: "DESC"
  });
  const res = await fetch(`${JOBS_API}?${params.toString()}`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const xml = new DOMParser().parseFromString(await res.text(), "application/xml");
  if (xml.getElementsByTagName("parsererror").length || !xml.getElementsByTagName("wantedRoot").length) {
    throw new Error("API 응답 오류");
  }
  return Array.from(xml.getElementsByTagName("wanted")).map(n => {
    const get = tag => n.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
    return {
      title: get("title"),
      company: get("company"),
      regDt: get("regDt"),
      closeDt: get("closeDt"),
      region: get("region"),
      url: workUrl(get("wantedInfoUrl"))
    };
  }).filter(j => j.title);
}

async function loadPublicJobs() {
  const el = document.getElementById("jobs-panel");
  if (!el || !db) return;
  try {
    const snap = await getDoc(doc(db, "settings", "jobs"));
    const key = snap.exists() ? snap.data().serviceKey : "";
    if (!key) { el.hidden = true; return; }
    let raw = key;
    try { raw = decodeURIComponent(key); } catch (e) { /* 이미 디코딩된 키 */ }

    // 등록일 내림차순으로 받은 뒤, 혹시 모를 순서 차이에 대비해 한 번 더 정렬해 5건만 쓴다
    const items = await fetchLatestJobs(raw, 20);
    const latest = items
      .sort((a, b) => b.regDt.localeCompare(a.regDt))
      .slice(0, 5);
    if (!latest.length) { el.hidden = true; return; }
    el.innerHTML = `
      <h2>채용정보 <span>최신 ${latest.length}건</span></h2>
      <ul>${latest.map(j => `<li>
        ${j.url
          ? `<a href="${esc(j.url)}" target="_blank" rel="noopener"><strong>${esc(j.title)}</strong></a>`
          : `<strong>${esc(j.title)}</strong>`}
        <span>${esc(j.company)}${j.region ? ` · ${esc(j.region)}` : ""}</span>
        <em>마감 ${esc(j.closeDt || "추후 공지")}</em>
      </li>`).join("")}</ul>`;
    el.hidden = false;
  } catch (e) {
    el.hidden = true;
  }
}

// 관리자 화면에서 저장한 기상청 인증키를 읽어 헤더 아래 날씨 위젯을 채운다 (모든 페이지 공통)
async function loadSeoulWeather() {
  const el = document.getElementById("weather");
  if (!el || !db) return;
  try {
    const snap = await getDoc(doc(db, "settings", "weather"));
    await startSeoulWeather(el, snap.exists() ? snap.data().kmaServiceKey : "");
  } catch (e) {
    el.hidden = true;
  }
}

function renderList(key, posts) {
  const c = COLUMNS[key];
  document.title = `${c.title} | ${SITE_TITLE}`;
  const list = posts.filter(p => p.category === key);
  const body = list.length
    ? `<div class="grid">${list.map(p => `<a class="card" href="#/post/${esc(p.id)}">
        <div class="thumb">${artHtml(p, true)}</div>
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

// 조회수 집계: 글의 누적 조회수(posts.views)와 날짜별 조회수(posts/{id}/daily/{날짜})를 1씩 올린다
// 같은 브라우저 탭 세션에서 같은 글은 한 번만 센다. 관리자 브라우저는 세지 않는다.
const localDay = (d = new Date()) => d.toLocaleDateString("sv-SE");
async function countView(id) {
  if (isOwnerBrowser() || !db) return;
  try {
    const key = `viewed:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch (e) { /* 저장소를 못 쓰는 환경이면 매번 센다 */ }
  const day = localDay();
  try {
    await Promise.all([
      updateDoc(doc(db, "posts", id), { views: increment(1) }),
      setDoc(doc(db, "posts", id, "daily", day), { count: increment(1), date: day }, { merge: true })
    ]);
  } catch (e) { /* 집계 실패는 글 읽기에 영향을 주지 않는다 */ }
}

async function renderPost(posts, id) {
  const p = posts.find(x => x.id === id);
  if (!p) {
    document.title = SITE_TITLE;
    app.innerHTML = `<p class="empty">글을 찾을 수 없습니다. <a href="#/">홈으로</a></p>`;
    return;
  }
  document.title = `${p.title} | ${SITE_TITLE}`;
  countView(id);
  const base = { post_id: id, post_title: p.title, category: p.category, content_group: COLUMNS[p.category].title };
  const isRec = p.category === "recruit";
  const st = isRec ? statusOf(p) : "";
  // 지원하기는 모두 Google 로그인 후 가능
  const applyLabel = user ? "지원하기" : "지원하기 (Google 로그인 필요)";
  // 채용 글 기본은 사이트 안 지원 폼, 외부 지원 주소(applyUrl)가 있는 글만 그 주소로 연결
  const applyBtn = !isRec ? "" : safeUrl(p.applyUrl)
    ? `<button class="btn primary" id="apply-ext" type="button">${applyLabel}</button>`
    : `<button class="btn primary" id="apply-open" type="button">${applyLabel}</button>`;
  // 지원 폼: 로그인 계정으로 이름과 이메일만 입력
  const applyPanel = isRec && !safeUrl(p.applyUrl) ? `<section id="apply-box" class="apply-box" hidden>
      <h2>지원하기</h2>
      ${user
        ? `<p class="who">이름과 이메일만 입력하면 지원이 접수됩니다.</p>
      <form id="apply-form" class="comment-form">
        <input id="ap-name" maxlength="20" placeholder="이름" required>
        <input id="ap-email" type="email" maxlength="100" placeholder="이메일 (예: name@example.com)" required>
        <button type="submit">지원 완료하기</button>
        <p class="msg" id="ap-msg"></p>
      </form>`
        : `<div class="login-box"><p>지원은 Google 로그인 후 가능합니다.</p><button class="btn primary" id="apply-login" type="button">Google 로그인</button></div>`}
    </section>` : "";
  // 본문 이미지: [[img:id]] 자리에 저장된 이미지를 넣는다 (데이터 URL은 형식 검사 후 사용)
  const imgMap = Object.fromEntries((Array.isArray(p.images) ? p.images : [])
    .filter(im => im && /^[\w-]+$/.test(im.id) && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(im.data))
    .map(im => [im.id, im.data]));
  const figure = id => imgMap[id] ? `<figure><img src="${imgMap[id]}" alt="" loading="lazy"></figure>` : "";
  const paras = String(p.body || "").split(/\n\s*\n/).map(t => {
    const parts = t.split(/\[\[img:([\w-]+)\]\]/);
    // parts: 글자, id, 글자, id ... 순서로 나뉜다
    return parts.map((seg, i) => {
      if (i % 2) return figure(seg);
      return seg.trim() ? `<p>${esc(seg.trim()).replace(/\n/g, "<br>")}</p>` : "";
    }).join("");
  }).join("");

  app.innerHTML = `<article class="post">
    <a class="back" href="#/${p.category}">&larr; ${esc(COLUMNS[p.category].title)} 목록</a>
    <div class="post-art">${artHtml(p)}${creditHtml(p)}</div>
    <div class="job-head"><div>
      ${isRec ? `<span class="pill ${st === "접수중" ? "open" : "closed"}">${st}</span>` : `<span class="badge">교육</span>`}
      <h1>${esc(p.title)}</h1>
      ${isRec ? `<p class="job-sub"><span class="badge">${esc(p.jobType || "채용")}</span> ${esc(p.location || "")}</p>` : ""}
      ${isRec && p.deadline ? `<p class="job-period">마감 ${esc(p.deadline)}</p>` : ""}
      ${!isRec ? `<time>${fmtDate(p.createdAt)}</time>` : ""}
    </div>
    <div class="job-actions">${applyBtn}${isRec && !user ? '<p class="who login-hint">지원은 Google 로그인 후 가능합니다. 버튼을 누르면 로그인 창이 열립니다.</p>' : ""}</div></div>
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

  // 페이지 조회: 글 식별 정보(post_id, 메뉴)를 붙여서 보낸다
  attachPostView(base);
  // 완독 준비: 본문 끝 표식이 보이고, 활성 체류가 예상 읽기 시간 이상(최소 10초)이면 post_read
  setupRead(base, String(p.body || "").replace(/\s/g, "").length);

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
      if (navigator.share) {
        await navigator.share({ title: p.title, url: link });
        track("share", { ...base, method: "native" });
      } else {
        await navigator.clipboard.writeText(link);
        track("share", { ...base, method: "copy_link" });
      }
      actionMsg.textContent = "공유 링크를 준비했습니다.";
    } catch (e) {
      actionMsg.textContent = "공유에 실패했습니다. 주소창의 주소를 직접 복사해 주세요.";
    }
  };

  // 경력직 등 외부 지원 링크: 로그인 후 새 창으로 이동
  const applyExt = document.getElementById("apply-ext");
  if (applyExt) {
    applyExt.onclick = () => {
      if (!user) return signIn();
      track("post_apply", base);
      window.open(safeUrl(p.applyUrl), "_blank", "noopener");
    };
  }

  // 신입 지원 폼 열기 (로그인 필요)
  const applyOpen = document.getElementById("apply-open");
  if (applyOpen) {
    applyOpen.onclick = () => {
      if (!user) return signIn();
      const box = document.getElementById("apply-box");
      box.hidden = false;
      box.scrollIntoView({ behavior: "smooth" });
      track("post_apply", base);
    };
    document.getElementById("apply-login")?.addEventListener("click", signIn);
    document.getElementById("apply-form")?.addEventListener("submit", async e => {
      e.preventDefault();
      const out = document.getElementById("ap-msg");
      const name = document.getElementById("ap-name").value.trim().slice(0, 20);
      const email = document.getElementById("ap-email").value.trim().slice(0, 100);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        out.textContent = "이메일 형식을 확인해 주세요.";
        return;
      }
      try {
        await addDoc(collection(db, "applications"), {
          uid: user.uid,
          postId: id,
          postTitle: p.title,
          name,
          email,
          createdAt: serverTimestamp()
        });
        e.target.reset();
        out.textContent = "지원이 접수되었습니다. 감사합니다.";
        track("post_apply_submit", base);
      } catch (err) {
        out.textContent = "지원 접수에 실패했습니다: " + err.message;
      }
    });
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
  document.title = `${COLUMNS.inquiry.title} | ${SITE_TITLE}`;
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

async function renderRoute() {
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

// 화면 추적: 주소가 바뀔 때마다 page_view, 활성 체류 시간은 60초마다 page_time으로 보냄
let view = null;
const isVisible = () => document.visibilityState === "visible";
// 활성 시간: 탭이 보이는 동안만 센다 (숨겨진 시간 제외)
function tickActive() {
  if (!view) return;
  const now = Date.now();
  if (view.visible) view.activeMs += now - view.last;
  view.last = now;
  view.visible = isVisible();
}
// 아직 보내지 않은 활성 시간을 page_time으로 보낸다
function flushActive() {
  if (!view) return;
  tickActive();
  const delta = view.activeMs - view.sentMs;
  if (delta >= 1000) {
    track("page_time", { ...view.ctx, page_path: view.path, page_title: view.title, active_seconds: Math.round(delta / 1000) });
    view.sentMs = view.activeMs;
  }
}
function endView() {
  if (!view) return;
  flushActive();
  view = null;
}
function startView() {
  const path = location.hash || "#/";
  view = { path, title: document.title, ctx: {}, last: Date.now(), visible: isVisible(), activeMs: 0, sentMs: 0, pageSent: false, read: null };
  // 글 페이지는 글 정보를 받은 뒤 renderPost에서 page_view를 보낸다
  if (!path.startsWith("#/post/")) {
    track("page_view", { page_path: path, page_title: document.title });
    view.pageSent = true;
  }
}
// 글 페이지의 page_view: 같은 화면에서 다시 그려도 한 번만 보낸다
function attachPostView(ctx) {
  if (!view) return;
  view.ctx = ctx;
  if (view.pageSent) return;
  view.pageSent = true;
  track("page_view", { ...ctx, page_path: view.path, page_title: document.title });
}
// 완독: 본문 끝 표식이 보이고, 활성 체류가 예상 읽기 시간 이상(최소 10초)이면 글당 1회 post_read
function setupRead(ctx, charCount) {
  if (!view) return;
  if (view.read && view.read.id === ctx.post_id) return; // 같은 글을 다시 그린 경우 유지
  const thresholdMs = Math.max((charCount / 500) * 60000, 10000);
  view.read = { id: ctx.post_id, ctx, charCount, thresholdMs, endSeen: false, sent: false };
  const endMark = document.querySelector(".bottom-nav");
  if (endMark && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      if (entries.some(en => en.isIntersecting) && view && view.read) {
        view.read.endSeen = true;
        io.disconnect();
      }
    });
    io.observe(endMark);
  }
}
function checkRead() {
  const r = view && view.read;
  if (!r || r.sent || !r.endSeen) return;
  tickActive();
  if (view.activeMs < r.thresholdMs) return;
  r.sent = true;
  track("post_read", { ...r.ctx, word_count: Math.round(r.charCount / 100) * 100 });
}
let lastFlush = Date.now();
setInterval(() => {
  if (!view) return;
  tickActive();
  checkRead();
  if (Date.now() - lastFlush >= 60000) {
    flushActive();
    lastFlush = Date.now();
  }
}, 5000);
document.addEventListener("visibilitychange", () => {
  tickActive();
  if (!isVisible()) flushActive();
});
window.addEventListener("pagehide", endView);

async function route(nav = false) {
  if (nav) endView();
  await renderRoute();
  if (nav || !view) startView();
}

if (authBtn) authBtn.addEventListener("click", () => (user && isConfigured ? signOut(auth) : signIn()));
window.addEventListener("hashchange", () => route(true));

if (isConfigured) {
  // 로그인 상태가 바뀌면 현재 화면을 다시 그린다
  onAuthStateChanged(auth, u => {
    user = u;
    if (authBtn) authBtn.textContent = u ? "로그아웃" : "로그인";
    // 관리자 계정으로 로그인했을 때만 글쓰기 메뉴를 보여 준다
    const adminLink = document.getElementById("admin-link");
    if (adminLink) adminLink.hidden = !isAdminUser();
    // 관리자로 로그인한 브라우저는 표시를 남겨 두어 이후 방문을 측정하지 않는다
    if (isAdminUser()) {
      try { localStorage.setItem(OWNER_KEY, "1"); } catch (e) { /* 저장 불가 환경은 무시 */ }
    }
    route();
  });
} else {
  route();
}

// 날씨 위젯은 페이지와 상관없이 항상 표시한다
loadSeoulWeather();

// 명언: 페이지를 열 때마다 외부 명언 API에서 새 명언을 받아 보여 준다.
// API가 실패하면 관리자 화면에 등록된 명언 중 하나를 무작위로 보여 준다.
const QUOTE_API = "https://random-quote.hyobb.com/";

// 응답: [{result:"success"},{respond:"명언 - 작가"}]
function parseApiQuote(data) {
  const s = String(data?.[1]?.respond || "").trim();
  const i = s.lastIndexOf(" - ");
  return i > 0 ? { text: s.slice(0, i).trim(), author: s.slice(i + 3).trim() } : { text: s, author: "" };
}

async function fetchApiQuote() {
  const res = await fetch(QUOTE_API, { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const q = parseApiQuote(await res.json());
  if (!q.text) throw new Error("empty quote");
  return q;
}

async function fetchLocalQuote() {
  const snap = await getDocs(collection(db, "quotes"));
  const list = snap.docs.map(d => d.data()).filter(q => q.text);
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

function drawQuote(el, q) {
  el.innerHTML = `<span class="quote-text">“${esc(q.text)}”</span>${q.author ? ` <span class="quote-author">— ${esc(q.author)}</span>` : ""}`;
  el.hidden = false;
}

async function loadRandomQuote() {
  const el = document.getElementById("quote");
  if (!el) return;
  try {
    drawQuote(el, await fetchApiQuote());
    return;
  } catch (e) { /* API 실패 시 아래 대체 명언 사용 */ }
  try {
    const q = db ? await fetchLocalQuote() : null;
    if (q) drawQuote(el, q); else el.hidden = true;
  } catch (e) {
    el.hidden = true;
  }
}
loadRandomQuote();
