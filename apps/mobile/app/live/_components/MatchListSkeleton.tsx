/** 첫 로딩에 보여줄 행 자리 개수. */
const SKELETON_COUNT = 3;

/**
 * 경기 목록의 로딩 자리. 클라가 목록을 받는 동안의 경계 fallback과 라우트
 * `loading.tsx`(KAN-602)가 같은 모양을 쓴다.
 */
export function MatchListSkeleton() {
  return (
    <div className="px-edge flex flex-col">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <MatchRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** 경기 행 자리 스켈레톤 (KAN-567). 상태 칸, 팀명과 엠블럼 둘, 스코어의 실루엣이다. */
function MatchRowSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse items-center gap-2.5 border-b py-3.25">
      <div className="bg-elevate rounded-badge h-7 w-10.5" />
      <div className="flex flex-1 items-center justify-end gap-2">
        <div className="bg-elevate rounded-badge h-3.5 w-14" />
        <div className="bg-avatar size-9 rounded-full" />
      </div>
      <div className="bg-elevate rounded-badge h-5 w-10" />
      <div className="flex flex-1 items-center gap-2">
        <div className="bg-avatar size-9 rounded-full" />
        <div className="bg-elevate rounded-badge h-3.5 w-14" />
      </div>
    </div>
  );
}
