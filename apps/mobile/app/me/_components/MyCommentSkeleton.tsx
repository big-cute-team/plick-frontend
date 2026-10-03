/**
 * 내가 쓴 댓글 한 줄의 로딩 자리 (KAN-495). 실제 줄(`MyCommentItem`)과 같은
 * 구성(본문 두 줄 / 메타 / 기사 제목)과 높이·간격을 써서 데이터가 도착할 때
 * 리스트가 튀지 않게 한다.
 */
export function MyCommentSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse flex-col gap-2 border-b py-3.5">
      <div className="bg-elevate rounded-pill h-4.5 w-full" />
      <div className="bg-elevate rounded-pill h-4.5 w-2/3" />
      <div className="bg-elevate rounded-pill mt-1 h-3.5 w-24" />
      <div className="bg-elevate rounded-pill h-3.5 w-48" />
    </div>
  );
}
