"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { REELS_CAROUSEL_OPTIONS } from "@/_constants/reels";

/**
 * 릴스 세로 캐러셀 (KAN-277).
 *
 * CSS scroll-snap 대신 Embla가 포인터 드래그를 직접 받아 한 장씩 넘긴다.
 * 브라우저 관성 스크롤에 맡기지 않으므로 세게 튕겨도 여러 장이 건너뛰지 않고,
 * 스냅 타이밍과 드래그 문턱을 값으로 조절할 수 있다({@link REELS_CAROUSEL_OPTIONS}).
 *
 * 지금 보고 있는 릴의 인덱스를 `select` 이벤트로 알 수 있어, 화면 밖 릴을 비활성화하거나
 * 나중에 미디어 재생·프리페치를 붙일 자리가 생긴다.
 *
 * @param startIndex - 처음 보여줄 릴의 인덱스. 마운트 시점에 그 자리에서 시작하므로
 *   딥링크(`/reels/[postId]`)로 들어와도 첫 릴이 잠깐 스쳐 보이지 않는다.
 * @returns `viewportRef`는 `overflow-hidden` 뷰포트에, 그 안에 슬라이드를 담는 컨테이너를 둔다.
 */
export function useReelsCarousel(startIndex = 0) {
  const [viewportRef, embla] = useEmblaCarousel({
    ...REELS_CAROUSEL_OPTIONS,
    startIndex,
  });
  const [activeIndex, setActiveIndex] = useState(startIndex);

  useEffect(() => {
    if (!embla) return;
    const sync = () => setActiveIndex(embla.selectedScrollSnap());
    sync();
    embla.on("select", sync).on("reInit", sync);
    return () => {
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  return { viewportRef, activeIndex };
}
