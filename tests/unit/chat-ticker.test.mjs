/**
 * @file 홈 채팅방 띠의 줄 계산(`apps/mobile/app/_utils/chat-ticker.ts`, KAN-684) 회귀 테스트.
 * 훅 목록이 병합·교체될 때 띠가 어느 줄을 들고 있어야 하는지를 고정한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextTickerRows,
  settleTickerRows,
} from "../../apps/mobile/app/_utils/chat-ticker.ts";

const CAP = 3;

/** n번째 글. 사람·시각·본문이 모두 달라 키가 겹치지 않는다 */
function msg(n) {
  return {
    type: "MESSAGE",
    userId: 100 + n,
    nickname: `팬${n}`,
    content: `글 ${n}`,
    sentAt: `2026-10-30T12:00:${String(n).padStart(2, "0")}+09:00`,
  };
}

/** 1부터 n까지의 목록 */
function list(from, to) {
  const out = [];
  for (let i = from; i <= to; i++) out.push(msg(i));
  return out;
}

test("첫 목록은 끝 줄들로 띠를 채운다", () => {
  const rows = nextTickerRows([], [], list(1, 50), CAP);
  assert.deepEqual(
    rows.map((m) => m.content),
    ["글 48", "글 49", "글 50"],
  );
});

test("빈 목록이 오면 줄을 건드리지 않는다", () => {
  const rows = list(1, 3);
  assert.equal(nextTickerRows(rows, [], [], CAP), rows);
});

test("병합된 새 글은 지금 줄 뒤에 붙는다", () => {
  const prev = list(1, 5);
  const rows = nextTickerRows([], [], prev, CAP);
  const next = nextTickerRows(rows, prev, list(1, 6), CAP);
  assert.deepEqual(
    next.map((m) => m.content),
    ["글 3", "글 4", "글 5", "글 6"],
  );
});

test("새 글이 없으면 같은 배열을 돌려준다", () => {
  const prev = list(1, 5);
  const rows = nextTickerRows([], [], prev, CAP);
  assert.equal(nextTickerRows(rows, prev, prev, CAP), rows);
});

test("지난 목록의 마지막 글이 없으면(교체) 새 목록의 끝 줄들로 바꿔 끼운다", () => {
  const prev = list(1, 5);
  const rows = nextTickerRows([], [], prev, CAP);
  const next = nextTickerRows(rows, prev, list(20, 70), CAP);
  assert.deepEqual(
    next.map((m) => m.content),
    ["글 68", "글 69", "글 70"],
  );
});

test("새 글이 줄 수보다 많으면 끝 줄들만 붙인다", () => {
  const prev = list(1, 5);
  const rows = nextTickerRows([], [], prev, CAP);
  const next = nextTickerRows(rows, prev, list(1, 15), CAP);
  assert.deepEqual(
    next.map((m) => m.content),
    ["글 3", "글 4", "글 5", "글 13", "글 14", "글 15"],
  );
});

test("전환이 끝나기 전에 또 오면 전체를 줄 수의 두 배 안으로 자른다", () => {
  const first = list(1, 5);
  let rows = nextTickerRows([], [], first, CAP);
  const second = list(1, 7);
  rows = nextTickerRows(rows, first, second, CAP);
  rows = nextTickerRows(rows, second, list(1, 9), CAP);
  assert.deepEqual(
    rows.map((m) => m.content),
    ["글 4", "글 5", "글 6", "글 7", "글 8", "글 9"],
  );
});

test("settle은 줄 수를 넘긴 앞을 버리고, 안이면 같은 배열이다", () => {
  const rows = list(1, 5);
  assert.deepEqual(
    settleTickerRows(rows, CAP).map((m) => m.content),
    ["글 3", "글 4", "글 5"],
  );
  const fit = list(1, 3);
  assert.equal(settleTickerRows(fit, CAP), fit);
});
