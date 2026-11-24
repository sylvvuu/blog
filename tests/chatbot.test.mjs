// 챗봇 검색 로직 단위 테스트. 실행: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { chatTokens, chatSearch } from "../js/chatbot.js";

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
