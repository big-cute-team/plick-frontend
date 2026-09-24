import { permanentRedirect } from "next/navigation";
import { activityTabFrom, activityTabPath } from "@/_utils/activity";

/**
 * 옛 활동 화면 주소 (KAN-495). KAN-567에서 활동 목록이 MY 본문 탭으로 들어가
 * 이 주소는 `/me?tab=`으로 보낸다. 옛 링크와 즐겨찾기가 남아 있을 수 있어
 * 라우트를 지우지 않고 redirect로 남긴다. 탭 쿼리는 그대로 옮긴다(옛 기본 탭인
 * 좋아요는 이제 쿼리가 붙는다).
 *
 * @param searchParams `tab` 쿼리
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  permanentRedirect(activityTabPath(activityTabFrom(tab ?? "likes")));
}
