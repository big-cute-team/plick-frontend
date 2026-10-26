"use client";

import { useRef, type ReactNode, type Ref } from "react";
import type { ReelSlide } from "@plick/core/ads";
import type { ReelSeedTweet } from "@plick/core/tweet";
import type { ReelCard } from "@plick/domain/types";
import { ReelAdSlide } from "./ReelAdSlide";
import { ReelItem } from "./ReelItem";

/**
 * 릴 세로 스냅 뷰어 — 릴 한 장 = 뷰포트(헤더 제외) 높이, 위아래로 스냅 스크롤.
 * 카드는 섹션 높이를 꽉 채우고 위아래로 16px(시안 px)만 띄운다 (KAN-574). 전에는 30px
 * 여백에 최대 704px라 큰 창에서 카드가 가운데 작게 떴다.
 *
 * 바탕은 시안의 회색 면(`bg-chip`, KAN-567 웹 릴스 430행)이고, 오른쪽 세부 패널은
 * 흰 바탕에 왼쪽 테두리로 갈린다. 세부 패널이 열리면 옆에서 폭을 나눠 갖는다
 * (`ReelsWorkspace`가 뷰어, 패널을 가로로 배치). 릴 카드는 9:16 고정 비율이라
 * 폭이 줄면 높이도 함께 준다.
 *
 * 레일의 이전, 다음 화살표는 인접 릴 섹션으로 스크롤한다. 섹션은 `data-reel-index`로
 * 찾고 `scrollIntoView`로 스냅 위치에 맞춘다. 활성 릴 판정은 그대로
 * `useActiveReel`의 IntersectionObserver가 맡으므로 휠, 키보드 이동과 같은 경로다.
 *
 * 데이터와 상태는 전부 `ReelsWorkspace`가 들고 있고 여기는 배치만 맡는다.
 *
 * 슬라이드는 릴이거나 전면광고다 (KAN-652). 광고 칸도 같은 섹션 껍데기와
 * `data-reel-index`를 달아 활성 판정과 화살표 이동이 릴과 똑같이 돈다. 인덱스는 전부
 * 슬라이드 순번이고 릴 순번으로의 환산은 `ReelsWorkspace`가 한다.
 *
 * @param slides - 표시할 슬라이드 목록(릴과 광고)
 * @param activeIndex - 지금 보고 있는 슬라이드 인덱스. 화살표가 이웃을 계산한다
 * @param seedTweet - 서버가 미리 받아 둔 첫 릴의 트윗 데이터 (KAN-673). id가 맞는 릴에만 준다
 * @param onOpenDetail - 제목, 댓글 클릭 시 세부 패널을 여는 콜백. 패널이 어떤 릴을
 *   그릴지는 지금 보고 있는 릴로 정해지므로(`useActiveReel`) 인자가 없다
 * @param registerReel - 각 릴 섹션에 달 ref 콜백(`useActiveReel`이 만든다).
 *   인덱스는 `data-reel-index`로 넘긴다
 * @param trailing - 마지막 릴 뒤에 붙는 자리(다음 페이지 로딩, 재시도). 없으면 생략
 */
export function ReelViewer({
  slides,
  activeIndex,
  seedTweet,
  onOpenDetail,
  registerReel,
  trailing,
}: {
  slides: ReelSlide<ReelCard>[];
  activeIndex: number;
  seedTweet?: ReelSeedTweet;
  onOpenDetail: () => void;
  registerReel: Ref<HTMLElement>;
  trailing?: ReactNode;
}) {
  const viewerRef = useRef<HTMLElement>(null);

  const scrollTo = (index: number) => {
    viewerRef.current
      ?.querySelector<HTMLElement>(`[data-reel-index="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main
      ref={viewerRef}
      className="bg-chip min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
    >
      {slides.map((slide, i) => (
        <section
          key={slide.kind === "reel" ? slide.reel.id : slide.id}
          ref={registerReel}
          data-reel-index={i}
          className="lg:pl-gutter flex h-full snap-start items-center justify-center px-4 py-4"
        >
          {slide.kind === "reel" ? (
            <ReelItem
              reel={slide.reel}
              onOpenDetail={onOpenDetail}
              onPrev={
                i === activeIndex && i > 0 ? () => scrollTo(i - 1) : undefined
              }
              onNext={
                i === activeIndex && i < slides.length - 1
                  ? () => scrollTo(i + 1)
                  : undefined
              }
              eager={i === 0}
              seedTweet={
                seedTweet?.reelId === slide.reel.id
                  ? seedTweet.tweet
                  : undefined
              }
            />
          ) : (
            <ReelAdSlide />
          )}
        </section>
      ))}

      {trailing && <section className="h-full snap-start">{trailing}</section>}
    </main>
  );
}
