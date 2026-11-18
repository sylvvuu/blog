// 서울 실시간 날씨 위젯: 기상청 단기예보 조회서비스의 초단기실황 (getUltraSrtNcst)
// 키는 관리자 화면에서 Firestore settings/weather 의 kmaServiceKey 로 저장된 값을 쓴다.
const BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
const NX = 60, NY = 127; // 서울 격자 좌표 (기상청 격자)
const REFRESH_MS = 10 * 60 * 1000;
const PTY = { 0: "", 1: "비", 2: "비/눈", 3: "눈", 5: "빗방울", 6: "빗방울/눈날림", 7: "눈날림" };
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let timer = null;

// 한국 시각 기준 Date (지역 필드가 KST 값을 갖도록 변환)
function kstNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

// 초단기실황은 매시 정각 기준이며 약 40분 뒤부터 제공되므로, 40분 전이면 직전 시각을 쓴다
function baseDateTime(offsetHours = 0) {
  let d = kstNow();
  if (d.getMinutes() < 40) d = new Date(d.getTime() - 3600000);
  d = new Date(d.getTime() - offsetHours * 3600000);
  const p = n => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`,
    time: `${p(d.getHours())}00`,
    label: `${p(d.getHours())}:00`
  };
}

// 발급받은 키가 이미 인코딩되어 있어도 한 번만 인코딩되도록 처리
function keyParam(key) {
  let raw = key;
  try { raw = decodeURIComponent(key); } catch (e) { /* 이미 디코딩된 키 */ }
  return encodeURIComponent(raw);
}

async function fetchObservation(key, b) {
  const url = `${BASE_URL}?serviceKey=${keyParam(key)}&pageNo=1&numOfRows=10&dataType=JSON` +
    `&base_date=${b.date}&base_time=${b.time}&nx=${NX}&ny=${NY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const j = await res.json();
  const h = j.response?.header;
  if (h?.resultCode !== "00") throw new Error(h?.resultMsg || "API 오류");
  const items = j.response.body?.items?.item || [];
  return Object.fromEntries(items.map(i => [i.category, i.obsrValue]));
}

// 최근 시각 데이터가 아직 없을 수 있어 한 시간 전까지 한 번 더 시도
async function getObservation(key) {
  try {
    return { v: await fetchObservation(key, baseDateTime(0)), b: baseDateTime(0) };
  } catch (e) {
    const b = baseDateTime(1);
    return { v: await fetchObservation(key, b), b };
  }
}

function draw(el, { v, b }) {
  const pty = PTY[Number(v.PTY)] ?? "";
  el.innerHTML = `
    <span class="weather-label">서울 실시간</span>
    <strong>${esc(v.T1H)}°C</strong>
    <span>${pty ? esc(pty) : "강수 없음"} · 습도 ${esc(v.REH)}% · 풍속 ${esc(v.WSD)} m/s</span>
    <span class="weather-time">${esc(b.label)} 기준 · 기상청</span>`;
  el.hidden = false;
}

// el: 날씨를 채울 요소. 키가 없거나 조회에 실패하면 요소를 숨긴다. 10분마다 갱신한다.
export async function startSeoulWeather(el, key) {
  if (!el) return;
  if (timer) { clearInterval(timer); timer = null; }
  if (!key) { el.hidden = true; return; }
  const run = async () => {
    try { draw(el, await getObservation(key)); }
    catch (e) { el.hidden = true; }
  };
  await run();
  timer = setInterval(run, REFRESH_MS);
}
