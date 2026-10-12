import { SiteHeader } from "@/_components/SiteHeader";
import { ReelsWorkspaceSkeleton } from "@/reels/_components/ReelsWorkspaceSkeleton";

/**
 * 릴스 피드의 로딩 자리 (KAN-602). 상단 바와 릴 한 장 뼈대를 먼저 그린다.
 *
 * 라우트 그룹 `(feed)` 안에 둬 릴 상세(`/reels/[postId]`)까지 이 뼈대로 덮지 않는다.
 */
export default function ReelsLoading() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SiteHeader />
      <ReelsWorkspaceSkeleton />
    </div>
  );
}
