/** VS 카드: 제목, 양쪽 선택지, 하나의 분포 바, 대표 의견. */
export function DebateListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 py-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-elevate rounded-card flex animate-pulse flex-col gap-4 p-4"
        >
          <div className="bg-border rounded-pill h-3 w-16" />
          <div className="bg-border rounded-pill h-5 w-3/4" />
          <div className="flex gap-8 py-3">
            <div className="bg-border h-6 flex-1" />
            <div className="bg-border h-6 flex-1" />
          </div>
          <div className="bg-border rounded-tile h-9" />
          <div className="bg-border rounded-pill my-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
