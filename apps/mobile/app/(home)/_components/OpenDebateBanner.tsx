import { openDebates } from "@plick/domain/format";
import type { DebateListItem } from "@plick/domain/types";
import { VsIcon } from "@plick/ui/icons";
import { HomeBanner } from "./HomeBanner";

/**
 * 진행 중인 투표가 있을 때만 서는 배너 (KAN-504). 누르면 VS 탭으로 간다.
 *
 * 티켓 요구대로 오늘 경기 배너 바로 아래, 핫이슈 위에 같은 모양으로 붙는다.
 * 대표로 세우는 건 마감이 가장 가까운 투표다({@link openDebates}) — 재촉할
 * 이유가 가장 큰 쪽이고, 최신순 첫 건을 쓰면 오늘 자정에 닫히는 투표를 두고
 * 일주일 뒤 마감을 보여주게 된다.
 *
 * 마감 판정을 여기서 다시 하는 이유는 BE가 `closesAt`이 지나도 기사
 * `contentType`을 FINISH로 넘기지 않기 때문이다(KAN-436·437). 도메인 헬퍼가
 * 두 기준을 OR로 겹쳐 준다.
 *
 * 열린 투표가 없으면 아무것도 그리지 않는다 — 실패를 빈 배열로 접는 규약도
 * {@link TodayMatchBanner}와 같다.
 *
 * @param debates 토론 리스트 응답(마감 포함). 필터·정렬은 이 컴포넌트가 한다.
 */
export function OpenDebateBanner({ debates }: { debates: DebateListItem[] }) {
  const open = openDebates(debates);
  const featured = open[0];
  if (!featured) return null;

  return (
    <HomeBanner
      href="/debates"
      leading={
        /* 경기 배너의 크레스트 줄(22px)보다 크지만 본문 두 줄보다는 낮게 —
           두 배너 높이를 본문이 정하게 해서 나란히 섰을 때 어긋나지 않는다 */
        <span className="bg-accent-tint text-accent grid size-8 shrink-0 place-items-center rounded-full">
          <VsIcon size={18} />
        </span>
      }
      title={`투표 진행 중 ${open.length}개`}
      description={featured.topic}
    />
  );
}
