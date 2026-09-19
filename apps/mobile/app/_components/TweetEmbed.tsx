"use client";

import { EmbeddedTweet, useTweet } from "react-tweet";
import type { Tweet } from "react-tweet/api";
import { tweetIdFromUrl } from "@/_utils/tweet";

/**
 * 사진이 null인 카드의 사진 자리를 대신하는 원문 트윗 임베드 (KAN-284).
 *
 * 미디어(사진)를 그대로 살려 자연 높이·전폭으로 선다 — 릴스 최종 임베딩
 * 전략(KAN-296). 미디어를 숨기지도 축소하지도 자르지도 않고, 카드가 부모
 * 영역보다 크면 부모가 위에 붙여 자기 높이만큼 그대로 세운다. 릴은 칩·제목
 * 뒤로 겹치고, 홈 핫이슈 카드는 `overflow-hidden` 상자가 아래를 잘라 낸다.
 * 임베드 내부 링크·액션(답글·마음·프로필)은 전역 CSS에서 전부 꺼뒀다
 * (globals.css, KAN-297) — 임베드는 읽기 전용 미디어다.
 *
 * KAN-525 전에는 `fill`(부모 박스에 맞춰 미디어를 숨기고 잔여분을 축소)과
 * `flow`(문서 흐름 자연 높이) 레이아웃이 더 있었다. `fill`은 홈 핫이슈 카드가
 * 썼는데, 카드 칸이 150px 남짓으로 줄자 긴 트윗이 절반 폭으로 축소돼 양옆이
 * 비었다. 가로를 꽉 채우는 쪽이 맞아 이 레이아웃 하나로 합쳤고, `flow`는
 * 쓰는 곳이 없었다. 웹 `TweetEmbed`와 같은 모양이 됐다.
 *
 * 데이터는 자체 프록시(`/api/tweet/[id]`)에서 받는다 — react-tweet의 기본
 * 엔드포인트(react-tweet.vercel.app)는 공용 rate limit을 탄다. 실패가
 * 확정되면(원문 삭제, 트윗 링크 아님, API 장애) 안내 문구를 세운다. useTweet이
 * 재시도 없이(shouldRetryOnError: false) error를 확정해 줘서 로딩과 구분된다.
 * 로딩 중에는 아무것도 그리지 않아 뒤의 배경색이 placeholder 역할을 한다.
 *
 * `seedTweet`이 오면 클라 fetch를 아예 하지 않는다 (KAN-422) — 서버가 미리 받아
 * 둔 데이터로 SSR 시점에 임베드가 그려져, LCP인 미디어 이미지가 초기 HTML에서
 * 바로 발견된다. useTweet은 id와 apiUrl이 둘 다 없으면 swr 키가 null이라 요청
 * 자체가 나가지 않는다.
 *
 * `defer`가 켜져 있으면 fetch를 미룬다 (KAN-429) — 화면에서 먼 릴의 임베드가
 * 마운트 즉시 트윗을 받아 LCP인 첫 릴 이미지와 pbs.twimg.com 대역폭을 나누는 걸
 * 막는 게이트다. swr 키를 null로 둬 요청 자체가 안 나가고, 꺼지면 그때 받는다.
 *
 * @param url 원문 트윗 링크 (`sourceUrl`). 트윗 링크가 아니면 안내 문구가 선다.
 * @param seedTweet 서버가 미리 받아 둔 트윗 데이터. 있으면 클라 fetch 생략.
 * @param defer true면 클라 fetch를 미룬다. 로딩과 같은 표시(placeholder)로 선다.
 */
export function TweetEmbed({
  url,
  seedTweet,
  defer = false,
}: {
  url: string;
  seedTweet?: Tweet;
  defer?: boolean;
}) {
  const id = tweetIdFromUrl(url);
  const skipFetch = Boolean(seedTweet) || !id || defer;
  const { data: fetched, error } = useTweet(
    skipFetch ? undefined : id,
    skipFetch ? undefined : `/api/tweet/${id}`,
  );
  const data = seedTweet ?? fetched;

  if (data) return <EmbeddedTweet tweet={data} />;
  /* data === null은 프록시가 ok로 빈 데이터를 준 경우 — 실패와 같게 본다 */
  if (!id || error || data === null) {
    return (
      <p className="text-body text-text-4 text-center">
        원문이 삭제됐거나 불러오지 못했어요
      </p>
    );
  }
  return null;
}
