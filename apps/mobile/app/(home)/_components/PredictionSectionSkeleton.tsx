/**
 * 홈 승부예측 섹션의 로딩 자리 (KAN-700). 실제 섹션(`PredictionHomeTrack`)과 같은 제목 줄과 84% 폭
 * 카드 한 장 반의 실루엣이다. 제목은 정적이라 실물을 그대로 쓴다.
 */
export function PredictionSectionSkeleton({
  title = "승부예측",
}: {
  title?: string;
}) {
  return (
    <section aria-hidden className="px-edge pt-4.5">
      <h2 className="text-body-lg text-text-strong tracking-section pb-2.5 font-black">
        {title}
      </h2>
      <PredictionCardsSkeleton />
    </section>
  );
}

/** 카드 줄의 실루엣만. 씨앗 없이 브라우저가 받는 동안 `PredictionHomeTrack`도 이걸 그린다. */
export function PredictionCardsSkeleton() {
  return (
    <div
      aria-hidden
      className="-mx-edge px-edge flex animate-pulse gap-2.5 overflow-hidden"
    >
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="bg-elevate rounded-card w-[84%] shrink-0 px-3.5 pt-3.5 pb-2.5"
        >
          <div className="bg-avatar rounded-pill h-3 w-16" />
          <div className="flex items-center justify-center gap-3 py-3.5">
            <div className="bg-avatar rounded-pill h-4 w-14" />
            <div className="bg-avatar size-9 rounded-full" />
            <div className="bg-avatar size-9 rounded-full" />
            <div className="bg-avatar rounded-pill h-4 w-14" />
          </div>
          <div className="bg-avatar rounded-tile h-8" />
          <div className="bg-avatar rounded-pill mt-3 h-3 w-3/4" />
          <div className="bg-avatar rounded-pill my-3.5 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
