// 서울 실시간 날씨 위젯: 기상청 단기예보 조회서비스
//  - 초단기실황 (getUltraSrtNcst): 기온, 습도, 풍속, 강수형태
//  - 초단기예보 (getUltraSrtFcst): 하늘상태 (맑음, 구름많음, 흐림)
// 키는 관리자 화면에서 Firestore settings/weather 의 kmaServiceKey 로 저장된 값을 쓴다.
const BASE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
const NX = 60, NY = 127; // 서울 격자 좌표 (기상청 격자)
const REFRESH_MS = 10 * 60 * 1000;
const PTY = { 0: "", 1: "비", 2: "비/눈", 3: "눈", 5: "빗방울", 6: "빗방울/눈날림", 7: "눈날림" };
const PTY_ICON = { 1: "🌧️", 4: "🌧️", 5: "🌧️", 2: "🌨️", 6: "🌨️", 3: "❄️", 7: "❄️" };
const SKY = { 1: { text: "맑음", icon: "☀️" }, 3: { text: "구름많음", icon: "⛅" }, 4: { text: "흐림", icon: "☁️" } };
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let timer = null;

// 한국 시각 기준 Date (지역 필드가 KST 값을 갖도록 변환)
function kstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

// 초단기실황: 매시 정각 기준, 약 40분 뒤부터 제공. 40분 전이면 직전 시각 사용
function obsBase(hoursBack = 0) {
  let d = kstNow();
  if (d.getMinutes() < 40) d = new Date(d.getTime() - 3600000);
  d = new Date(d.getTime() - hoursBack * 3600000);
  return { date: ymd(d), time: `${pad(d.getHours())}00`, label: `${pad(d.getHours())}:00` };
}

// 초단기예보: 매시 30분 기준, 약 45분 뒤부터 제공. 45분 전이면 직전 시각 사용
function fcstBase() {
  let d = kstNow();
  if (d.getMinutes() < 45) d = new Date(d.getTime() - 3600000);
  return { date: ymd(d), time: `${pad(d.getHours())}30` };
}

// 발급받은 키가 이미 인코딩되어 있어도 한 번만 인코딩되도록 처리
function keyParam(key) {
  let raw = key;
  try { raw = decodeURIComponent(key); } catch (e) { /* 이미 디코딩된 키 */ }
  return encodeURIComponent(raw);
}

async function callKma(op, key, params) {
  const qs = Object.entries({ serviceKey: keyParam(key), pageNo: 1, numOfRows: 60, dataType: "JSON", nx: NX, ny: NY, ...params })
    .map(([k, v]) => `${k}=${v}`).join("&");
  const res = await fetch(`${BASE}/${op}?${qs}`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const j = await res.json();
  const h = j.response?.header;
  if (h?.resultCode !== "00") throw new Error(h?.resultMsg || "API 오류");
  return j.response.body?.items?.item || [];
}

async function getObservation(key) {
  let b = obsBase(0);
  let items;
  try {
    items = await callKma("getUltraSrtNcst", key, { base_date: b.date, base_time: b.time, numOfRows: 10 });
  } catch (e) {
    b = obsBase(1);
    items = await callKma("getUltraSrtNcst", key, { base_date: b.date, base_time: b.time, numOfRows: 10 });
  }
  return { v: Object.fromEntries(items.map(i => [i.category, i.obsrValue])), b };
}

// 현재와 가장 가까운 예보 시각의 하늘상태 (SKY)
async function getSky(key) {
  try {
    const f = fcstBase();
    const items = await callKma("getUltraSrtFcst", key, { base_date: f.date, base_time: f.time });
    const sky = items.filter(i => i.category === "SKY");
    return sky.length ? Number(sky[0].fcstValue) : null;
  } catch (e) {
    return null; // 하늘상태를 못 가져와도 나머지 정보는 보여 준다
  }
}

// 모바일 헤더 사진 타일에 쓰는 배경 사진 (assets/weather, ChatGPT 제작)
function photoKey(pty, sky) {
  if (pty === 3 || pty === 7) return "snow";
  if (pty === 2 || pty === 6) return "sleet";
  if (pty) return "rain";
  if (sky === 4) return "overcast";
  if (sky === 3) return "cloudy";
  return "clear";
}

function draw(el, { v, b }, sky) {
  const pty = Number(v.PTY) || 0;
  const wind = Number(v.WSD) || 0;
  const skyInfo = pty ? null : SKY[sky];
  const icon = PTY_ICON[pty] || skyInfo?.icon || "🌤️";
  const state = pty ? (PTY[pty] || "") : (skyInfo?.text || "강수 없음");
  const windIcon = wind >= 9 ? " 💨" : "";
  const photo = `assets/weather/${photoKey(pty, sky)}.jpg`;
  el.innerHTML = `
    <span class="weather-tile" style="background-image:url('${esc(photo)}')"><span class="weather-txt"><span class="weather-city">Seoul</span><strong>${esc(v.T1H)}°</strong><span class="weather-state">${esc(state)}</span></span></span>
    <span class="weather-label">날씨 · 서울기준 실시간</span>
    <span class="weather-icon" aria-hidden="true">${icon}${windIcon}</span>
    <strong>${esc(v.T1H)}°C</strong>
    <span>${esc(state)} · 습도 ${esc(v.REH)}% · 풍속 ${esc(v.WSD)} m/s</span>`;
  el.hidden = false;
}

// el: 날씨를 채울 요소. 키가 없거나 조회에 실패하면 요소를 숨긴다. 10분마다 갱신한다.
export async function startSeoulWeather(el, key) {
  if (!el) return;
  if (timer) { clearInterval(timer); timer = null; }
  if (!key) { el.hidden = true; return; }
  const run = async () => {
    try {
      const [obs, sky] = await Promise.all([getObservation(key), getSky(key)]);
      draw(el, obs, sky);
    } catch (e) {
      el.hidden = true;
    }
  };
  await run();
  timer = setInterval(run, REFRESH_MS);
}
