/**
 * @file 트윗 사진 주소 변형(KAN-624). 원본 경로와 react-tweet 변형 주소 양쪽에서 같은 결과가
 * 나오는지, 포맷 생략 시 원래 확장자를 지키는지, twimg 밖 주소는 손대지 않는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { tweetPhotoUrl } from "../../packages/domain/src/tweet-photo.ts";

const RAW = "https://pbs.twimg.com/media/HUXzRRXXUAEspVd.jpg";
const VARIANT =
  "https://pbs.twimg.com/media/HUXzRRXXUAEspVd?format=jpg&name=small";

test("원본 경로에 small·webp를 붙이면 react-tweet 모양이 된다", () => {
  assert.equal(
    tweetPhotoUrl(RAW, "small", "webp"),
    "https://pbs.twimg.com/media/HUXzRRXXUAEspVd?format=webp&name=small",
  );
});

test("react-tweet 변형 주소도 같은 결과다 (preload와 임베드 src가 글자까지 같아야 한다)", () => {
  assert.equal(
    tweetPhotoUrl(VARIANT, "small", "webp"),
    tweetPhotoUrl(RAW, "small", "webp"),
  );
});

test("포맷을 생략하면 원래 확장자나 기존 format을 지킨다", () => {
  assert.equal(
    tweetPhotoUrl(RAW, "small"),
    "https://pbs.twimg.com/media/HUXzRRXXUAEspVd?format=jpg&name=small",
  );
  assert.equal(
    tweetPhotoUrl("https://pbs.twimg.com/media/AbC.png", "medium"),
    "https://pbs.twimg.com/media/AbC?format=png&name=medium",
  );
  assert.equal(
    tweetPhotoUrl(
      "https://pbs.twimg.com/media/AbC?format=png&name=large",
      "small",
    ),
    "https://pbs.twimg.com/media/AbC?format=png&name=small",
  );
});

test("기본 크기는 small이다", () => {
  assert.match(tweetPhotoUrl(RAW), /name=small$/);
});

test("twimg 밖 주소와 깨진 문자열은 그대로 돌려준다", () => {
  const other = "https://cdn.example.com/a/b.jpg?x=1";
  assert.equal(tweetPhotoUrl(other, "small", "webp"), other);
  assert.equal(tweetPhotoUrl("not a url", "small"), "not a url");
  const fake = "https://fake-twimg.com/media/AbC.jpg";
  assert.equal(tweetPhotoUrl(fake, "small", "webp"), fake);
});
