import {
  activeMatches,
  featuredMatch,
  hasLiveMatch,
  matchSummaryLine,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { LiveDot } from "@plick/ui/LiveDot";
import { HomeBanner } from "./HomeBanner";

/**
 * 오늘 경기가 있는 날에만 핫이슈 위에 서는 배너 (KAN-504). 누르면 LIVE 탭으로 간다.
 *
 * 홈에 들어온 사람이 "오늘 경기 있나"를 확인하러 탭을 옮기지 않아도 되게 하는
 * 게 목적이라, 개수만 세지 않고 대표 경기 한 줄을 같이 싣는다. 대표를 고르는
 * 규칙은 도메인이 갖고 있다({@link featuredMatch}) — 라이브가 있으면 그것,
 * 없으면 다음 예정, 다 끝났으면 마지막 경기다.
 *
 * 경기가 없는 날(빈 배열)과 취소·연기만 있는 날에는 아무것도 그리지 않는다.
 * 목록을 못 받은 날도 마찬가지로 조용히 빠진다 — 배너는 부가 정보라 호출부가
 * 실패를 빈 배열로 접어 넘긴다. 핫이슈처럼 "불러오지 못했어요" 자리를 남기면
 * 경기 없는 날과 구분도 안 되면서 첫 화면만 잡아먹는다.
 *
 * @param matches 오늘(KST) 경기 목록. 킥오프 오름차순이라는 BE 규약에 기댄다.
 */
export function TodayMatchBanner({ matches }: { matches: MatchSummary[] }) {
  const today = activeMatches(matches);
  const featured = featuredMatch(today);
  if (!featured) return null;

  const live = hasLiveMatch(today);

  return (
    <HomeBanner
      href="/live"
      leading={
        <span className="flex shrink-0 items-center -space-x-1.5">
          {/* 겹쳐 놓아 두 팀이 한 경기임을 폭 40px 안에서 보여준다 */}
          <LiveCrest team={featured.home} size={22} />
          <LiveCrest team={featured.away} size={22} />
        </span>
      }
      badge={live ? <LiveDot /> : undefined}
      title={live ? "지금 경기 중" : `오늘 경기 ${today.length}개`}
      description={matchSummaryLine(featured)}
    />
  );
}
