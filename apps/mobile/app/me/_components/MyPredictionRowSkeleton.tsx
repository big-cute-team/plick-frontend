/**
 * 내 예측 기록 한 행의 로딩 자리 (KAN-702). 실제 행(`MyPredictionRow`)과 같은 구성(엠블럼, 제목과 둘째
 * 줄, 오른쪽 결과)과 높이를 써서 데이터가 도착할 때 목록이 튀지 않게 한다.
 */
export function MyPredictionRowSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse items-center gap-2.5 border-b py-3">
      <div className="bg-elevate h-9 w-9 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="bg-elevate rounded-pill h-4 w-3/5" />
        <div className="bg-elevate rounded-pill h-3 w-2/5" />
      </div>
      <div className="bg-elevate rounded-pill h-3.5 w-10 shrink-0" />
    </div>
  );
}
