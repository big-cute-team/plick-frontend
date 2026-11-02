/** 내 예측 기록 줄 자리 (KAN-702). 엠블럼, 제목, 내 예측, 결과 칸의 실루엣이다. */
export function MyPredictionRowSkeleton() {
  return (
    <div className="border-border-soft grid min-h-11 animate-pulse grid-cols-[2.5rem_minmax(0,1fr)_10rem_5rem] items-center border-b py-1.75">
      <span className="bg-chip mx-auto h-5 w-5 rounded-full" />
      <span className="bg-chip h-4 w-3/5" />
      <span className="bg-chip h-3.5 w-24" />
      <span className="bg-chip ml-auto h-3.5 w-10" />
    </div>
  );
}
