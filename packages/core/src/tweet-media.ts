/**
 * @file 원문 X 게시물에서 사진 URL만 뽑아 핫이슈 카드에 채운다 (KAN-484).
 *
 * BE가 핫이슈를 원문 사진 유무로 갈라 주지만(KAN-487), 그 기준은 원문 게시물의
 * `raw_articles.media_url`이고 카드가 그리는 `imageUrl`은 기사 대표 이미지
 * (`article_summaries.image_url`)라 서로 다른 컬럼이다. 그래서 "사진 있는" 그룹으로
 * 온 기사도 `imageUrl`이 null인 경우가 생긴다.
 *
 * 그때까지는 카드가 원문 트윗을 통째로 임베드해 칸을 메웠는데, 임베드는 프로필
 * 사진·아이디·본문·버튼까지 다 들고 와서 캐러셀 칸에 들어가면 사진이 주인공이
 * 아니게 된다. 여기서는 신디케이션 응답의 사진만 골라 카드 배경으로 쓴다.
 *
 * 서버에서만 부른다 — 신디케이션 API를 브라우저가 직접 부르면 공용 rate limit을
 * 탄다(각 앱 `/api/tweet/[id]` 프록시를 둔 것과 같은 이유).
 */
import { getTweet } from "react-tweet/api";
import type { HotArticle } from "@plick/domain/types";

/** x.com·twitter.com 게시물 URL에서 숫자 id를 뽑는 패턴. */
const TWEET_URL = /(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/;

/**
 * 트윗 본문은 사실상 불변이라 하루를 재사용한다 — 홈이 열릴 때마다 최대 5건을
 * 신디케이션에 물어보면 첫 바이트가 그만큼 늦어진다.
 */
const TWEET_REVALIDATE_SECONDS = 86_400;

/**
 * 사진 URL에 붙이는 크기 변형. 신디케이션이 주는 `media_url_https`는 변형이 없는
 * 원본 경로라 `name=large`를 붙여야 큰 판을 받는다.
 */
const LARGE_VARIANT = "name=large";

/** 게시물 URL → 트윗 id. 트윗 링크가 아니거나 null이면 null. */
export function tweetIdFrom(url: string | null): string | null {
  if (!url) return null;
  return TWEET_URL.exec(url)?.[1] ?? null;
}

/**
 * 그 게시물에 붙은 사진 중 가장 큰 것 하나의 URL. 사진이 없거나(텍스트·영상만)
 * 신디케이션이 실패하면 null이다.
 *
 * 영상·GIF는 뺀다 — 그 자리에 오는 건 재생 전 포스터 프레임이라 "게시물에 있는
 * 사진"이 아니다. 프로필 사진은 `photos`·`mediaDetails` 어디에도 없어 따로 거를
 * 것이 없다.
 *
 * @param sourceUrl 기사 원문 링크 (`HotArticle.sourceUrl`)
 */
export async function largestTweetPhoto(
  sourceUrl: string | null,
): Promise<string | null> {
  const id = tweetIdFrom(sourceUrl);
  if (id === null) return null;

  let tweet;
  try {
    tweet = await getTweet(id, {
      next: { revalidate: TWEET_REVALIDATE_SECONDS },
    } as RequestInit);
  } catch {
    /* 신디케이션 장애 — 사진 없이 그리면 되므로 삼킨다 */
    return null;
  }
  if (!tweet) return null;

  const photos = (tweet.mediaDetails ?? []).filter(
    (media) => media.type === "photo",
  );
  if (photos.length > 0) {
    const biggest = photos.reduce((best, media) =>
      area(media.original_info) > area(best.original_info) ? media : best,
    );
    return withLargeVariant(biggest.media_url_https);
  }

  /* `mediaDetails`가 없는 옛 응답 형태의 폴백. 여기 url은 이미 변형이 붙어 있을
     수 있어 그대로 쓴다 */
  const fallback = tweet.photos ?? [];
  if (fallback.length === 0) return null;
  return fallback.reduce((best, photo) =>
    photo.width * photo.height > best.width * best.height ? photo : best,
  ).url;
}

/**
 * 핫이슈 목록에서 `imageUrl`이 빈 카드만 원문 사진으로 채운 새 목록.
 *
 * 이미 대표 이미지가 있는 카드는 신디케이션을 부르지 않는다. 못 채운 카드는
 * `imageUrl`이 null 그대로라 카드 쪽 빈 배경 처리로 떨어진다.
 *
 * @param articles 사진 있는 그룹(`HotArticles.withImage`)
 */
export async function withTweetPhotos(
  articles: HotArticle[],
): Promise<HotArticle[]> {
  return Promise.all(
    articles.map(async (article) => {
      if (article.imageUrl) return article;
      const photo = await largestTweetPhoto(article.sourceUrl);
      return photo ? { ...article, imageUrl: photo } : article;
    }),
  );
}

function area(info: { width: number; height: number }): number {
  return info.width * info.height;
}

/** 변형이 없는 원본 경로에만 `name=large`를 붙인다. */
function withLargeVariant(url: string): string {
  return url.includes("?") ? url : `${url}?${LARGE_VARIANT}`;
}
