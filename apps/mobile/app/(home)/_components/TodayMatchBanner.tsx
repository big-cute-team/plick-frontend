import Link from "next/link";
import {
  activeMatches,
  featuredMatch,
  matchStatusLabel,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";

/**
 * 홈 맨 위의 LIVE 띠 (KAN-504, 시안 KAN-567). 오늘 경기가 있는 날에만 서고 누르면
 * 그 경기 상세로 간다.
 *
 * 시안: 채운 면(radius 16) 안에 빨간 세로 막대와 `LIVE` 글자, 두 팀 엠블럼 17px 사이
 * 스코어 13.5/900, 진행 중이면 빨간 분, 오른쪽 끝에 채팅 접속 수. 접속 수는 BE에
 * 없어 그 자리에 경기 상태(예정 시각·종료)를 둔다. 대표를 고르는 규칙은
 * 도메인({@link featuredMatch})이 갖는다 — 라이브가 있으면 그것, 없으면 다음 예정,
 * 다 끝났으면 마지막 경기다.
 *
 * 경기가 없는 날(빈 배열)과 취소·연기만 있는 날에는 아무것도 그리지 않는다.
 * 목록을 못 받은 날도 마찬가지로 조용히 빠진다 — 배너는 부가 정보라 호출부가
 * 실패를 빈 배열로 접어 넘긴다.
 *
 * @param matches 오늘(KST) 경기 목록. 킥오프 오름차순이라는 BE 규약에 기댄다.
 */
export function TodayMatchBanner({ matches }: { matches: MatchSummary[] }) {
  const today = activeMatches(matches);
  const featured = featuredMatch(today);
  if (!featured) return null;

  const live = featured.status === "LIVE";
  const status = matchStatusLabel(featured);
  const scored = featured.score.home !== null && featured.score.away !== null;

  return (
    <Link
      href={`/live/matches/${featured.id}`}
      className="bg-elevate rounded-card flex items-center gap-2.25 p-3 active:opacity-80"
    >
      <span aria-hidden className="bg-danger h-3.5 w-0.75 shrink-0" />
      <span className="text-micro-lg tracking-live text-danger shrink-0 font-black">
        LIVE
      </span>
      <LiveCrest team={featured.home} size={17} />
      <span className="text-body text-text-strong font-black">
        {scored ? `${featured.score.home} : ${featured.score.away}` : "vs"}
      </span>
      <LiveCrest team={featured.away} size={17} />
      {live ? (
        <span className="text-caption text-danger font-bold">
          {status.primary}
        </span>
      ) : (
        <span className="text-caption text-text-3 font-bold">
          {status.primary}
        </span>
      )}
      <span className="flex-1" />
      <span className="text-caption-lg text-text-3 shrink-0 whitespace-nowrap">
        {today.length > 1 ? `오늘 ${today.length}경기` : status.secondary}
      </span>
    </Link>
  );
}
