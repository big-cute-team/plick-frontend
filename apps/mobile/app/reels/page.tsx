import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { AppShell } from "@/_components/AppShell";
import { ReelsFeed } from "./_components/ReelsFeed";
import { TabBar } from "@/_components/TabBar";
import { WEB_SITE_URL } from "@/_constants/site";
import { getReels } from "@plick/core/reels";
import { getAccessToken } from "@/_services/session";
import { getReelSeedTweet } from "@/_services/tweet";
import { tweetImageUrl } from "@/_utils/tweet";
import type { InitialReelFeed } from "@plick/domain/types";
import type { ReelSeedTweet } from "@/_types/reels";

/** canonical은 데스크톱 릴스다 (KAN-346) — 모바일 홈 canonical과 같은 이유. */
export const metadata: Metadata = {
  title: "릴스",
  description: PAGE_DESCRIPTIONS.reels,
  alternates: { canonical: `${WEB_SITE_URL}/reels` },
};

/**
 * 릴스 화면 (KAN-167) — 풀스크린 미디어 위에 탭바를 오버레이로 얹는다.
 *
 * 첫 페이지는 `GET /api/v1/reels`로 여기서 미리 받아 내려준다. 클라가 같은 데이터를
 * 또 부르는 이중 페치를 막는 씨앗이고, 끝에 가까워지면 클라가 커서로 이어받는다 (KAN-276).
 *
 * 첫 릴이 임베드 릴이면 트윗 데이터도 여기서 미리 받는다 (KAN-422) — LCP인 임베드
 * 이미지가 초기 HTML에 그려지고, URL을 아는 김에 preload까지 걸어 프리로드 스캐너가
 * 최우선으로 내려받게 한다.
 */
export default async function ReelsPage() {
  let initial: InitialReelFeed | undefined;
  let seedTweet: ReelSeedTweet | undefined;
  try {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다.
    // 토큰을 실어야 응답의 `likedByMe`가 이 유저 기준으로 온다 (KAN-308)
    const page = await getReels({ accessToken: await getAccessToken() });
    initial = { page, fetchedAt: Date.now() };
    seedTweet = await getReelSeedTweet(page.items[0]);
  } catch (e) {
    // 서버에서 못 받아도 페이지 전체를 에러로 떨어뜨리지 않는다.
    // 클라가 다시 받아 릴 자리에 에러와 재시도 버튼을 보여준다.
    console.error("[reels] 릴스 피드 초기 로드 실패:", e);
  }

  /* ReactDOM.preload() 호출이 아니라 <link> 렌더로 건다 — 임퍼러티브 호출은
     Data Cache 히트 요청에서 head에 실리지 않는 일이 있었다(콜드 요청만 방출).
     트리에 렌더한 <link rel="preload">는 React가 요청마다 head로 호이스팅한다 */
  const seedImageUrl = seedTweet ? tweetImageUrl(seedTweet.tweet) : null;

  return (
    <AppShell>
      {seedImageUrl && (
        <link
          rel="preload"
          as="image"
          href={seedImageUrl}
          fetchPriority="high"
        />
      )}
      <ReelsFeed initial={initial} seedTweet={seedTweet} />
      <TabBar variant="overlay" />
    </AppShell>
  );
}
