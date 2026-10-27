/**
 * @file 투표 집계 캐시 동기화 테스트 (KAN-681). 같은 토론이 투표 리스트·릴스 피드·기사별
 * 토론 캐시 세 곳에 살고, `syncDebateVote`가 셋을 함께 고치는지 본다. 기사별 토론 캐시는
 * 기사 상세가 ISR 씨앗 위에 브라우저에서 다시 받는 쿼리라 KAN-681에서 새로 합류했다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { syncDebateVote } from "../../packages/core/src/debate-sync.ts";
import { debateKeys } from "../../packages/core/src/debateKeys.ts";

/**
 * `setQueriesData`만 흉내 낸 QueryClient. 키 접두어가 맞는 엔트리마다 updater를 돌려
 * 결과를 되쓴다. 실제 TanStack과 같은 접두어 매칭이다.
 */
function fakeQueryClient(entries) {
  const store = new Map(
    entries.map(([key, data]) => [JSON.stringify(key), data]),
  );
  return {
    setQueriesData({ queryKey }, updater) {
      for (const [raw, data] of store) {
        const key = JSON.parse(raw);
        const matches = queryKey.every((part, i) => part === key[i]);
        if (matches) store.set(raw, updater(data));
      }
    },
    get(key) {
      return store.get(JSON.stringify(key));
    },
  };
}

const next = { voteCountA: 11, voteCountB: 4, myVote: "OPTION_A" };

test("리스트·릴스 피드·기사별 토론 캐시의 같은 토론을 함께 고친다", () => {
  const client = fakeQueryClient([
    [
      debateKeys.list(),
      [
        { id: "7", voteCountA: 10, voteCountB: 4, myVote: null },
        { id: "8", voteCountA: 1, voteCountB: 1, myVote: null },
      ],
    ],
    [
      ["reels", "feed"],
      {
        pages: [
          {
            items: [
              { id: "70", debate: { id: "7", voteCountA: 10, voteCountB: 4 } },
              { id: "80", debate: null },
            ],
          },
        ],
        pageParams: [null],
      },
    ],
    [debateKeys.byArticle("70"), { id: "7", voteCountA: 10, voteCountB: 4 }],
    [debateKeys.byArticle("80"), { id: "8", voteCountA: 1, voteCountB: 1 }],
  ]);

  syncDebateVote(client, "7", next);

  assert.deepEqual(client.get(debateKeys.list())[0], { id: "7", ...next });
  assert.deepEqual(client.get(debateKeys.list())[1], {
    id: "8",
    voteCountA: 1,
    voteCountB: 1,
    myVote: null,
  });
  assert.deepEqual(client.get(["reels", "feed"]).pages[0].items[0].debate, {
    id: "7",
    ...next,
  });
  assert.deepEqual(client.get(debateKeys.byArticle("70")), {
    id: "7",
    ...next,
  });
  assert.deepEqual(client.get(debateKeys.byArticle("80")), {
    id: "8",
    voteCountA: 1,
    voteCountB: 1,
  });
});

test("기사별 토론이 null(토론 없음)이거나 캐시가 비어 있으면 그냥 지나간다", () => {
  const client = fakeQueryClient([[debateKeys.byArticle("90"), null]]);

  assert.doesNotThrow(() => syncDebateVote(client, "7", next));
  assert.equal(client.get(debateKeys.byArticle("90")), null);
  assert.equal(client.get(debateKeys.list()), undefined);
});
