import { SiteHeader } from "@/_components/SiteHeader";
import { ReelSkeleton } from "@/reels/_components/ReelSkeleton";

/**
 * 릴스 피드의 로딩 자리 (KAN-602). 첫 페이지(`GET /reels`, 토큰을 실어 캐시를 못 탄다)를
 * 기다리는 동안 상단 바와 릴 한 장 뼈대를 먼저 그린다. `ReelsWorkspace`가 씨앗 없이
 * 클라에서 받을 때와 같은 모양이라 내용이 와도 자리가 튀지 않는다.
 *
 * 라우트 그룹 `(feed)` 안에 둬 릴 상세(`/reels/[postId]`)까지 이 뼈대로 덮지 않는다.
 */
export default function ReelsLoading() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SiteHeader />
      <div className="bg-chip flex min-h-0 flex-1 overflow-hidden">
        <main className="bg-chip min-w-0 flex-1">
          <ReelSkeleton />
        </main>
      </div>
    </div>
  );
}
