/**
 * @file 트윗 원문 링크 파싱 (KAN-284).
 *
 * BE `sourceUrl`은 현재 전부 `https://x.com/<핸들>/status/<숫자ID>` 형태다
 * (be-verify 확인). 옛 twitter.com 도메인과 `/i/web/status/` 변형도 함께 받는다.
 */

import type { Tweet } from "react-tweet/api";

/* 도메인 앞 경계는 시작·`/`(스킴 뒤)·`.`(서브도메인)만 허용해 fakex.com류를 거른다 */
const TWEET_URL_PATTERN =
  /(?:^|[/.])(?:x|twitter)\.com\/(?:i\/web|[^/]+)\/status(?:es)?\/(\d+)/;

/**
 * 원문 링크에서 트윗 status ID를 뽑는다. 트윗 링크가 아니면 null.
 *
 * @param url 기사·릴의 `sourceUrl`
 * @example tweetIdFromUrl("https://x.com/BBCMOTD/status/2076269946137608440") // "2076269946137608440"
 */
export function tweetIdFromUrl(url: string): string | null {
  return TWEET_URL_PATTERN.exec(url)?.[1] ?? null;
}

/**
 * 임베드가 실제로 그릴 미디어 이미지 URL을 만든다 (KAN-422, preload용).
 *
 * react-tweet `TweetMedia`의 `getMediaUrl(media, "small")`과 같은 규칙이어야
 * preload가 렌더와 같은 리소스를 맞힌다 — 다르면 이중 다운로드가 된다.
 * (getMediaUrl은 패키지 외부로 export되지 않아 여기 옮겨 적었다. react-tweet
 * 버전을 올리면 규칙이 같은지 확인할 것.) 영상 릴은 `media_url_https`가 포스터
 * 이미지라 같은 규칙이 통한다.
 *
 * @param tweet 서버에서 받아 둔 트윗 데이터
 * @returns 첫 미디어의 name=small URL. 미디어가 없으면 null.
 */
export function tweetImageUrl(tweet: Tweet): string | null {
  const media = tweet.mediaDetails?.[0];
  if (!media) return null;
  const url = new URL(media.media_url_https);
  const extension = url.pathname.split(".").pop();
  if (!extension) return media.media_url_https;
  url.pathname = url.pathname.replace(`.${extension}`, "");
  url.searchParams.set("format", extension);
  url.searchParams.set("name", "small");
  return url.toString();
}
