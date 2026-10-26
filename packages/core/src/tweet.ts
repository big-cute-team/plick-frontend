/**
 * @file 트윗 원문 링크 파싱과 릴 첫 장 preload 주소 (KAN-284, KAN-422, 공용 승격 KAN-673).
 *
 * 두 앱의 `_utils/tweet.ts`에 같은 코드로 있던 것을 올렸다. 웹이 첫 트윗 선로드를 받으면서
 * preload 주소 함수까지 두 벌이 될 참이었다.
 *
 * BE `sourceUrl`은 현재 전부 `https://x.com/<핸들>/status/<숫자ID>` 형태다
 * (be-verify 확인). 옛 twitter.com 도메인과 `/i/web/status/` 변형도 함께 받는다.
 */

import type { Tweet } from "react-tweet/api";
import {
  tweetPhotoSrcSet,
  tweetPhotoUrl,
  TWEET_GRID_SRCSET,
  TWEET_PHOTO_SIZE,
} from "@plick/domain/tweet-photo";

/**
 * 서버가 미리 받아 둔 첫 릴의 트윗 데이터 (KAN-422).
 *
 * 임베드를 초기 HTML에 그려 LCP 이미지가 문서에서 바로 발견되게 하는 씨앗이다.
 * 피드가 refetch로 갈리면 첫 릴이 바뀔 수 있어, 어느 릴의 것인지 id로 못박아
 * 그 릴에만 붙인다.
 */
export interface ReelSeedTweet {
  /** 이 트윗이 속한 릴 id. 피드의 릴과 대조해 일치할 때만 쓴다 */
  reelId: string;
  tweet: Tweet;
}

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
 * 임베드 사진은 `TweetMediaImg`(`@plick/ui`)가 react-tweet의 `getMediaUrl(media, "small")`
 * 결과를 webp로 바꿔 그린다. preload가 렌더와 같은 리소스를 맞히려면 여기도 같은 함수
 * (`tweetPhotoUrl`)로 같은 변형을 만들어야 한다. 다르면 이중 다운로드가 된다 (KAN-624).
 *
 * 영상 릴은 `media_url_https`가 포스터 이미지인데, 포스터는 react-tweet `TweetMediaVideo`가
 * 직접 `getMediaUrl`로 그려 포맷을 바꿀 수 없다. 그래서 사진만 webp고 영상은 원래 확장자다.
 *
 * @param tweet 서버에서 받아 둔 트윗 데이터
 * @returns 첫 미디어의 name=small URL. 미디어가 없으면 null.
 */
export function tweetImageUrl(tweet: Tweet): string | null {
  const media = tweet.mediaDetails?.[0];
  if (!media) return null;
  return tweetPhotoUrl(
    media.media_url_https,
    TWEET_PHOTO_SIZE,
    media.type === "photo" ? "webp" : undefined,
  );
}

/**
 * preload `<link imagesrcset>`에 줄 후보. 임베드가 격자(사진 두 장 이상)면 `TweetMediaImgGrid`가
 * 배율별 `srcset`을 달므로 preload도 같은 후보를 줘야 브라우저가 같은 파일을 고른다 (KAN-624).
 * 한 장이거나 영상이면 null이라 `href`만 간다.
 *
 * @param tweet 서버에서 받아 둔 트윗 데이터
 */
export function tweetImageSrcSet(tweet: Tweet): string | null {
  const media = tweet.mediaDetails ?? [];
  if (media.length < 2 || media[0]?.type !== "photo") return null;
  const src = tweetImageUrl(tweet);
  return src ? tweetPhotoSrcSet(src, TWEET_GRID_SRCSET) : null;
}
