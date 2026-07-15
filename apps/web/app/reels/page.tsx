import { SiteHeader } from "@/_components/SiteHeader";
import { NOTIF_COUNT, POSTS } from "@/_lib/mock";
import { ReelViewer } from "./_components/ReelViewer";

/**
 * 데스크톱 웹 릴스 화면 (KAN-218) — GNB + 세로 스냅 릴 뷰어.
 *
 * 뷰포트 전체(100dvh)를 헤더 + 릴 뷰어로 채우고, 스크롤은 뷰어 안에서만 일어난다
 * (문서 흐름을 스크롤시키지 않아 스냅이 깔끔하다).
 */
export default function ReelsPage() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SiteHeader notif={NOTIF_COUNT} />
      <ReelViewer posts={POSTS} />
    </div>
  );
}
