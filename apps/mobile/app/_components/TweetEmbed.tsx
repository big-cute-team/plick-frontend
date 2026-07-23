"use client";

import { Tweet, type TweetComponents } from "react-tweet";
import { useFitScale } from "@/_hooks/useFitScale";
import { tweetIdFromUrl } from "@/_utils/tweet";

/**
 * 실패하면 아무것도 그리지 않는다 — 뒤에 깔린 MediaThumb 그라데이션이 그대로
 * 사진 placeholder 역할을 이어받는다. 렌더마다 새 객체를 만들지 않게 모듈 상수로 둔다.
 * (TweetNotFound 타입이 null 반환을 막아 빈 프래그먼트를 쓴다)
 */
const EMBED_COMPONENTS: TweetComponents = {
  TweetNotFound: () => <></>,
};

/**
 * 사진이 null인 카드의 사진 자리를 대신하는 원문 트윗 임베드 (KAN-284).
 *
 * 부모 박스(position 기준)를 가득 채우고, 트윗 카드가 박스보다 크면
 * {@link useFitScale}로 통째로 축소해 넣는다. 박스 높이가 트랜지션으로 변해도
 * (릴 세부 시트 개폐) 같은 경로로 따라 줄어든다.
 *
 * 데이터는 자체 프록시(`/api/tweet/[id]`)에서 받는다 — react-tweet의 기본
 * 엔드포인트(react-tweet.vercel.app)는 공용 rate limit을 탄다.
 *
 * 사진 대체물이라 상호작용을 받지 않는다(pointer-events 차단 + aria-hidden).
 * 카드의 탭 동작(릴스 이동·시트 열기)은 위에 얹힌 요소가 계속 가져간다.
 *
 * @param url 원문 트윗 링크 (`sourceUrl`). 트윗 링크가 아니면 아무것도 그리지 않는다.
 */
export function TweetEmbed({ url }: { url: string }) {
  const { outerRef, innerRef, scale } = useFitScale<
    HTMLDivElement,
    HTMLDivElement
  >();
  const id = tweetIdFromUrl(url);
  if (!id) return null;

  return (
    <div
      ref={outerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <div
        ref={innerRef}
        className="w-full shrink-0"
        style={{ transform: `scale(${scale})` }}
      >
        <Tweet
          id={id}
          apiUrl={`/api/tweet/${id}`}
          fallback={null}
          components={EMBED_COMPONENTS}
        />
      </div>
    </div>
  );
}
