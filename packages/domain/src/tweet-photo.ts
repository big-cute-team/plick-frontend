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

/**
 * CDN 크기 변형. `thumb`는 150 정사각 크롭, `240x240`·`360x360`은 그 안에 맞춤(크롭 아님,
 * 1179×852 → 360×260), `small` 680, `medium` 1200, `large` 2048.
 */
export type TweetPhotoSize =
  | "thumb"
  | "240x240"
  | "360x360"
  | "small"
  | "medium"
  | "large";
export type TweetPhotoFormat = "jpg" | "png" | "webp";

/**
 * 카드와 임베드가 쓰는 변형. 모바일 카드 170 CSS px × DPR 3 = 510px, 데스크톱 웹 카드
 * 290 × 2 = 580px이라 `small`(680)이면 어느 화면에서도 1:1 이상이다.
 */
export const TWEET_PHOTO_SIZE: TweetPhotoSize = "small";

/**
 * react-tweet 임베드가 사진을 두 장 이상 격자로 그릴 때의 배율별 후보 (KAN-624).
 * 격자 칸은 임베드 폭의 절반(모바일 약 211 CSS px)이라 배율 1은 240, 1.75(Moto G 계열,
 * Lighthouse 기본 에뮬레이션)는 360(369 필요, 9px 모자람은 눈에 안 띈다), 2 이상은 680이다.
 * 한 장짜리는 임베드 폭 전체(약 377 CSS px)라 배율 1.75부터 680이 필요해 `small` 그대로 둔다.
 */
export const TWEET_GRID_SRCSET: ReadonlyArray<
  readonly [TweetPhotoSize, number]
> = [
  ["240x240", 1],
  ["360x360", 1.75],
  ["small", 2],
];

/** 트위터 CDN(`twimg.com`과 그 서브도메인) 사진 주소인지. 깨진 문자열은 false. */
export function isTweetPhotoUrl(url: string): boolean {
  return parseTweetPhotoUrl(url) !== null;
}

function parseTweetPhotoUrl(url: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname;
  if (host !== "twimg.com" && !host.endsWith(".twimg.com")) return null;
  return parsed;
}

/**
 * 배율별 후보를 묶은 `srcset`. 카드가 CSS px로 작고 고정이라 너비 서술자 대신 배율 서술자를
 * 쓴다. 너비 서술자는 사진마다 변형의 실제 너비(가로 680, 세로 510)를 알아야 하지만 배율
 * 서술자는 "이 배율엔 이 변형"만 적으면 돼 세로·가로 사진에 같은 규칙이 통한다 (KAN-624).
 *
 * 모바일 핫이슈 카드 170 CSS px: `240x240 1x, 360x360 2x, small 3x`. Lighthouse 기본 에뮬레이션
 * (DPR 1.75)과 배율 2 기기는 360(약 19KB)을, 배율 3 기기는 680(약 60KB)을 받는다.
 * 전부 `small`만 주면 1.75~2 기기에 2배 과해 "이미지 크기" 항목에 잡힌다.
 *
 * `twimg.com` 밖 주소면 null. 그때는 `srcset`을 달지 않는다.
 *
 * @param url 사진 주소 (원본 경로든 변형 주소든)
 * @param candidates `[변형, 배율]` 목록
 * @example tweetPhotoSrcSet(url, [["360x360", 1], ["small", 2]])
 */
export function tweetPhotoSrcSet(
  url: string,
  candidates: ReadonlyArray<readonly [TweetPhotoSize, number]>,
): string | null {
  if (!isTweetPhotoUrl(url)) return null;
  return candidates
    .map(([size, density]) => `${tweetPhotoUrl(url, size)} ${density}x`)
    .join(", ");
}

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
  const parsed = parseTweetPhotoUrl(url);
  if (!parsed) return url;

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

/**
 * 트윗 작성자 아바타를 `_normal`(48px) 대신 `_bigger`(73px)로 받는다 (KAN-672).
 *
 * 모바일 릴 임베드는 아바타를 2.125rem(약 37 CSS px)으로 줄여 그리는데, 배율 1.75 기기에서
 * 65px가 필요해 48px 원본은 Lighthouse `image-size-responsive`에 걸렸다. `_bigger`면 배율 2까지
 * 1:1 이상이다. 프로필 이미지 주소가 아니거나 `_normal`이 없으면 그대로 둔다.
 *
 * @param src react-tweet이 넘긴 `profile_image_url_https`
 * @example tweetAvatarUrl("https://pbs.twimg.com/profile_images/1/a_normal.jpg") → ".../1/a_bigger.jpg"
 */
export function tweetAvatarUrl(src: string): string {
  return src.replace(
    /^(https:\/\/pbs\.twimg\.com\/profile_images\/.+)_normal(\.\w+)$/,
    "$1_bigger$2",
  );
}
