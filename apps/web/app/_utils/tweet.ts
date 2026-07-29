/**
 * @file 트윗 원문 링크 파싱 (KAN-284, web 이식 KAN-323). 모바일
 * `_utils/tweet.ts`와 동일 구현이다 — 순수 함수라 `@plick/core` 승격 후보이긴
 * 하지만 트윗 임베드 자체가 아직 두 앱에 갓 깔린 참이라 굳은 뒤에 본다.
 *
 * BE `sourceUrl`은 현재 전부 `https://x.com/<핸들>/status/<숫자ID>` 형태다
 * (be-verify 확인). 옛 twitter.com 도메인과 `/i/web/status/` 변형도 함께 받는다.
 */

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
