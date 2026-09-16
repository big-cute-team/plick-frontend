import { getTrends } from "@plick/core/trends";
import type { TrendRanking, TrendType } from "@plick/domain/types";
import { TrendingTabs } from "@/_components/TrendingTabs";

/**
 * "실시간 급상승" 랭킹 섹션 — 사이드바 카드 한 장 (KAN-501).
 *
 * 지금 뜨는 구단과 선수를 순위로 세운다. 홈과 기사 세부 사이드바가 공용한다.
 *
 * 전용 엔드포인트가 생기기 전에는 이 자리가 핫이슈 조회수 랭킹("실시간 인기",
 * KAN-338)이었다. 기사 제목만 세로로 세우는 목록이라 그 아래 소식 리스트와
 * 보이는 게 겹쳤고, 무엇보다 "실시간"이라 부르면서 실제로는 최근 48시간
 * 조회수였다. `GET /api/v1/trends`가 붙으면서 그 목록을 통째로 걷어내고 팀·선수
 * 랭킹으로 바꿨다 — 기사 단위로만 나열되던 화면에 팀과 인물이라는 진입점이
 * 하나 생긴다(KAN-496).
 *
 * 두 랭킹을 여기서 병렬로 받는다. 화면이 계산할 것은 없다 — 10분마다 도는
 * 배치가 회차로 저장해 둔 순위를 그대로 그린다. 한쪽이 실패해도 다른 탭은
 * 보여야 해서 `allSettled`로 받아 실패한 탭만 null로 내린다.
 *
 * 부모가 이 컴포넌트를 `Suspense`로 감싼다. 사이드바는 본문보다 늦게 와도 되는
 * 자리라, 페이지가 이 두 요청을 기다리는 대신 껍데기를 먼저 흘려보내고 도착하는
 * 대로 채운다.
 */
export async function TrendingSection() {
  const [team, player] = await Promise.allSettled([
    getTrends("TEAM"),
    getTrends("PLAYER"),
  ]);

  if (team.status === "rejected") {
    console.error("[trending] 구단 급상승 로드 실패:", team.reason);
  }
  if (player.status === "rejected") {
    console.error("[trending] 선수 급상승 로드 실패:", player.reason);
  }

  const rankings: Record<TrendType, TrendRanking | null> = {
    TEAM: team.status === "fulfilled" ? team.value : null,
    PLAYER: player.status === "fulfilled" ? player.value : null,
  };

  return (
    <section className="bg-elevate-2 border-border rounded-card p-edge flex flex-col gap-2.5 border">
      <h3 className="text-gnb text-text font-extrabold">실시간 급상승</h3>
      <TrendingTabs rankings={rankings} />
    </section>
  );
}
