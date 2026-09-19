/**
 * "지금 올라온 소식" 한 줄의 로딩 자리. 실제 줄(NewsItem)과 같은 세 칸 구성
 * (로고 / 제목·요약 / 시각·기자명)과 높이·간격을 써서 데이터가 도착할 때
 * 리스트가 튀지 않게 한다 (KAN-482에서 행 구조가 바뀌며 같이 맞췄다).
 */
export function NewsItemSkeleton() {
  return (
    <div className="border-border gap-gap flex items-start border-b py-3">
      <div className="bg-elevate size-9 shrink-0 self-center rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="bg-elevate rounded-pill h-5 w-4/5" />
        <div className="bg-elevate rounded-pill mt-2 h-4 w-3/5" />
      </div>
      <div className="flex w-22 shrink-0 flex-col items-end gap-1.5">
        <div className="bg-elevate rounded-pill h-3 w-12" />
        <div className="bg-elevate rounded-pill h-3 w-9" />
      </div>
    </div>
  );
}
