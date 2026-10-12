/** 첫 로딩에 보여줄 카드 자리 개수. 카드가 커서 기사 리스트보다 적게 둔다. */
const SKELETON_COUNT = 3;

/**
 * 투표 리스트의 로딩 자리. 클라가 리스트를 받는 동안의 경계 fallback과 라우트
 * `loading.tsx`(KAN-602)가 같은 모양을 쓴다.
 */
export function DebateListSkeleton() {
  return (
    <div>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <DebateCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** 투표 카드 자리 스켈레톤. 배지·질문·트랙 2개의 실루엣이다. */
function DebateCardSkeleton() {
  return (
    <div className="border-border-soft border-b py-4">
      <div className="bg-vote-card rounded-card flex animate-pulse flex-col gap-3 p-4">
        <div className="bg-vote-track rounded-badge h-5 w-16" />
        <div className="bg-vote-track rounded-tile h-6 w-3/4" />
        <div className="bg-vote-track rounded-tile h-9" />
        <div className="bg-vote-track rounded-tile h-9" />
      </div>
    </div>
  );
}
