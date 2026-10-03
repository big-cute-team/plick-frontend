/**
 * 이슈 목록 행의 로딩 자리 — `NewsItem`과 같은 세 칸 높이를 지킨다.
 */
export function NewsItemSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse items-center gap-2.5 border-b py-3">
      <div className="bg-elevate size-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="bg-elevate rounded-pill h-4 w-4/5" />
        <div className="bg-elevate rounded-pill mt-2 h-3 w-3/5" />
      </div>
      <div className="w-reporter flex shrink-0 flex-col items-end gap-1.5">
        <div className="bg-elevate rounded-pill h-2.5 w-12" />
        <div className="bg-elevate rounded-pill h-2.5 w-9" />
      </div>
    </div>
  );
}
