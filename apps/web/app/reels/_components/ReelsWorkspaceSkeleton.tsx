import { ReelSkeleton } from "./ReelSkeleton";

/**
 * 릴 작업 영역의 로딩 자리 (KAN-602). `ReelsWorkspace`가 씨앗 없이 클라에서 받을 때와
 * 같은 바탕과 릴 한 장 뼈대다. 라우트 `loading.tsx`와 릴스 페이지의 Suspense fallback이
 * 같이 쓴다.
 */
export function ReelsWorkspaceSkeleton() {
  return (
    <div className="bg-chip flex min-h-0 flex-1 overflow-hidden">
      <main className="bg-chip min-w-0 flex-1">
        <ReelSkeleton />
      </main>
    </div>
  );
}
