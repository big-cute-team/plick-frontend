/**
 * 홈 승부예측 섹션의 로딩 자리 (KAN-700). 실제 섹션(`PredictionHomeTrack`)과 같은 제목 줄과 카드
 * (좁으면 한 장 반, `sm`부터 두 장, `lg`부터 세 장)의 실루엣이다. 제목은 정적이라 실물을 그대로 쓴다.
 */
export function PredictionSectionSkeleton() {
  return (
    <section aria-hidden className="pb-8.5">
      <h2 className="text-body-lg text-text-strong pb-2.75 font-black tracking-tight">
        승부예측
      </h2>
      <PredictionCardsSkeleton />
    </section>
  );
}

/** 카드 줄의 실루엣만. 씨앗 없이 브라우저가 받는 동안 `PredictionHomeTrack`도 이걸 그린다. */
export function PredictionCardsSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse gap-5 overflow-hidden pb-1">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="bg-elevate w-2/3 shrink-0 px-4 pt-4 pb-2 sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
        >
          <div className="bg-avatar h-3 w-16" />
          <div className="flex items-center justify-center gap-2.5 py-3.5">
            <div className="bg-avatar h-4 w-14" />
            <div className="bg-avatar size-8 rounded-full" />
            <div className="bg-avatar size-8 rounded-full" />
            <div className="bg-avatar h-4 w-14" />
          </div>
          <div className="bg-avatar h-8" />
          <div className="bg-avatar mt-3 h-3 w-3/4" />
          <div className="bg-avatar my-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
