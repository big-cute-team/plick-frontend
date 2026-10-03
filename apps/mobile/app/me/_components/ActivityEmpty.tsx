import { ACTIVITY_EMPTY_COPY } from "@/_constants/activity";
import type { ActivityTab } from "@/_types/activity";

/**
 * 활동이 없는 탭의 빈 상태 (KAN-495, KAN-567). 시안대로 한 줄, 13.5 회색,
 * 위아래 40px이다.
 *
 * @param tab 어느 탭이 비었는지. 문구가 갈린다
 */
export function ActivityEmpty({ tab }: { tab: ActivityTab }) {
  return (
    <p className="text-body text-text-4 py-10 text-center">
      {ACTIVITY_EMPTY_COPY[tab]}
    </p>
  );
}
