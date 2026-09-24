import { ACTIVITY_EMPTY_COPY } from "@/_constants/me";
import type { ActivityTab } from "@/_types/activity";

/**
 * 활동 탭의 빈 상태 한 줄 (KAN-567). 시안의 차단 목록 빈 상태와 같은 톤(14, text-4,
 * 위아래 40px)이다. 투표 탭은 목록 API가 없어 늘 이 상태다.
 *
 * @param tab 지금 탭
 */
export function ActivityEmpty({ tab }: { tab: ActivityTab }) {
  return (
    <p className="text-body-md text-text-4 py-10">{ACTIVITY_EMPTY_COPY[tab]}</p>
  );
}
