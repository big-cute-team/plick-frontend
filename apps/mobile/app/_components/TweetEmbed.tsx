"use client";

import { useRef } from "react";
import { useTweetFit } from "@/_hooks/useTweetFit";
import { useTweetWidget } from "@/_hooks/useTweetWidget";
import { tweetIdFromUrl } from "@/_utils/tweet";

/**
 * 사진이 null인 카드의 사진 자리를 대신하는 원문 트윗 임베드 (KAN-284).
 *
 * X 공식 widgets.js 임베드로 그린다 (KAN-291) — react-tweet(비공식 신디케이션
 * API)과 자체 프록시(`/api/tweet/[id]`)를 걷어낸 자리다. 데이터는 iframe이 X에서
 * 직접 받는다. 로딩 중이거나 실패하면 컨테이너가 비어 있어 뒤의 MediaThumb
 * 그라데이션이 placeholder 역할을 이어받는다.
 *
 * 부모 박스(position 기준)를 가득 채운다. 카드가 박스보다 크면
 * {@link useTweetFit}이 카드 전체를 scale로 축소해 맞춘다 — 사진은 항상
 * 포함하고 본문도 건드리지 않는다(X Display Requirements상 본문 수정·말줄임
 * 금지).
 *
 * fill 임베드는 `pointer-events-none`으로 상호작용을 막는다 (KAN-291) —
 * iframe이 포인터 이벤트를 삼켜 임베드 위에서 릴스 세로 스와이프(Embla
 * 드래그)가 죽기 때문이다. 사진의 대체물이라 순수 시각 요소로 두고,
 * 원문으로 가는 길은 세부 시트의 출처 링크가 맡는다.
 *
 * `layout="flow"`면 박스를 채우는 대신 문서 흐름에 자연 높이로 선다 — 기사
 * 세부 본문처럼 고정 프레임 없이 임베드만 꽉 차게 보여줄 자리용. 축소도 없다.
 * 일반 스크롤 페이지라(스크롤 체이닝이 부모로 이어진다) 여기선 상호작용을
 * 막지 않는다 — 트윗 링크·액션이 새 탭으로 X에 열린다.
 *
 * @param url 원문 트윗 링크 (`sourceUrl`). 트윗 링크가 아니면 아무것도 그리지 않는다.
 * @param layout `fill`(기본): 부모 박스를 absolute로 채움 · `flow`: 문서 흐름
 */
export function TweetEmbed({
  url,
  layout = "fill",
}: {
  url: string;
  layout?: "fill" | "flow";
}) {
  const id = tweetIdFromUrl(url);
  const { outerRef, innerRef, scale } = useTweetFit<
    HTMLDivElement,
    HTMLDivElement
  >();
  const flowRef = useRef<HTMLDivElement>(null);

  const isFlow = layout === "flow";
  const status = useTweetWidget(isFlow ? flowRef : innerRef, id);

  if (!id) return null;

  if (isFlow) {
    /* 실패 시 빈 컨테이너가 문서 흐름에 여백을 남기지 않게 숨긴다 */
    return <div ref={flowRef} hidden={status === "error"} />;
  }

  return (
    <div
      ref={outerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden"
    >
      <div
        ref={innerRef}
        className="w-full shrink-0"
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}
