/**
 * @file 게스트 → 소셜 연동의 순수 판정 (KAN-706). 두 앱의 실제 `_utils/guest-link.ts`에 같은 케이스를
 * 건다. 콜백의 게스트 판별(마감 쿠키 OR 세션 종류 쿠키)과 `/auth/link` 응답 뒤 토스트 종류 선택이다.
 * BE 배포 전 응답(`merged` 없음)에서 전처럼 `existing`으로 떨어지는지도 본다.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";

const APPS = ["mobile", "web"];

for (const name of APPS) {
  describe(`${name} 게스트 연동 판정`, async () => {
    const root = new URL(`../../apps/${name}/`, import.meta.url);
    const [{ isGuestSession, linkNoticeKind }, { GUEST_NOTICE, SESSION_KIND }] =
      await Promise.all([
        import(new URL("app/_utils/guest-link.ts", root).href),
        import(new URL("app/_constants/api.ts", root).href),
      ]);

    describe("isGuestSession", () => {
      test("마감 쿠키가 있으면 세션 종류와 무관하게 게스트다", () => {
        assert.equal(isGuestSession(true, undefined), true);
        assert.equal(isGuestSession(true, SESSION_KIND.user), true);
      });

      test("마감 쿠키만 사라져도 세션 종류가 guest면 게스트다", () => {
        assert.equal(isGuestSession(false, SESSION_KIND.guest), true);
      });

      test("둘 다 게스트가 아니면 로그인 갈래다", () => {
        assert.equal(isGuestSession(false, undefined), false);
        assert.equal(isGuestSession(false, SESSION_KIND.user), false);
        assert.equal(isGuestSession(false, "anything-else"), false);
      });
    });

    describe("linkNoticeKind", () => {
      test("새 소셜 계정으로 이어졌으면(linked) 토스트가 없다", () => {
        assert.equal(
          linkNoticeKind({ linked: true, merged: false }, false),
          null,
        );
        assert.equal(
          linkNoticeKind({ linked: true, merged: true }, false),
          null,
        );
      });

      test("기존 계정에 병합됐으면 merged다", () => {
        assert.equal(
          linkNoticeKind({ linked: false, merged: true }, false),
          GUEST_NOTICE.merged,
        );
      });

      test("기존 계정인데 병합이 안 됐으면 existing이다", () => {
        assert.equal(
          linkNoticeKind({ linked: false, merged: false }, false),
          GUEST_NOTICE.existing,
        );
      });

      test("BE 배포 전 응답(merged 없음)은 전처럼 existing이다", () => {
        assert.equal(
          linkNoticeKind({ linked: false }, false),
          GUEST_NOTICE.existing,
        );
      });

      test("로그아웃이 발급한 게스트면 어느 경우에도 토스트가 없다", () => {
        assert.equal(
          linkNoticeKind({ linked: false, merged: true }, true),
          null,
        );
        assert.equal(
          linkNoticeKind({ linked: false, merged: false }, true),
          null,
        );
        assert.equal(linkNoticeKind({ linked: false }, true), null);
      });
    });
  });
}
