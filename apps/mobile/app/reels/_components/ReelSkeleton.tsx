/**
 * 릴 한 장의 로딩 자리 (KAN-276).
 *
 * 실제 릴과 같은 풀스크린 미디어 + 하단 정보 블록 배치를 그대로 흉내 내서,
 * 데이터가 도착할 때 화면이 튀지 않게 한다.
 */
export function ReelSkeleton() {
  return (
    <div className="bg-media flex h-full w-full flex-col justify-end gap-2.75 pr-21 pb-27 pl-4.5">
      <div className="bg-elevate rounded-pill h-5 w-24" />
      <div className="bg-elevate rounded-pill h-6 w-full" />
      <div className="bg-elevate rounded-pill h-6 w-2/3" />
      <div className="bg-elevate rounded-pill mt-1 h-4 w-40" />
    </div>
  );
}
