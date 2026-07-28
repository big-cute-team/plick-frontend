/**
 * 릴 한 장의 로딩 자리 (KAN-323).
 *
 * 실제 릴과 같은 9:16 카드 + 하단 정보 블록 배치를 그대로 흉내 내서, 데이터가
 * 도착할 때 화면이 튀지 않게 한다. 카드 밖 우측 레일 자리까지 잡아 둬야 카드가
 * 같은 폭으로 선다.
 */
export function ReelSkeleton() {
  return (
    <div className="lg:px-gutter flex h-full items-center justify-center gap-4 px-4 py-8 lg:gap-6.5 lg:py-10">
      <div className="bg-reel-bg rounded-hero flex aspect-[9/16] h-full w-auto max-w-full min-w-0 flex-col justify-end gap-2.75 pr-16 pb-8 pl-5.5 lg:pr-5.5">
        <div className="bg-elevate rounded-pill h-6 w-20" />
        <div className="bg-elevate rounded-pill h-6 w-full" />
        <div className="bg-elevate rounded-pill h-6 w-2/3" />
        <div className="bg-elevate rounded-pill mt-1 h-4 w-40" />
      </div>
      {/* 데스크톱 레일 자리 — 실제 레일(아이콘 3개)과 같은 폭을 잡아 둔다 */}
      <div className="flex w-12 shrink-0 flex-col gap-4 max-lg:hidden">
        <div className="bg-elevate size-12 rounded-full" />
        <div className="bg-elevate size-12 rounded-full" />
        <div className="bg-elevate size-12 rounded-full" />
      </div>
    </div>
  );
}
