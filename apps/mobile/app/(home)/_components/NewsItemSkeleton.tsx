/**
 * "지금 올라온 소식" 한 줄의 로딩 자리. 실제 줄과 같은 높이·간격을 써서
 * 데이터가 도착할 때 리스트가 튀지 않게 한다.
 */
export function NewsItemSkeleton() {
  return (
    <div className="border-border gap-gap flex items-start border-b py-3">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="bg-elevate rounded-pill h-3 w-20" />
        <div className="bg-elevate rounded-pill h-4 w-full" />
        <div className="bg-elevate rounded-pill h-4 w-2/3" />
        <div className="bg-elevate rounded-pill h-3 w-1/2" />
      </div>
      <div className="bg-elevate rounded-control size-14 shrink-0" />
    </div>
  );
}
