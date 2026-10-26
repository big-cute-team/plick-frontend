"use client";

import { useTweet } from "react-tweet";
import type { Tweet } from "react-tweet/api";
import { tweetIdFromUrl } from "@plick/core/tweet";
import { KstEmbeddedTweet } from "@plick/ui/KstEmbeddedTweet";
import { TweetAvatarImg } from "@plick/ui/TweetAvatarImg";
import { TweetMediaImg, TweetMediaImgGrid } from "@plick/ui/TweetMediaImg";

/**
 * 사진 한 장: `small` 그대로. 두 장 이상 격자: 배율별 srcset (KAN-624).
 * 아바타는 둘 다 한 단계 큰 변형이다 (KAN-672, 웹 KAN-673)
 */
const SINGLE_COMPONENTS = {
  MediaImg: TweetMediaImg,
  AvatarImg: TweetAvatarImg,
};
const GRID_COMPONENTS = {
  MediaImg: TweetMediaImgGrid,
  AvatarImg: TweetAvatarImg,
};

/**
 * 사진이 null인 릴의 미디어 자리를 대신하는 원문 트윗 임베드
 * (KAN-296, web 이식 KAN-323).
 *
 * 릴스 실계약의 `reelsImageUrl`이 현재 전건 null이라, 사진 자리를 비워 두면
 * 릴이 통째로 빈 카드가 된다. 모바일은 그 자리를 원문 트윗으로 채우기로 했고
 * (ADR 0037) web도 같은 화면을 쓴다.
 *
 * 모바일 `_components/TweetEmbed.tsx`의 `layout="reel"` 경로만 옮긴 축소판이다.
 * 모바일의 `fill`·`flow` 레이아웃과 그 부속({@link useTweetFit}, 미디어 제거)은
 * 홈 캐러셀·기사 세부에서 박스에 가둬야 할 때 쓰는 것이라 web에는 쓸 자리가
 * 없어 가져오지 않았다. 릴은 미디어를 숨기지도 축소하지도 자르지도 않고
 * 자연 높이·전폭으로 세운다 — 원문을 사진째 보여주는 게 목적이다.
 *
 * 데이터는 자체 프록시(`/api/tweet/[id]`)에서 받는다 — react-tweet의 기본
 * 엔드포인트(react-tweet.vercel.app)는 공용 rate limit을 탄다. 로딩 중에는
 * 아무것도 그리지 않아 릴 배경색이 그대로 남고, 실패가 확정되면(원문 삭제,
 * 트윗 링크 아님, API 장애) 배경 가운데에 안내 문구만 세운다 — useTweet이
 * 재시도 없이(shouldRetryOnError: false) error를 확정해 줘서 로딩과 구분된다.
 *
 * 임베드 내부 링크·액션(답글·마음·프로필)은 전역 CSS에서 전부 꺼뒀다
 * (globals.css) — 임베드는 읽기 전용 미디어고, 클릭은 항상 우리 화면이 받는다.
 *
 * `seedTweet`이 오면 클라 fetch를 하지 않는다 (KAN-673, 모바일 KAN-422). 서버가 미리 받아 둔
 * 데이터로 SSR 시점에 임베드가 그려져 LCP인 첫 트윗이 초기 HTML에 들어간다. useTweet은 id와
 * apiUrl이 둘 다 없으면 swr 키가 null이라 요청 자체가 나가지 않는다.
 *
 * 그래서 카드는 react-tweet `EmbeddedTweet` 대신 `KstEmbeddedTweet`으로 그린다 (모바일 KAN-672).
 * 원본은 작성 시각을 타임존 없이 포맷해 서버(UTC)와 브라우저(KST)의 글자가 달라 하이드레이션이
 * 깨진다.
 *
 * @param url 원문 트윗 링크(`sourceUrl`). 트윗 링크가 아니면 안내 문구를 세운다.
 * @param seedTweet 서버가 미리 받아 둔 트윗 데이터. 있으면 클라 fetch 생략.
 */
export function TweetEmbed({
  url,
  seedTweet,
}: {
  url: string;
  seedTweet?: Tweet;
}) {
  const id = tweetIdFromUrl(url);
  const skipFetch = Boolean(seedTweet) || !id;
  const { data: fetched, error } = useTweet(
    skipFetch ? undefined : id,
    skipFetch ? undefined : `/api/tweet/${id}`,
  );
  const data = seedTweet ?? fetched;

  if (data)
    return (
      <KstEmbeddedTweet
        tweet={data}
        components={
          (data.mediaDetails?.length ?? 0) > 1
            ? GRID_COMPONENTS
            : SINGLE_COMPONENTS
        }
      />
    );
  /* data === null은 없는 트윗(원문 삭제). 프록시가 404 대신 200으로 준다 (KAN-673) */
  if (!id || error || data === null) {
    return (
      <p className="text-body text-text-4 text-center">
        원문이 삭제됐거나 불러오지 못했어요
      </p>
    );
  }
  return null;
}
