import { unstable_cache } from "next/cache";
import { getTweet } from "react-tweet/api";
import type { Tweet } from "react-tweet/api";
import type { ReelCard } from "@plick/domain/types";
import type { ReelSeedTweet } from "@/_types/reels";
import { tweetIdFromUrl } from "@/_utils/tweet";

/**
 * 트윗 신디케이션 데이터를 서버에서 하루 캐시로 받는다 (KAN-422).
 *
 * 프록시(`/api/tweet/[id]`)와 같은 `getTweet`을 쓰되 페이지 렌더 중에 부르는
 * 용도라, 왕복(수백 ms)이 매 요청 TTFB에 얹히지 않게 Data Cache로 감싼다.
 * 트윗 본문은 사실상 불변이라 재검증 주기도 프록시의 Cache-Control과 같은
 * 하루다. 없는 트윗(원문 삭제)의 null도 하루 캐시된다 — 삭제가 되살아나는
 * 일은 없으니 문제없다.
 */
const getCachedTweet = unstable_cache(
  async (id: string) => (await getTweet(id)) ?? null,
  ["reel-seed-tweet"],
  { revalidate: 86400 },
);

/**
 * 첫 릴이 임베드 경로(사진 없음 + 트윗 링크)면 그 트윗 데이터를 서버에서 미리
 * 받아 씨앗으로 만든다 (KAN-422).
 *
 * LCP 요소인 임베드 이미지가 "하이드레이션 → 클라 fetch 후에야 발견"되는 체인을
 * 끊는 게 목적이다 — 씨앗이 있으면 임베드가 초기 HTML에 그려져 이미지 URL이
 * 문서에서 바로 발견된다(ADR 0113). 실패(신디케이션 장애 등)는 undefined로
 * 삼켜서 기존 클라 fetch 경로가 그대로 이어받는다.
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
  } catch {
    return undefined;
  }
}
