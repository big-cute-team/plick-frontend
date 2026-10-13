/**
 * @file 트위터 CDN(`pbs.twimg.com`) 사진 주소의 크기·포맷 변형 (KAN-624).
 *
 * 트윗 사진 주소를 만드는 규칙이 핫이슈 카드(`@plick/core/tweet-media`, `name=large`)와
 * 릴 preload(모바일 `_utils/tweet.ts`, `name=small`) 두 곳에 따로 있었다. 카드는 트랙 절반
 * 폭(170 CSS px, DPR 3이면 510px)인데 `large`(2048px)를 받아 홈 LCP가 7.7초였다.
 * 규칙을 여기 하나로 모으고, 그리는 쪽이 크기와 포맷을 고른다.
 *
 * CDN 변형은 `name=`으로 고른다. `thumb` 150 정사각, `small` 긴 변 680, `medium` 1200,
 * `large` 2048. 원본이 그보다 작으면 그 위 변형은 전부 원본 그대로다. 포맷은 `format=`으로
 * 고르고 webp도 준다(같은 사진 small 기준 jpg 대비 2~30% 작다).
 */

export type TweetPhotoSize = "thumb" | "small" | "medium" | "large";
export type TweetPhotoFormat = "jpg" | "png" | "webp";

/**
 * 카드와 임베드가 쓰는 변형. 모바일 카드 170 CSS px × DPR 3 = 510px, 데스크톱 웹 카드
 * 290 × 2 = 580px이라 `small`(680)이면 어느 화면에서도 1:1 이상이다.
 */
export const TWEET_PHOTO_SIZE: TweetPhotoSize = "small";

/**
 * 트윗 사진 주소에 크기·포맷 변형을 붙인다.
 *
 * 입력은 신디케이션이 주는 변형 없는 원본 경로(`…/ID.jpg`)든, react-tweet이 만든
 * 변형 주소(`…/ID?format=jpg&name=small`)든 받는다. 확장자는 경로에서 떼어 `format`으로
 * 옮긴다(react-tweet `getMediaUrl`과 같은 모양). `format`을 안 주면 원래 확장자(또는 이미
 * 붙어 있던 `format`)를 유지한다. 영상 포스터처럼 react-tweet이 직접 그리는 주소와 글자까지
 * 같아야 할 때 그렇게 쓴다.
 *
 * `twimg.com` 밖 주소(BE 대표 이미지 등)는 손대지 않고 돌려준다.
 *
 * @param url 사진 주소
 * @param size CDN 크기 변형
 * @param format 바꿀 포맷. 생략하면 원래 포맷
 * @example tweetPhotoUrl("https://pbs.twimg.com/media/AbC.jpg", "small", "webp")
 *   // "https://pbs.twimg.com/media/AbC?format=webp&name=small"
 */
export function tweetPhotoUrl(
  url: string,
  size: TweetPhotoSize = TWEET_PHOTO_SIZE,
  format?: TweetPhotoFormat,
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!parsed.hostname.endsWith("twimg.com")) return url;

  const file = parsed.pathname.split("/").pop() ?? "";
  const dot = file.lastIndexOf(".");
  const extension = dot > 0 ? file.slice(dot + 1) : null;
  if (extension) {
    parsed.pathname = parsed.pathname.slice(0, -(extension.length + 1));
  }

  const resolvedFormat =
    format ?? parsed.searchParams.get("format") ?? extension;
  if (resolvedFormat) parsed.searchParams.set("format", resolvedFormat);
  parsed.searchParams.set("name", size);
  return parsed.toString();
}
