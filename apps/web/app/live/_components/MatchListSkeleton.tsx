/** 첫 로딩에 보여줄 행 자리 개수. */
const SKELETON_COUNT = 3;

/**
 * 경기 목록의 로딩 자리. 클라가 목록을 받는 동안과 라우트 `loading.tsx`(KAN-602)가
 * 같은 모양을 쓴다.
 */
export function MatchListSkeleton() {
  return (
    <div>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <MatchRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** 경기 행 자리 스켈레톤 — 상태 칸, 팀 두 줄, 스코어의 실루엣이다 (KAN-567 행 높이). */
function MatchRowSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse items-center gap-5 border-b px-2 py-3.25">
      <div className="bg-chip h-9 w-15.5" />
      <div className="bg-border h-10 w-px" />
      <div className="flex flex-1 flex-col gap-2.25">
        <div className="bg-chip h-6 w-1/2" />
        <div className="bg-chip h-6 w-2/5" />
      </div>
      <div className="bg-chip h-10 w-4" />
    </div>
  );
}
