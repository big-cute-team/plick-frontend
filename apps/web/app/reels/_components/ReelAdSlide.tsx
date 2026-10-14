import { AdSlot } from "@/_components/AdSlot";

/**
 * 릴스 전면광고 슬라이드 (KAN-652). 릴과 같은 9:16 카드 자리에 광고 상자를 채우고
 * 위아래로 광고 표시와 넘기는 안내만 둔다. 모달이 아니라 스냅 목록의 한 칸이라
 * 다른 릴처럼 스크롤로 지나간다. 카드 크기는 `ReelItem` 카드와 같다.
 */
export function ReelAdSlide() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <span className="text-caption-lg text-text-3 font-bold">광고</span>
      <div className="bg-bg shadow-card relative aspect-[9/16] min-h-0 w-auto max-w-full min-w-0 flex-1 overflow-hidden">
        <AdSlot placement="reel" />
      </div>
      <span className="text-caption text-text-4">
        아래로 넘기면 계속 볼 수 있어요
      </span>
    </div>
  );
}
