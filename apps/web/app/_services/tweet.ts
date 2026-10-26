import { unstable_cache } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getTweet } from "react-tweet/api";
import type { Tweet } from "react-tweet/api";
import { type ReelSeedTweet, tweetIdFromUrl } from "@plick/core/tweet";
import type { ReelCard } from "@plick/domain/types";

/**
 * 트윗 신디케이션 데이터를 서버에서 하루 캐시로 받는다 (모바일 KAN-422, web 이식 KAN-673).
 * 모바일 `_services/tweet.ts`와 같은 구현이다. `unstable_cache`가 `next/cache`라 패키지로
 * 올리지 못하고 앱마다 둔다.
 *
 * 페이지 렌더 중에 부르는 용도라 왕복(수백 ms)이 ISR 재생성마다 얹히지 않게 Data Cache로
 * 감싼다. 트윗 본문은 사실상 불변이라 재검증 주기는 하루다. 없는 트윗의 null도 하루 캐시된다.
 */
const getCachedTweet = unstable_cache(
  async (id: string) => (await getTweet(id)) ?? null,
  ["reel-seed-tweet"],
  { revalidate: 86400 },
);

/**
 * 첫 릴이 임베드 경로(사진 없음 + 트윗 링크)면 그 트윗 데이터를 서버에서 미리 받아 씨앗으로
 * 만든다 (KAN-673).
 *
 * 웹 릴스 LCP는 첫 트윗 본문이다. 씨앗이 없으면 `TweetEmbed`가 하이드레이션 뒤
 * `/api/tweet/{id}`를 받고서야 그려져, ISR HTML이 CDN에서 바로 와도 LCP가 그 왕복을 기다렸다.
 * 씨앗이 있으면 임베드가 초기 HTML에 들어간다. 실패(신디케이션 장애 등)는 undefined로 삼켜
 * 기존 클라 fetch 경로가 이어받는다.
 *
 * @param reel 피드 첫 릴 (`items[0]`). 없거나 사진 릴이면 undefined.
 */
export async function getReelSeedTweet(
  reel: ReelCard | undefined,
): Promise<ReelSeedTweet | undefined> {
  if (!reel || reel.imageUrl || !reel.sourceUrl) return undefined;
  const id = tweetIdFromUrl(reel.sourceUrl);
  if (!id) return undefined;
  try {
    const tweet: Tweet | null = await getCachedTweet(id);
    return tweet ? { reelId: reel.id, tweet } : undefined;
  } catch (e) {
    /* 정적 생성 중단 같은 Next 제어 흐름 예외는 되던진다 (KAN-673 리뷰) */
    unstable_rethrow(e);
    return undefined;
  }
}
