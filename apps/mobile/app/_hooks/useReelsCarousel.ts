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
 * 무한스크롤로 슬라이드가 늘어나면 Embla가 새 슬라이드를 다시 재야 하는데(`reInit`),
 * 그 안의 `deActivate()`가 진행 중인 스냅 애니메이션과 드래그 핸들러를 파괴한다.
 * 다음 페이지는 하필 넘기는 도중에 도착하므로 그때 바로 재면 넘김이 툭 끊긴다.
 * 그래서 Embla의 자동 감지(`watchSlides`)를 끄고 여기서 멈춘 뒤에 잰다 (KAN-276).
 *
 * 미루는 동안에도 새 슬라이드는 DOM에 이미 들어와 있다. Embla가 아직 세지 않았을
 * 뿐이라 보고 있는 릴에는 아무 영향이 없고, 다 재고 나면 그 뒤로 넘어갈 수 있게 된다.
 *
 * @param slideCount 지금 렌더된 슬라이드 수. 이 값이 바뀌면 다시 잰다.
 * @returns `viewportRef`는 `overflow-hidden` 뷰포트에, 그 안에 슬라이드를 담는 컨테이너를 둔다.
 *   `activeIndex`는 지금 보고 있는 릴 — 화면 밖 릴 비활성화와 다음 페이지 프리페치에 쓴다.
 */
export function useReelsCarousel(slideCount: number) {
  const [viewportRef, embla] = useEmblaCarousel(REELS_CAROUSEL_OPTIONS);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const sync = () => setActiveIndex(embla.selectedScrollSnap());
    sync();
    embla.on("select", sync).on("reInit", sync);
    return () => {
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    let frame = 0;

    /**
     * 멈춰 있으면 재고, 아니면 다음 프레임에 다시 본다.
     *
     * 움직이는 중인지를 이벤트로 따로 기억하지 않고 Embla에게 그때그때 묻는다.
     * `settle` 이벤트에 기억해 두는 방식으로 먼저 짰다가, 그 핸들러 안에서 다시
     * `reInit()`을 부르는 게 Embla의 렌더 루프 한복판에서 그 루프의 엔진을 파괴하는
     * 재진입이 되어 상태가 어긋났다. 어긋나면 미뤄 둔 재측정이 안 풀려서 마지막
     * 릴에서 아래로 안 넘어가고, 나중에 리사이즈 같은 다른 계기로만 풀린다.
     *
     * 두 조건은 Embla가 스스로 "멈췄고 손도 뗐다"를 판정할 때 쓰는 것과 같다
     * (`hasSettled && !dragHandler.pointerDown()`). 손가락이 닿아 있는 동안 재면
     * 드래그 핸들러가 그 자리에서 파괴되므로 뗄 때까지 기다린다.
     */
    const remeasureWhenIdle = () => {
      const { dragHandler, scrollBody } = embla.internalEngine();
      if (dragHandler.pointerDown() || !scrollBody.settled()) {
        frame = requestAnimationFrame(remeasureWhenIdle);
        return;
      }
      // 멈춘 뒤라 파괴할 애니메이션이 없다. reInit은 지금 인덱스를 유지한다
      embla.reInit();
    };

    remeasureWhenIdle();

    return () => cancelAnimationFrame(frame);
  }, [embla, slideCount]);

  return { viewportRef, activeIndex };
}
