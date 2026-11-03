/** KAN-704 제안 계약의 목 응답으로 FE 경계·공개 상태·커서 연속성을 검증한다. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getDebates } from "../../packages/core/src/debates.ts";
import { getComments } from "../../packages/core/src/comments.ts";
import {
  getPredictionFeed,
  getPredictionHome,
} from "../../packages/core/src/predictions.ts";

const opinion = {
  commentId: 91,
  nickname: "축구팬",
  opinion: "이번 경기 기대돼요",
};
const debate = {
  debateId: 7,
  articleId: 70,
  contentType: "DEBATE",
  topic: "누가 이길까?",
  optionA: "홈",
  optionB: "원정",
  closesAt: "2099-11-03T00:00:00Z",
  voteCountA: 3,
  voteCountB: 2,
  myVote: null,
  topOpinion: null,
};
const match = {
  matchId: 101,
  kickoffAt: "2099-11-03T00:00:00Z",
  competition: "프리미어리그",
  home: { teamId: 1, name: "맨유", code: "mun" },
  away: { teamId: null, name: "브라이턴", code: "bha" },
  status: "OPEN",
  revealed: false,
  totalCount: null,
  distribution: null,
  myPick: null,
  topOpinion: null,
  outcome: null,
};
const ok = (data) =>
  new Response(JSON.stringify({ code: "OK", message: null, data }), {
    status: 200,
  });

test("홈·VS 투표 목록은 미참여→참여→마감의 대표 의견과 실제 0표를 보존한다", async (t) => {
  let response = debate;
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    requests.push({ url: String(url), init });
    return ok([response]);
  });
  const [locked] = await getDebates();
  assert.equal(locked.myVote, null);
  assert.equal(locked.topOpinion, null);
  assert.equal(locked.id, "7");
  assert.equal(locked.articleId, "70");

  response = { ...debate, myVote: "OPTION_A", topOpinion: opinion };
  const [voted] = await getDebates({ accessToken: "test-contract-token" });
  assert.equal(voted.myVote, "OPTION_A");
  assert.deepEqual(voted.topOpinion, opinion);

  response = { ...debate, contentType: "FINISH", topOpinion: opinion };
  const [closed] = await getDebates();
  assert.equal(closed.myVote, null);
  assert.deepEqual(closed.topOpinion, opinion);

  response = { ...debate, contentType: "FINISH", voteCountA: 0, voteCountB: 0 };
  const [empty] = await getDebates();
  assert.equal(empty.voteCountA + empty.voteCountB, 0);
  assert.equal(empty.topOpinion, null);
  assert.ok(requests.every(({ init }) => init.cache === "no-store"));
  assert.equal(
    new Headers(requests[1].init.headers).get("Authorization"),
    "Bearer test-contract-token",
  );
  assert.equal(
    new Headers(requests[2].init.headers).get("Authorization"),
    null,
  );
});

test("예측 목록은 두 페이지의 OPEN·마감 항목, 대표 의견과 마지막 null 커서를 받는다", async (t) => {
  const cursor = "after=101+closed&2";
  const settled = {
    ...match,
    matchId: 102,
    status: "SETTLED",
    revealed: true,
    totalCount: 5,
    distribution: { home: 60, draw: 0, away: 40 },
    topOpinion: {
      predictionId: 92,
      nickname: "원정팬",
      opinion: "원정 승리 예상",
    },
    outcome: { result: "AWAY", homeGoals: 0, awayGoals: 1, hitRate: 40 },
  };
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const query = new URL(String(url), "http://localhost");
    requests.push({ query, init });
    return ok(
      query.searchParams.has("cursor")
        ? { items: [settled], nextCursor: null }
        : { items: [match], nextCursor: cursor },
    );
  });
  const first = await getPredictionFeed();
  const last = await getPredictionFeed(first.nextCursor);
  assert.equal(first.nextCursor, cursor);
  assert.equal(last.nextCursor, null);
  assert.deepEqual(
    [...first.items, ...last.items].map((item) => item.matchId),
    [101, 102],
  );
  assert.deepEqual(first.items[0].opinions, []);
  assert.equal(first.items[0].distribution, null);
  assert.equal(first.items[0].home.code, "MUN");
  assert.equal(first.items[0].away.code, null);
  assert.deepEqual(last.items[0].opinions, [settled.topOpinion]);
  assert.deepEqual(last.items[0].outcome, settled.outcome);
  assert.equal(requests[1].query.searchParams.get("cursor"), cursor);
  assert.ok(
    requests.every(
      ({ query, init }) =>
        query.searchParams.get("size") === "20" && init.cache === "no-store",
    ),
  );
});

test("비공개 예측 응답의 의견도 카드에 싣고, 여러 건이 오면 그 목록을 쓴다 (KAN-714)", async (t) => {
  const single = { predictionId: 92, nickname: "숨김", opinion: "비공개 본문" };
  t.mock.method(globalThis, "fetch", async () =>
    ok({ items: [{ ...match, topOpinion: single }], nextCursor: null }),
  );
  assert.deepEqual((await getPredictionFeed()).items[0].opinions, [single]);
  assert.deepEqual((await getPredictionHome())[0].opinions, [single]);

  const many = [
    { predictionId: 93, nickname: "첫째", opinion: "a" },
    { predictionId: 94, nickname: "", opinion: "닉네임 없음" },
    { predictionId: 95, nickname: "셋째", opinion: "" },
    { predictionId: 96, nickname: "넷째", opinion: "d" },
  ];
  t.mock.method(globalThis, "fetch", async () =>
    ok({
      items: [{ ...match, topOpinion: single, topOpinions: many }],
      nextCursor: null,
    }),
  );
  assert.deepEqual((await getPredictionHome())[0].opinions, [many[0], many[3]]);

  t.mock.method(globalThis, "fetch", async () =>
    ok({ items: [{ ...match, topOpinion: null }], nextCursor: null }),
  );
  assert.deepEqual((await getPredictionHome())[0].opinions, []);
});

test("홈 카드는 BE의 마이팀 우선 순서를 킥오프 순으로 다시 세운다 (KAN-714)", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    ok({
      items: [
        { ...match, matchId: 3, kickoffAt: "2026-11-05T05:00:00+09:00" },
        { ...match, matchId: 1, kickoffAt: "2026-11-04T05:00:00+09:00" },
        { ...match, matchId: 2, kickoffAt: "2026-11-05T05:00:00+09:00" },
      ],
    }),
  );
  assert.deepEqual(
    (await getPredictionHome()).map((card) => card.matchId),
    [1, 3, 2],
  );
});

test("댓글의 참여 필요 403은 빈 목록으로 바꾸지 않고 전달하며 공개 재조회는 캐시하지 않는다", async (t) => {
  let locked = true;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(init.cache, "no-store");
    return locked
      ? new Response(
          JSON.stringify({
            code: "DEBATE_PARTICIPATION_REQUIRED",
            message: "참여하고 여론을 확인하세요!",
            data: null,
          }),
          { status: 403 },
        )
      : ok({ items: [], nextCursor: null });
  });
  await assert.rejects(getComments("70"), {
    status: 403,
    code: "DEBATE_PARTICIPATION_REQUIRED",
  });
  locked = false;
  assert.deepEqual(await getComments("70"), { items: [], nextCursor: null });
});
