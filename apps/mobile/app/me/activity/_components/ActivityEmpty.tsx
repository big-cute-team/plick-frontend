import { ACTIVITY_EMPTY_COPY } from "@/_constants/activity";
import type { ActivityTab } from "@/_types/activity";

/**
 * 활동이 없는 탭의 빈 상태 (KAN-495). 홈 "아직 이 팀 소식이 없어요"와 같은
 * 톤에 다음 행동을 한 줄 덧붙인다.
 *
 * @param tab 어느 탭이 비었는지. 문구가 갈린다
 */
export function ActivityEmpty({ tab }: { tab: ActivityTab }) {
  const copy = ACTIVITY_EMPTY_COPY[tab];
  return (
    <div className="py-14 text-center">
      <p className="text-body text-text-3 font-bold">{copy.title}</p>
      <p className="text-label text-text-4 mt-1.5">{copy.hint}</p>
    </div>
  );
}
