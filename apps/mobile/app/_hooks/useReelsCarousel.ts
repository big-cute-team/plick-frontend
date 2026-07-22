"use client";

import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { REELS_CAROUSEL_OPTIONS } from "@/_constants/reels";

/**
 * 릴스 세로 캐러셀 (KAN-277).
 *
 * CSS scroll-snap 대신 Embla가 포인터 드래그를 직접 받아 한 장씩 넘긴다.
 * 브라우저 관성 스크롤에 맡기지 않으므로 세게 튕겨도 여러 장이 건너뛰지 않고,
 * 스냅 타이밍과 드래그 문턱을 값으로 조절할 수 있다({@link REELS_CAROUSEL_OPTIONS}).
 *
 * 무한스크롤로 슬라이드가 늘어나면 Embla가 새 슬라이드를 다시 재야 하는데(`reInit`),
 * 그 안에서 진행 중인 스냅 애니메이션과 드래그 핸들러가 파괴된다. 다음 페이지는
 * 하필 사용자가 넘기는 도중에 도착하므로 그때 바로 재면 넘김이 툭 끊긴다. 그래서
 * Embla의 자동 감지(`watchSlides`)를 끄고, 여기서 멈춘 뒤로 미뤄 둔다 (KAN-276).
 *
 * 새 슬라이드는 DOM에는 이미 들어와 있고 Embla가 아직 세지 않았을 뿐이라, 미루는
 * 동안에도 보고 있는 릴에는 아무 영향이 없다.
 *
 * @param slideCount 지금 렌더된 슬라이드 수. 이 값이 바뀌면 다시 잰다.
 * @returns `viewportRef`는 `overflow-hidden` 뷰포트에, 그 안에 슬라이드를 담는 컨테이너를 둔다.
 *   `activeIndex`는 지금 보고 있는 릴 — 화면 밖 릴 비활성화와 다음 페이지 프리페치에 쓴다.
 */
export function useReelsCarousel(slideCount: number) {
  const [viewportRef, embla] = useEmblaCarousel(REELS_CAROUSEL_OPTIONS);
  const [activeIndex, setActiveIndex] = useState(0);
  /**
   * 지금 실제로 움직이는 중인가.
   *
   * 손가락이 닿았는지(`pointerDown`)가 아니라 위치가 바뀌었는지(`scroll`)로 본다.
   * 제자리 탭은 스냅 애니메이션이 없어 `settle`이 오지 않으므로, 눌렀다는 이유로
   * 움직이는 중이라고 표시하면 미뤄 둔 재측정이 영영 안 풀린다.
   */
  const moving = useRef(false);
  /** 멈추면 다시 재야 하는가 (움직이는 중에 슬라이드가 늘어난 경우) */
  const remeasure = useRef(false);

  useEffect(() => {
    if (!embla) return;

    const sync = () => setActiveIndex(embla.selectedScrollSnap());
    const start = () => {
      moving.current = true;
    };
    const stop = () => {
      moving.current = false;
      if (remeasure.current) {
        remeasure.current = false;
        // 멈춘 뒤라 파괴할 애니메이션이 없다. reInit은 지금 인덱스를 유지한다
        embla.reInit();
      }
    };

    sync();
    embla.on("select", sync).on("reInit", sync);
    embla.on("scroll", start).on("settle", stop);

    return () => {
      embla.off("select", sync).off("reInit", sync);
      embla.off("scroll", start).off("settle", stop);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    if (moving.current) {
      remeasure.current = true;
      return;
    }
    embla.reInit();
  }, [embla, slideCount]);

  return { viewportRef, activeIndex };
}
