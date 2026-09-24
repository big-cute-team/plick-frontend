/**
 * 릴 한 장의 로딩 자리 (KAN-276, 시안 KAN-567 라이트).
 *
 * 실제 릴과 같은 미디어 상자(radius 22) + 밑의 정보 블록 배치를 그대로 흉내 내서,
 * 데이터가 도착할 때 화면이 튀지 않게 한다.
 */
export function ReelSkeleton() {
  return (
    <div className="px-edge flex h-full w-full animate-pulse flex-col gap-3.5 pt-1.5 pb-4">
      <div className="bg-reel-bg rounded-hero min-h-0 flex-1" />
      <div className="flex shrink-0 items-end gap-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="bg-elevate rounded-pill h-4 w-24" />
          <div className="bg-elevate rounded-tile h-6 w-full" />
          <div className="bg-elevate rounded-tile h-6 w-2/3" />
          <div className="bg-elevate rounded-pill h-3.5 w-32" />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-3.5">
          <div className="bg-elevate size-6.5 rounded-full" />
          <div className="bg-elevate size-6.5 rounded-full" />
          <div className="bg-elevate size-6.5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
