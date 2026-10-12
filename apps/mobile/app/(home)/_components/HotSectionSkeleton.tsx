/**
 * 핫이슈 상자의 로딩 자리 (KAN-602). 실제 상자(`HomeScreen`의 핫이슈 섹션)와 같은
 * 채운 면, 제목, 두 장씩 보이는 사진 카드 트랙의 실루엣이다. 제목은 정적이라
 * 실물을 그대로 쓴다.
 */
export function HotSectionSkeleton() {
  return (
    <section aria-hidden className="px-edge pt-3">
      <div className="bg-elevate-2 rounded-card py-3.25">
        <h2 className="text-body-lg text-text-strong tracking-section px-3 pb-2.5 font-black">
          핫이슈
        </h2>
        <div className="mx-3 flex animate-pulse gap-2.5">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="w-[calc((100%-0.625rem)/2)] shrink-0">
              <div className="rounded-tile bg-media mb-2 aspect-[6/5]" />
              <div className="bg-avatar rounded-pill mb-1.5 h-3 w-12" />
              <div className="bg-avatar rounded-pill h-4 w-full" />
              <div className="bg-avatar rounded-pill mt-1.5 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
