import { AdSlot } from "@/_components/AdSlot";

/**
 * 릴스 전면광고 슬라이드 (KAN-652). 릴 한 장과 같은 크기의 슬라이드에 광고 상자를
 * 채우고 위아래로 광고 표시와 넘기는 안내만 둔다. 모달이 아니라 캐러셀의 한 칸이라
 * 다른 릴처럼 스와이프로 지나간다. 껍데기 유틸은 `ReelItem`·`ReelLoadingSlide`와 같다.
 *
 * @param active 지금 보이는 슬라이드인지. 아니면 `inert`로 포커스와 보조기기에서 뺀다.
 *   `ReelItem`과 같은 규칙이고, E2E의 활성 릴 로케이터(`main section:not([inert])`)도
 *   이 속성으로 한 장만 고른다
 * @param inWindow DOM 창(`REELS_DOM_WINDOW`) 안인지. 밖이면 자리만 잡고 광고 상자는
 *   두지 않는다. 창 밖에서 상자를 push하면 보이지 않는 채로 채워져 노출로 안 센다
 */
export function ReelAdSlide({
  active,
  inWindow,
}: {
  active: boolean;
  inWindow: boolean;
}) {
  return (
    <section
      inert={!active}
      className="bg-reel-bg px-edge flex h-full w-full shrink-0 basis-full flex-col items-center justify-center gap-3 pt-10 pb-24"
    >
      <span className="text-caption-lg text-text-3 font-bold">광고</span>
      <div className="bg-bg min-h-0 w-full flex-1 overflow-hidden">
        <AdSlot placement="reel" enabled={inWindow} />
      </div>
      <span className="text-caption text-text-3">
        위로 밀면 계속 볼 수 있어요
      </span>
    </section>
  );
}
