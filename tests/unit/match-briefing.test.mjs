/**
 * @file AI 경기 브리핑 도메인 테스트 (KAN-724). payload 검증(READY 모양, 문자열 id, 표시 상한,
 * 읽지 않는 출처 필드), 숨김 판정(만료 경계, 킥오프, 경기 상태, 경기 id 불일치), 자료 기준 문구를
 * 본다. 근거 목록은 KAN-731에서 걷어 출처와 근거 id는 화면 타입에 없다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isMatchBriefingVisible,
  matchBriefingAsOfLabel,
  matchBriefingDeadline,
  parseMatchBriefing,
} from "../../packages/domain/src/match-briefing.ts";

/**
 * 티켓의 테스트용 가상 fixture. 시계는 이 범위에 고정한다. BE는 근거 id와 출처 목록을 계속 주므로
 * fixture에도 그대로 둔다.
 */
const FIXTURE = {
  matchId: "900002",
  generatedAt: "2026-11-04T03:01:00Z",
  dataAsOf: "2026-11-04T03:00:00Z",
  expiresAt: "2026-11-05T03:00:00Z",
  points: [
    {
      text: "두 팀의 경기 관련 보도를 확인해 보세요.",
      evidenceIds: ["article:100"],
    },
  ],
  cautions: [],
  sources: [
    {
      id: "article:100",
      kind: "ARTICLE",
      title: "경기 전 감독 인터뷰",
      articleId: "100",
      matchId: null,
      observedAt: "2026-11-04T03:00:00Z",
    },
  ],
};

const host = (over = {}) => ({
  id: 900002,
  status: "SCHEDULED",
  kickoffAt: "2026-11-05T12:00:00+09:00",
  ...over,
});

const at = (iso) => new Date(iso).getTime();

test("티켓 fixture는 그대로 통과하고 출처와 근거 id는 화면 타입에 싣지 않는다", () => {
  const briefing = parseMatchBriefing(FIXTURE, 900002);
  assert.ok(briefing);
  assert.deepEqual(briefing, {
    matchId: "900002",
    generatedAt: FIXTURE.generatedAt,
    dataAsOf: FIXTURE.dataAsOf,
    expiresAt: FIXTURE.expiresAt,
    points: [{ text: FIXTURE.points[0].text }],
    cautions: [],
  });
});

test("경기 id는 문자열로 맞춰 비교하고 다르면 거절한다", () => {
  assert.ok(parseMatchBriefing(FIXTURE, "900002"));
  assert.equal(parseMatchBriefing(FIXTURE, 900003), null);
  assert.equal(
    parseMatchBriefing({ ...FIXTURE, matchId: 900002 }, 900002),
    null,
  );
});

test("객체가 아니거나 시각이 깨지거나 문장이 없으면 null이다", () => {
  assert.equal(parseMatchBriefing(null, 900002), null);
  assert.equal(parseMatchBriefing("READY", 900002), null);
  assert.equal(parseMatchBriefing([], 900002), null);
  assert.equal(
    parseMatchBriefing({ ...FIXTURE, expiresAt: "not-a-date" }, 900002),
    null,
  );
  assert.equal(
    parseMatchBriefing({ ...FIXTURE, dataAsOf: undefined }, 900002),
    null,
  );
  assert.equal(parseMatchBriefing({ ...FIXTURE, points: [] }, 900002), null);
  assert.equal(
    parseMatchBriefing({ ...FIXTURE, points: [{ text: "   " }] }, 900002),
    null,
  );
});

test("출처와 근거 id가 없거나 깨져 있어도 문장은 그대로 통과한다", () => {
  const texts = (raw) =>
    parseMatchBriefing(raw, 900002)?.points.map((p) => p.text);
  const { sources: _sources, ...withoutSources } = FIXTURE;
  assert.deepEqual(texts(withoutSources), [FIXTURE.points[0].text]);
  assert.deepEqual(
    texts({
      ...FIXTURE,
      points: [
        { text: "근거 필드 없음" },
        { text: "근거 id가 배열이 아님", evidenceIds: "article:100" },
        { text: "출처 목록에 없는 근거", evidenceIds: ["article:999", 7] },
      ],
      sources: [null, 7, { id: "bad:1", kind: "NOPE" }],
    }),
    ["근거 필드 없음", "근거 id가 배열이 아님", "출처 목록에 없는 근거"],
  );
  assert.deepEqual(texts({ ...FIXTURE, sources: "broken" }), [
    FIXTURE.points[0].text,
  ]);
});

test("문장 3개, 80자, 주의사항 1개 60자로 자른다", () => {
  const long = "가".repeat(100);
  const briefing = parseMatchBriefing(
    {
      ...FIXTURE,
      points: [1, 2, 3, 4].map((n) => ({
        text: `${n} ${long}`,
        evidenceIds: [],
      })),
      cautions: ["첫 주의 " + long, "둘째 주의"],
    },
    900002,
  );
  assert.ok(briefing);
  assert.equal(briefing.points.length, 3);
  assert.equal(briefing.points[0].text.length, 80);
  assert.ok(briefing.points[0].text.endsWith("…"));
  assert.equal(briefing.cautions.length, 1);
  assert.equal(briefing.cautions[0].length, 60);
});

test("만료 경계: 만료 시각 1ms 전까지 보이고 그 시각부터 숨긴다", () => {
  const briefing = parseMatchBriefing(FIXTURE, 900002);
  const expiry = at(FIXTURE.expiresAt);
  assert.equal(isMatchBriefingVisible(briefing, host(), expiry - 1), true);
  assert.equal(isMatchBriefingVisible(briefing, host(), expiry), false);
});

test("킥오프가 만료보다 이르면 킥오프에 숨긴다", () => {
  const briefing = parseMatchBriefing(FIXTURE, 900002);
  const h = host({ kickoffAt: "2026-11-04T21:00:00+09:00" });
  const kickoff = at(h.kickoffAt);
  assert.equal(matchBriefingDeadline(briefing, h.kickoffAt), kickoff);
  assert.equal(isMatchBriefingVisible(briefing, h, kickoff - 1), true);
  assert.equal(isMatchBriefingVisible(briefing, h, kickoff), false);
});

test("KST 자정을 넘겨도 만료 전이면 그대로 보인다", () => {
  const briefing = parseMatchBriefing(FIXTURE, 900002);
  /* 2026-11-05 00:30 KST = 11-04 15:30Z, 만료(11-05 03:00Z) 전 */
  assert.equal(
    isMatchBriefingVisible(briefing, host(), at("2026-11-04T15:30:00Z")),
    true,
  );
});

test("SCHEDULED가 아니거나 경기 id가 다르거나 킥오프가 깨지면 숨긴다", () => {
  const briefing = parseMatchBriefing(FIXTURE, 900002);
  const now = at("2026-11-04T04:00:00Z");
  for (const status of ["LIVE", "FINISHED", "POSTPONED", "CANCELLED"]) {
    assert.equal(
      isMatchBriefingVisible(briefing, host({ status }), now),
      false,
    );
  }
  assert.equal(
    isMatchBriefingVisible(briefing, host({ id: 900003 }), now),
    false,
  );
  assert.equal(
    isMatchBriefingVisible(briefing, host({ kickoffAt: "TBD" }), now),
    false,
  );
});

test("자료 기준 문구는 dataAsOf를 KST로 적는다", () => {
  assert.equal(
    matchBriefingAsOfLabel("2026-11-04T03:00:00Z"),
    "11월 4일 12:00 기준",
  );
  assert.equal(
    matchBriefingAsOfLabel("2026-11-04T15:30:00Z"),
    "11월 5일 00:30 기준",
  );
  assert.equal(matchBriefingAsOfLabel("broken"), "");
});
