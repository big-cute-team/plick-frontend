import { SiteHeader } from "@/_components/SiteHeader";
import { NOTIF_COUNT, POSTS } from "@/_lib/mock";
import { ReelsWorkspace } from "./_components/ReelsWorkspace";

/**
 * 데스크톱 웹 릴스 화면 (KAN-218) — GNB + 세로 스냅 릴 뷰어.
 * 제목·댓글 클릭 시 오른쪽 세부 패널 (KAN-219) — `ReelsWorkspace`가 소유.
 *
 * 뷰포트 전체(100dvh)를 헤더 + 작업 영역으로 채우고, 스크롤은 뷰어 안에서만 일어난다
 * (문서 흐름을 스크롤시키지 않아 스냅이 깔끔하다).
 */
export default function ReelsPage() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SiteHeader notif={NOTIF_COUNT} />
      <ReelsWorkspace posts={POSTS} />
    </div>
  );
}
