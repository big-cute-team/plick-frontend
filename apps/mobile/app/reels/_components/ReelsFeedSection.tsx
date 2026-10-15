import { unstable_rethrow } from "next/navigation";
import { getReels } from "@plick/core/reels";
import type { InitialReelFeed } from "@plick/domain/types";
import { getReelSeedTweet } from "@/_services/tweet";
import type { ReelSeedTweet } from "@/_types/reels";
import { tweetImageSrcSet, tweetImageUrl } from "@/_utils/tweet";
import { ReelsFeed } from "./ReelsFeed";

/**
 * 릴스 피드와 그 씨앗. 첫 페이지는 `GET /api/v1/reels`로 여기서 미리 받아 내려준다.
 * 클라가 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고, 끝에 가까워지면 클라가
 * 커서로 이어받는다 (KAN-276).
 *
 * 첫 릴이 임베드 릴이면 트윗 데이터도 여기서 미리 받는다 (KAN-422). LCP인 임베드
 * 이미지가 초기 HTML에 그려지고, URL을 아는 김에 preload까지 걸어 프리로드 스캐너가
 * 최우선으로 내려받게 한다.
 *
 * 토큰 없이 받는다 (KAN-664, ADR 0200). 로그인 세션이면 BE가 안 본 릴을 먼저 주는
 * 개인화가 있는데, 첫 페이지는 그걸 포기하고 누구에게나 같은 최신순을 캐시에서 내보낸다.
 * 다음 페이지부터는 브라우저가 프록시를 거쳐 토큰을 실어 받으므로 개인화가 다시 붙는다.
 * 하트는 카드의 `liked`가 아니라 내 상태 캐시가 그린다.
 *
 * 릴스 페이지가 Suspense로 감싸 스트리밍한다 (KAN-602). ISR이 된 뒤에는 캐시된 HTML이
 * 통째로 나가 기다릴 일이 거의 없고, 재생성 중에만 의미가 있다.
 */
export async function ReelsFeedSection() {
  let initial: InitialReelFeed | undefined;
  let seedTweet: ReelSeedTweet | undefined;
  try {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다.
    // ISR이라 이 시각은 페이지가 생성된 시각이고 최대 60초 전일 수 있다
    const page = await getReels();
    initial = { page, fetchedAt: Date.now() };
    seedTweet = await getReelSeedTweet(page.items[0]);
  } catch (e) {
    /* Next가 제어 흐름으로 쓰는 예외(정적 생성 중단 등)는 되던진다 (KAN-632). 삼키면 빌드
       로그에 "로드 실패"로 찍히고 라우트 판정을 가로챌 수 있다 */
    unstable_rethrow(e);
    // 서버에서 못 받아도 페이지 전체를 에러로 떨어뜨리지 않는다.
    // 클라가 다시 받아 릴 자리에 에러와 재시도 버튼을 보여준다.
    console.error("[reels] 릴스 피드 초기 로드 실패:", e);
  }

  /* ReactDOM.preload() 호출이 아니라 <link> 렌더로 건다 — 임퍼러티브 호출은
     Data Cache 히트 요청에서 head에 실리지 않는 일이 있었다(콜드 요청만 방출).
     트리에 렌더한 <link rel="preload">는 React가 요청마다 head로 호이스팅한다 */
  const seedImageUrl = seedTweet ? tweetImageUrl(seedTweet.tweet) : null;
  const seedImageSrcSet = seedTweet ? tweetImageSrcSet(seedTweet.tweet) : null;

  return (
    <>
      {seedImageUrl && (
        <link
          rel="preload"
          as="image"
          href={seedImageUrl}
          imageSrcSet={seedImageSrcSet ?? undefined}
          fetchPriority="high"
        />
      )}
      <ReelsFeed initial={initial} seedTweet={seedTweet} />
    </>
  );
}
