"use client";

import { useRef, type ReactNode } from "react";
import { useScrollThumb } from "@/_hooks/useScrollThumb";

/** 한 화면에 보이는 카드 수. 카드 폭({@link HotHeroCard})과 스냅 간격이 이 수에 맞춰져 있다 */
const CARDS_PER_PAGE = 2;

/**
 * 핫이슈 사진 카드의 가로 스크롤 트랙과 그 아래 위치 손잡이 (KAN-585).
 *
 * 카드는 트랙 폭의 절반씩이라 어떤 폭에서도 정확히 두 장이 보이고, 스냅은
 * 홀수 번째 카드에만 걸려 스와이프가 두 장(한 페이지) 단위로 멈춘다. KAN-569의
 * 168px 고정 폭 카드는 폰 폭에 따라 셋째 카드가 애매하게 걸쳐 보였고 스냅이 한 장
 * 단위라 스와이프 뒤에도 걸친 채로 섰다.
 *
 * 상자 안쪽 여백은 패딩이 아니라 마진이다. 패딩이면 스크롤 상자가 상자 가장자리까지라
 * 다음 카드가 패딩 밑으로 비쳐 또 걸친 것처럼 보인다. 마진이면 스크롤 상자가 여백
 * 안쪽에서 끝나 보이는 건 정확히 두 장뿐이다. 더 있다는 신호는 아래 손잡이가 맡는다.
 *
 * 손잡이는 짧은 바 위에 보이는 몫만큼의 썸이 스크롤을 따라 움직이는 모양이다.
 * 눌러서 끌지는 않는다. 스크롤 스냅과 프로그램 스크롤이 서로 당기는 문제가 있어
 * 보기용으로만 둔다. 카드가 한 페이지에 다 들어가면 바를 그리지 않는다.
 *
 * 스크롤 위치를 읽어야 해서 클라 컴포넌트지만 카드는 서버에서 렌더된 채
 * `children`으로 지나간다.
 *
 * @param count 카드 수. 서버에서 첫 썸 폭을 잡는 데 쓴다
 * @param children 카드들({@link HotHeroCard})
 */
export function HotHeroTrack({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumb = useScrollThumb(trackRef, Math.min(1, CARDS_PER_PAGE / count));

  return (
    <>
      <div
        ref={trackRef}
        className="snap-x-carousel no-scrollbar mx-3 flex gap-2.5 overflow-x-auto"
      >
        {children}
      </div>
      {thumb.size < 1 && (
        <div
          aria-hidden
          className="bg-border-strong rounded-pill relative mx-auto mt-3 h-0.5 w-12 overflow-hidden"
        >
          <div
            className="bg-text-3 rounded-pill absolute inset-y-0 left-0"
            style={{
              width: `${thumb.size * 100}%`,
              transform: `translateX(${(thumb.offset / thumb.size) * 100}%)`,
            }}
          />
        </div>
      )}
    </>
  );
}
