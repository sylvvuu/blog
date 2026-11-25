// 신입 구직자용 질문 챗봇 (규칙 기반)
// - AI 키를 쓰지 않는다. 블로그의 공개 글(제목, 요약, 본문)에서 질문 단어가 많이 들어간 글을 찾아 보여 준다.
// - 답변은 찾은 글의 요약과 글 링크다. 자격 조건, 연봉처럼 글에 없는 내용은 상세 공고에서 확인하라고 안내한다.
// - 질문 원문은 측정 이벤트에 보내지 않는다(개인정보 보호). 이벤트에는 찾은 글 수만 보낸다.

const STOP_WORDS = new Set([
  "은", "는", "이", "가", "을", "를", "에", "의", "도", "로", "와", "과", "좀", "어떻게", "무엇",
  "뭐", "알려줘", "알려주세요", "있나요", "있어요", "있는", "하나요", "해줘", "관련", "대해", "대한", "것", "어떤", "방법", "안내"
]);
// 한국어 조사를 단어 끝에서 떼어 낸다 (예: "교육은" → "교육")
const SUFFIXES = ["으로", "에서", "까지", "은", "는", "이", "가", "을", "를", "에", "의", "도", "로", "와", "과"];
const CONDITION_RE = /자격|조건|연봉|학력|경력|급여|우대/;
const EDU_RE = /교육|강좌|과정|수업|강의/;
const REC_RE = /채용|공고|모집|지원|입사|구직|취업|인턴/;

export function chatTokens(question) {
  return question
    .toLowerCase()
    .split(/[^0-9a-z가-힣]+/)
    .filter(Boolean)
    .map(token => {
      for (const s of SUFFIXES) {
        if (token.length > s.length + 1 && token.endsWith(s)) return token.slice(0, -s.length);
      }
      return token;
    })
    .filter(token => token.length >= 2 && !STOP_WORDS.has(token));
}

// 질문과 글의 단어 겹침으로 점수를 매기고, 점수가 높은 글 최대 3개를 돌려준다
export function chatSearch(question, posts) {
  const tokens = chatTokens(question);
  if (!tokens.length) return [];
  const wantEdu = EDU_RE.test(question);
  const wantRec = REC_RE.test(question);
  return posts
    .map(p => {
      const title = (p.title || "").toLowerCase();
      const summary = (p.summary || "").toLowerCase();
      const body = (p.body || "").toLowerCase();
      let hit = 0;
      for (const t of tokens) {
        if (title.includes(t)) hit += 3;
        if (summary.includes(t)) hit += 2;
        if (body.includes(t)) hit += 1;
      }
      // 단어가 하나라도 맞은 글에만 분류 가산점을 준다
      if (hit > 0 && wantEdu && p.category === "education") hit += 1;
      if (hit > 0 && wantRec && p.category === "recruit") hit += 1;
      return { p, score: hit };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.p);
}

// 캐릭터는 두 명이며, 선택은 이 브라우저에만 저장한다. 기본값은 남성 캐릭터.
const CHARACTERS = {
  male: { src: "assets/chatbot/male.webp" },
  female: { src: "assets/chatbot/female.webp" }
};
const CHARACTER_KEY = "sv_chat_character";
const DEFAULT_CHARACTER = "male";

function readCharacter() {
  try {
    const v = localStorage.getItem(CHARACTER_KEY);
    return CHARACTERS[v] ? v : DEFAULT_CHARACTER;
  } catch (e) {
    return DEFAULT_CHARACTER;
  }
}

function saveCharacter(v) {
  try { localStorage.setItem(CHARACTER_KEY, v); } catch (e) { /* 저장 불가 환경은 무시 */ }
}

let chatPanel = null;

// 홈 화면의 질문 칸(슬롯)에 패널을 붙이고 펼쳐 둔다
export function mountChatbot(slot) {
  if (!chatPanel || !slot) return;
  chatPanel.hidden = false;
  chatPanel.classList.add("chat-inline");
  slot.append(chatPanel);
}

export function setupChatbot({ loadPosts, track, esc, isConfigured, askAI }) {
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "chat-fab";
  fab.textContent = "질문하기";

  const panel = document.createElement("section");
  panel.className = "chat-panel";
  // 처음부터 펼쳐진 상태로 시작한다. 닫기를 누르면 떠 있는 버튼이 나타난다.
  panel.hidden = false;
  fab.hidden = true;
  panel.setAttribute("aria-label", "질문 챗봇");
  panel.innerHTML = `
    <header class="chat-head">
      <img class="chat-head-avatar" alt="">
      <strong>질문 도우미</strong>
      <div class="chat-switch" role="group" aria-label="캐릭터 선택">
        <button type="button" data-character="male">남성</button>
        <button type="button" data-character="female">여성</button>
      </div>
      <button type="button" class="chat-close" aria-label="챗봇 닫기">×</button>
    </header>
    <div class="chat-log">
      <div class="chat-bot chat-row">
        <img class="chat-avatar chat-greet-avatar" alt="">
        <div class="chat-text"><p>교육과 채용 글에서 답을 찾아 드립니다. 예: "신입 교육 과정 알려줘"</p></div>
      </div>
    </div>
    <form class="chat-form">
      <input type="text" maxlength="200" placeholder="질문을 입력하세요" aria-label="질문 입력">
      <button type="submit">보내기</button>
    </form>`;
  chatPanel = panel;

  const log = panel.querySelector(".chat-log");
  const form = panel.querySelector(".chat-form");
  const input = panel.querySelector("input");
  let opened = false;
  let character = readCharacter();

  // 선택한 캐릭터를 헤더와 인사 말풍선에 반영한다
  function paintCharacter() {
    const src = CHARACTERS[character].src;
    panel.querySelector(".chat-head-avatar").src = src;
    panel.querySelectorAll(".chat-greet-avatar").forEach(img => { img.src = src; });
    panel.querySelectorAll(".chat-switch button").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.character === character));
    });
  }
  paintCharacter();

  panel.querySelector(".chat-switch").addEventListener("click", e => {
    const b = e.target.closest("button[data-character]");
    if (!b || b.dataset.character === character) return;
    character = b.dataset.character;
    saveCharacter(character);
    paintCharacter();
    track("chatbot_character_change", { character });
  });

  fab.addEventListener("click", () => {
    panel.hidden = false;
    fab.hidden = true;
    if (!opened) {
      opened = true;
      track("chatbot_open");
    }
    input.focus();
  });

  panel.querySelector(".chat-close").addEventListener("click", () => {
    panel.hidden = true;
    fab.hidden = false;
  });

  // 답변 안의 글 링크를 누르면 연결 클릭으로 기록한다
  log.addEventListener("click", e => {
    const a = e.target.closest("a[data-chat-link]");
    if (a) track("chatbot_link_click", { post_id: a.dataset.postId, category: a.dataset.category });
    // 추천 공고 링크는 순번만 기록한다 (공고 제목과 질문 원문은 보내지 않음)
    const s = e.target.closest("a[data-chat-source]");
    if (s) track("chatbot_source_click", { source_index: Number(s.dataset.chatSource) + 1 });
  });

  const postLink = p => `<li><a href="#/post/${encodeURIComponent(p.id)}" data-chat-link data-post-id="${esc(p.id)}" data-category="${esc(p.category || "")}">${esc(p.title)}</a></li>`;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = "";
    log.insertAdjacentHTML("beforeend", `<p class="chat-user">${esc(question)}</p>`);
    log.insertAdjacentHTML("beforeend", `<p class="chat-bot chat-wait">찾는 중...</p>`);
    const wait = log.querySelector(".chat-wait");

    let html;
    let matched = [];
    const ai = isConfigured && askAI ? await askAI(question).catch(() => null) : null;
    if (!isConfigured) {
      html = `<p>챗봇을 쓰려면 Firebase 설정이 필요합니다.</p>`;
    } else if (ai && ai.noMatch) {
      html = `<p>${esc(ai.answer)}</p>`;
    } else if (ai) {
      // 추천 공고 카드: 회사, 지역, 고용형태, 마감일은 서버가 공고 데이터에서 가져온 값이다
      const card = s => {
        const meta = [s.source, s.company, s.region, s.employType, s.endDate ? `마감 ${s.endDate}` : ""].filter(Boolean).join(" · ");
        const i = ai.sources.indexOf(s);
        const title = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" data-chat-source="${i}">${esc(s.title)}</a>` : esc(s.title);
        return `<li>${title}<br><span>${esc(meta)}</span></li>`;
      };
      const sourceList = ai.sources.length
        ? `<p>추천 공고</p><ul class="chat-links">${ai.sources.map(card).join("")}</ul>`
        : "";
      html = `<p>${esc(ai.answer).replace(/\n/g, "<br>")}</p>${sourceList}<p class="chat-note">AI 답변은 고용24 목록을 근거로 합니다. 자세한 내용은 원문에서 확인해 주세요.</p>`;
      track("chatbot_ai", { source_count: ai.sources.length, character });
    } else {
      try {
        const posts = (await loadPosts()).filter(p => p.visibility === "public");
        matched = chatSearch(question, posts);
        if (matched.length) {
          const top = matched[0];
          html = `<p>가장 관련 있는 글의 요약입니다. ${esc(top.summary || "")}</p>
            <p>관련 글</p><ul class="chat-links">${matched.map(postLink).join("")}</ul>`;
        } else {
          const latest = posts.slice(0, 3);
          html = `<p>관련 글을 찾지 못했습니다. 최신 글을 확인해 보세요.</p>
            <ul class="chat-links">${latest.map(postLink).join("")}</ul>`;
        }
        if (CONDITION_RE.test(question)) {
          html += `<p>자격 조건과 급여는 블로그 글에 없을 수 있습니다. 상세 공고에서 확인해 주세요.</p>`;
        }
        if (REC_RE.test(question)) {
          html += `<p><a href="#/recruit" data-chat-link data-post-id="list" data-category="recruit">채용 공고 전체 보기</a></p>`;
        }
      } catch (err) {
        html = `<p>글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>`;
      }
    }
    wait.outerHTML = `<div class="chat-bot chat-row"><img class="chat-avatar" src="${CHARACTERS[character].src}" alt=""><div class="chat-text">${html}</div></div>`;
    track("chatbot_question", { matched: matched.length, character });
    log.scrollTop = log.scrollHeight;
  });
}
