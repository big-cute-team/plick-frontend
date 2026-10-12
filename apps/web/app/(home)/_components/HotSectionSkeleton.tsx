/**
 * 핫이슈 캐러셀의 로딩 자리 (KAN-602). 실제 캐러셀(`HotCarousel`)과 같은 제목 줄,
 * 한 화면에 보이는 카드 수(좁으면 1.5장, sm 이상 3장), 16:10 사진과 제목 두 줄의
 * 실루엣이다. 제목은 정적이라 실물을 그대로 쓴다.
 */
export function HotSectionSkeleton() {
  return (
    <section aria-hidden>
      <h2 className="text-body-lg text-text-strong pb-2.75 font-black tracking-tight">
        핫이슈
      </h2>
      <div className="flex animate-pulse gap-5 overflow-hidden pb-7.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="w-2/3 shrink-0 sm:w-[calc((100%-2.5rem)/3)]">
            <div className="bg-media mb-2.5 aspect-[16/10]" />
            <div className="bg-elevate mb-1.75 h-3 w-16" />
            <div className="bg-elevate h-4.5 w-full" />
            <div className="bg-elevate mt-1.5 h-4.5 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
