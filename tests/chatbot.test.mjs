// 챗봇 검색 로직 단위 테스트. 실행: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { chatTokens, chatSearch } from "../js/chatbot.js";
import { extractConditions, matchJobs, citedIndexes, noMatchText, jobItems } from "../api/chat.js";

const jobs = [
  { title: "사무지원", region: "서울 강남구", employType: "정규직", end: "20261231" },
  { title: "회계 보조", region: "경기 성남시", employType: "계약직", end: "20261015" },
  { title: "영업", region: "", employType: "정규직", end: "" }
];

const posts = [
  { id: "a", title: "AI 활용 교육: 생성형 AI 실무 과정", summary: "문서 작성과 보고서 요약을 배웁니다.", body: "", category: "education" },
  { id: "b", title: "신입 사원 채용 공고", summary: "신입 공개 채용을 진행합니다.", body: "지원 방법 안내", category: "recruit" },
  { id: "c", title: "사내 소식", summary: "이번 달 행사 안내", body: "", category: "education" }
];

test("조사를 떼고 불용어를 뺀다", () => {
  assert.deepEqual(chatTokens("교육은 어떻게 신청하나요?"), ["교육", "신청하나요"]);
  assert.deepEqual(chatTokens("알려줘"), []);
});

test("질문 단어가 맞는 글을 찾는다", () => {
  const found = chatSearch("AI 교육 알려줘", posts).map(p => p.id);
  assert.equal(found[0], "a");
});

test("채용 질문은 채용 글을 먼저 보여 준다", () => {
  const found = chatSearch("신입 채용 지원 방법", posts).map(p => p.id);
  assert.equal(found[0], "b");
});

test("맞는 단어가 없으면 빈 결과를 돌려준다", () => {
  assert.deepEqual(chatSearch("주식 투자 방법", posts), []);
});

test("분류 단어만 있고 내용이 안 맞으면 글을 보여 주지 않는다", () => {
  assert.deepEqual(chatSearch("교육 과정", [{ id: "x", title: "행사", summary: "", body: "", category: "education" }]), []);
});

test("질문에서 지역과 고용형태 조건을 찾는다", () => {
  assert.deepEqual(extractConditions("서울 정규직 사무지원 공고 찾아줘"), { region: "서울", employType: "정규직" });
  assert.deepEqual(extractConditions("비정규직 공고 있나요"), { region: "", employType: "" });
  assert.deepEqual(extractConditions("주식 추천"), { region: "", employType: "" });
});

test("명시한 조건을 모두 만족하는 공고만 남기고, 값이 없는 공고는 제외한다", () => {
  const found = matchJobs(jobs, { region: "서울", employType: "정규직" }).map(x => x.title);
  assert.deepEqual(found, ["사무지원"]);
  // 지역 값이 빈 "영업"은 지역 조건을 충족하지 않는다
  assert.deepEqual(matchJobs(jobs, { region: "서울", employType: "" }).map(x => x.title), ["사무지원"]);
});

test("일치 공고가 없으면 조정해 볼 조건 하나를 제안한다", () => {
  assert.equal(
    noMatchText({ region: "서울", employType: "인턴" }),
    "현재 조회한 공고에서는 조건에 맞는 결과를 찾지 못했어요. 고용형태(\"인턴\") 조건을 빼고 다시 찾아볼까요?"
  );
});

test("답변의 [번호] 중 목록 범위 밖 번호는 근거로 쓰지 않는다", () => {
  assert.deepEqual(citedIndexes("추천 [1], [3] 그리고 [9] 와 [1]", 3), [1, 3]);
  assert.deepEqual(citedIndexes("근거 없음", 3), []);
});

test("210L21 응답에서 공고 필드를 읽는다", () => {
  const xml = `<response><dhsOpenEmpInfo><empWantedTitle>사무지원</empWantedTitle><empBusiNm>에스브이</empBusiNm><coClcdNm>중견기업</coClcdNm><empWantedEndt>2026-12-31</empWantedEndt><empWantedHomepgDetail>https://example.com/job/1</empWantedHomepgDetail></dhsOpenEmpInfo></response>`;
  const [item] = jobItems(xml);
  assert.equal(item.title, "사무지원");
  assert.equal(item.company, "에스브이");
  assert.equal(item.end, "2026-12-31");
  assert.equal(item.url, "https://example.com/job/1");
  // XML의 &amp;는 &로 풀려야 고용24 상세 페이지의 인자가 제대로 전달된다
  const xml2 = `<response><dhsOpenEmpInfo><empWantedTitle>a</empWantedTitle><empWantedHomepgDetail>https://www.work24.go.kr/x?a=1&amp;b=2</empWantedHomepgDetail></dhsOpenEmpInfo></response>`;
  assert.equal(jobItems(xml2)[0].url, "https://www.work24.go.kr/x?a=1&b=2");
  // 지역과 고용형태 필드가 응답에 없으면 빈 값이어서 조건 검색에서 제외된다
  assert.equal(item.region, "");
});
