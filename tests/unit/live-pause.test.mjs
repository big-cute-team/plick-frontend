/**
 * @file 라이브 스코어 일시 중단 경로 판정 테스트 (KAN-644). 닫을 화면만 잡고 채팅과 팀 기본 화면은 놓아두는 경계.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isLiveScorePath } from "../../packages/domain/src/live-pause.ts";

test("라이브 스코어 API에 기대는 화면을 잡는다", () => {
  for (const path of [
    "/live",
    "/live/",
    "/live/matches/1234",
    "/live/standings",
    "/players/276",
    "/teams/arsenal/profile",
  ]) {
    assert.equal(isLiveScorePath(path), true, path);
  }
});

test("채팅, 다른 화면, 준비중 화면 자신은 놓아둔다", () => {
  for (const path of [
    "/",
    "/live/chat",
    "/live/chat/session",
    "/live-paused",
    "/lives",
    "/teams/arsenal",
    "/figures/12",
    "/articles/1",
  ]) {
    assert.equal(isLiveScorePath(path), false, path);
  }
});
