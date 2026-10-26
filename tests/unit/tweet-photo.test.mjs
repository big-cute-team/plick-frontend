/**
 * @file 트윗 사진 주소 변형(KAN-624). 원본 경로와 react-tweet 변형 주소 양쪽에서 같은 결과가
 * 나오는지, 포맷 생략 시 원래 확장자를 지키는지, twimg 밖 주소는 손대지 않는지 본다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tweetAvatarUrl,
  tweetPhotoSrcSet,
  tweetPhotoUrl,
  TWEET_GRID_SRCSET,
} from "../../packages/domain/src/tweet-photo.ts";

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

test("배율별 srcset은 변형 주소에서 name만 바꿔 배율을 붙인다", () => {
  const webp = "https://pbs.twimg.com/media/AbC?format=webp&name=small";
  assert.equal(
    tweetPhotoSrcSet(webp, [
      ["240x240", 1],
      ["360x360", 2],
      ["small", 3],
    ]),
    "https://pbs.twimg.com/media/AbC?format=webp&name=240x240 1x, " +
      "https://pbs.twimg.com/media/AbC?format=webp&name=360x360 2x, " +
      "https://pbs.twimg.com/media/AbC?format=webp&name=small 3x",
  );
});

test("twimg 밖 주소에는 srcset을 만들지 않는다", () => {
  assert.equal(
    tweetPhotoSrcSet("https://cdn.example.com/a.jpg", [["small", 1]]),
    null,
  );
});

test("임베드 격자 후보는 배율 1·1.75·2에 240·360·small을 준다", () => {
  const webp = "https://pbs.twimg.com/media/AbC?format=webp&name=small";
  assert.equal(
    tweetPhotoSrcSet(webp, TWEET_GRID_SRCSET),
    "https://pbs.twimg.com/media/AbC?format=webp&name=240x240 1x, " +
      "https://pbs.twimg.com/media/AbC?format=webp&name=360x360 1.75x, " +
      "https://pbs.twimg.com/media/AbC?format=webp&name=small 2x",
  );
});

test("아바타 _normal은 _bigger로 바꾼다 (KAN-672)", () => {
  assert.equal(
    tweetAvatarUrl(
      "https://pbs.twimg.com/profile_images/1567939825474355200/qwJraMmT_normal.jpg",
    ),
    "https://pbs.twimg.com/profile_images/1567939825474355200/qwJraMmT_bigger.jpg",
  );
});

test("프로필 이미지 밖이나 _normal이 없는 주소는 그대로 둔다", () => {
  const other =
    "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
  assert.equal(tweetAvatarUrl(other), other);
  const big = "https://pbs.twimg.com/profile_images/1/a_400x400.jpg";
  assert.equal(tweetAvatarUrl(big), big);
});
