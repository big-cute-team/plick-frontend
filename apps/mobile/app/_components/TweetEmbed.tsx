"use client";

import { EmbeddedTweet, useTweet } from "react-tweet";
import type { Tweet } from "react-tweet/api";
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
 * 수 없다. 같은 이유로 임베드의 링크·액션(답글·마음·프로필)은 막지 않고
 * 그대로 동작한다(전부 새 탭으로 X에 연다).
 *
 * 데이터는 자체 프록시(`/api/tweet/[id]`)에서 받는다 — react-tweet의 기본
 * 엔드포인트(react-tweet.vercel.app)는 공용 rate limit을 탄다. 로딩 중이거나
 * 실패하면 아무것도 그리지 않아 뒤의 MediaThumb 그라데이션이 placeholder
 * 역할을 이어받는다.
 *
 * @param url 원문 트윗 링크 (`sourceUrl`). 트윗 링크가 아니면 아무것도 그리지 않는다.
 */
export function TweetEmbed({ url }: { url: string }) {
  const id = tweetIdFromUrl(url);
  const { outerRef, innerRef, scale, hideMedia } = useTweetFit<
    HTMLDivElement,
    HTMLDivElement
  >();
  const { data } = useTweet(
    id ?? undefined,
    id ? `/api/tweet/${id}` : undefined,
  );
  if (!id) return null;

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
