"use client";

import { useEffect, useRef, useState } from "react";
import { EmbeddedTweet, useTweet } from "react-tweet";
import type { Tweet } from "react-tweet/api";
import { TWEET_FLOW_MAX_HEIGHT_RATIO } from "@/_constants/app";
import { useTweetFit } from "@/_hooks/useTweetFit";
import { tweetIdFromUrl } from "@/_utils/tweet";

/**
 * 미디어(사진·영상)를 뺀 트윗 데이터를 만든다 — 인용 트윗의 미디어도 함께 뺀다.
 * X Display Requirements가 본문 수정을 금지해서, 카드가 박스를 벗어나면
 * 텍스트 대신 미디어를 숨긴다.
 */
function withoutMedia(tweet: Tweet): Tweet {
  return {
    ...tweet,
    mediaDetails: undefined,
    quoted_tweet: tweet.quoted_tweet
      ? { ...tweet.quoted_tweet, mediaDetails: undefined }
      : undefined,
  };
}

/**
 * 사진이 null인 카드의 사진 자리를 대신하는 원문 트윗 임베드 (KAN-284).
 *
 * 부모 박스(position 기준)를 가득 채운다. 카드가 박스보다 크면
 * {@link useTweetFit}이 미디어를 숨겨 전문 텍스트를 그대로 보여주고, 그래도
 * 넘치는 잔여분만 축소한다 — X Display Requirements상 본문은 자르거나 수정할
 * 수 없다. 임베드 내부 링크·액션(답글·마음·프로필)은 전역 CSS에서 전부
 * 꺼뒀다(globals.css, KAN-297) — 임베드는 읽기 전용 미디어다.
 *
 * 데이터는 자체 프록시(`/api/tweet/[id]`)에서 받는다 — react-tweet의 기본
 * 엔드포인트(react-tweet.vercel.app)는 공용 rate limit을 탄다. 로딩 중이거나
 * 실패하면 아무것도 그리지 않아 뒤의 MediaThumb 그라데이션이 placeholder
 * 역할을 이어받는다. reel 레이아웃만 예외다 — 뒤가 단색 릴 배경뿐이라 실패가
 * 확정되면(원문 삭제, 트윗 링크 아님, API 장애) 배경 가운데에 안내 문구를
 * 세운다. useTweet이 재시도 없이(shouldRetryOnError: false) error를 확정해
 * 줘서 로딩과 구분된다.
 *
 * `layout="flow"`면 박스를 채우는 대신 문서 흐름에 자연 높이로 선다 — 기사
 * 세부 본문처럼 고정 프레임 없이 임베드만 꽉 차게 보여줄 자리용. 다만 카드가
 * 화면 높이 대비 상한({@link TWEET_FLOW_MAX_HEIGHT_RATIO})을 넘으면 릴스와
 * 같은 방식으로 미디어를 숨겨 전문 텍스트를 살린다. 축소는 하지 않는다 —
 * 박스에 가둘 이유가 없어 사진만 빼면 충분하다.
 *
 * `layout="reel"`은 사진(미디어)을 그대로 살려 자연 높이·전폭으로 선다 —
 * 릴스 최종 임베딩 전략(KAN-296). 미디어를 숨기지도 축소하지도 자르지도 않고,
 * 카드가 영역보다 크면 부모가 위에 붙여 자기 높이만큼 그대로 세운다(칩·제목
 * 뒤로 겹친다). 릴은 원문을 사진째 보여주는 게 목적이라 전문을 다 담으려 사진을
 * 빼던 flow/fill과 정반대다.
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
 * @param url 원문 트윗 링크 (`sourceUrl`). 트윗 링크가 아니면 아무것도 그리지 않는다.
 * @param layout `fill`(기본): 부모 박스를 absolute로 채움 · `flow`: 문서 흐름 ·
 *   `reel`: 미디어를 살린 전폭 자연 높이
 * @param seedTweet 서버가 미리 받아 둔 트윗 데이터. 있으면 클라 fetch 생략.
 * @param defer true면 클라 fetch를 미룬다. 로딩과 같은 표시(placeholder)로 선다.
 */
export function TweetEmbed({
  url,
  layout = "fill",
  seedTweet,
  defer = false,
}: {
  url: string;
  layout?: "fill" | "flow" | "reel";
  seedTweet?: Tweet;
  defer?: boolean;
}) {
  const id = tweetIdFromUrl(url);
  const { outerRef, innerRef, scale, hideMedia } = useTweetFit<
    HTMLDivElement,
    HTMLDivElement
  >();
  const skipFetch = Boolean(seedTweet) || !id || defer;
  const { data: fetched, error } = useTweet(
    skipFetch ? undefined : id,
    skipFetch ? undefined : `/api/tweet/${id}`,
  );
  const data = seedTweet ?? fetched;

  const flowRef = useRef<HTMLDivElement>(null);
  const [flowHideMedia, setFlowHideMedia] = useState(false);

  /* flow: 임베드 로딩·이미지 로드로 카드가 자라는 흐름을 RO로 따라가며 상한을
     넘는 순간 미디어를 뺀다. 복원은 없다 — 박스가 늘어나는 개념이 없어서다 */
  useEffect(() => {
    if (layout !== "flow" || flowHideMedia) return;
    const el = flowRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (el.offsetHeight > window.innerHeight * TWEET_FLOW_MAX_HEIGHT_RATIO) {
        setFlowHideMedia(true);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [layout, flowHideMedia, data]);

  if (layout === "reel") {
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

  if (!id) return null;

  if (layout === "flow") {
    if (!data) return null;
    return (
      <div ref={flowRef}>
        <EmbeddedTweet tweet={flowHideMedia ? withoutMedia(data) : data} />
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <div
        ref={innerRef}
        className="w-full shrink-0"
        style={{ transform: `scale(${scale})` }}
      >
        {data && (
          <EmbeddedTweet tweet={hideMedia ? withoutMedia(data) : data} />
        )}
      </div>
    </div>
  );
}
