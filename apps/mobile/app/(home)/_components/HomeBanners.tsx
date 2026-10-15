import { unstable_rethrow } from "next/navigation";
import { getDebates } from "@plick/core/debates";
import { getMatches } from "@plick/core/live";
import { todayDateKeyKst } from "@plick/domain/live";
import { LIVE_SCORE_PAUSED } from "@plick/domain/live-pause";
import { OpenDebateBanner } from "./OpenDebateBanner";
import { TodayMatchBanner } from "./TodayMatchBanner";

/**
 * 홈 맨 위 LIVE·VS 띠 (KAN-504). 오늘 경기와 투표 리스트를 직접 받아 그린다.
 *
 * `HomeScreen`이 Suspense(fallback 없음)로 감싸 스트리밍한다 (KAN-602). 오늘 경기
 * 조회가 느려도 핫이슈와 소식은 먼저 뜨고, 띠는 도착하면 그 위에 끼어든다. 두 조회를
 * 한 경계에 묶은 건 띠가 따로 들어오며 두 번 밀리지 않게 하려는 것이다.
 *
 * 둘 다 부가 정보라 실패를 빈 배열로 접는다. 자리를 비워 두면 경기·투표가 없는 날과
 * 똑같이 보이고, 그게 맞는 처리다. 둘 다 없는 날은 `empty:hidden`으로 상자째 지운다.
 * 라이브 스코어를 닫아 둔 동안(KAN-644)은 경기 조회를 건너뛰어 LIVE 띠가 서지 않는다.
 */
export async function HomeBanners() {
  const [matchResult, debateResult] = await Promise.allSettled([
    LIVE_SCORE_PAUSED ? [] : getMatches(todayDateKeyKst()),
    getDebates(),
  ]);

  const matches = matchResult.status === "fulfilled" ? matchResult.value : [];
  if (matchResult.status === "rejected") {
    /* Next가 제어 흐름으로 쓰는 예외(정적 생성 중단 등)는 되던진다 (KAN-632) */
    unstable_rethrow(matchResult.reason);
    console.error("[home] 오늘 경기 로드 실패:", matchResult.reason);
  }
  const debates = debateResult.status === "fulfilled" ? debateResult.value : [];
  if (debateResult.status === "rejected") {
    unstable_rethrow(debateResult.reason);
    console.error("[home] 토론 리스트 로드 실패:", debateResult.reason);
  }

  return (
    <div className="px-edge flex flex-col gap-2 pt-3 empty:hidden">
      <TodayMatchBanner matches={matches} />
      <OpenDebateBanner debates={debates} />
    </div>
  );
}
