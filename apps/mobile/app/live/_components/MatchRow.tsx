import Link from "next/link";
import {
  liveTeamLabel,
  matchStatusLabel,
  type MatchStatusTone,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { scoreTone, type ScoreTone } from "@/_utils/live";

/** 상태 칸 첫 줄의 톤 → 색 토큰. 시안 `toneColor`(라이브 빨강, 종료 회색, 예정 본문) */
const TONE_TEXT: Record<MatchStatusTone, string> = {
  live: "text-danger",
  scheduled: "text-text-2",
  finished: "text-text-4",
  postponed: "text-warn",
};

/** 스코어 숫자 톤 → 색 토큰. 시안 `homeScoreColor` */
const SCORE_TEXT: Record<ScoreTone, string> = {
  accent: "text-accent",
  strong: "text-text-strong",
  muted: "text-text-4",
};

/**
 * 경기 목록 한 행 (시안 KAN-567). 상태 칸 42px, 홈 팀명(오른쪽 정렬)과 엠블럼 36,
 * 스코어 58px 칸, 엠블럼과 원정 팀명 순서다. 행 전체가 상세로 가는 링크라 안에
 * 팀 프로필 링크를 두지 않는다(중첩 앵커). 연기·취소 경기도 상세(헤더만 있는
 * 지면)로 들어갈 수 있다.
 *
 * 전에는 채운 면 카드에 팀 두 줄을 쌓았는데(피그마 L1) 시안이 한 줄 행이라
 * 바꿨다. 팀명은 빅6 한글 약칭(`liveTeamLabel`)이다. 시안의 "리버풀", "본머스"가
 * 그 표기다.
 *
 * @param match 경기
 */
export function MatchRow({ match }: { match: MatchSummary }) {
  const { primary, secondary, tone } = matchStatusLabel(match);
  const scored = match.score.home !== null && match.score.away !== null;

  return (
    <Link
      href={`/live/matches/${match.id}`}
      className="border-border-soft flex items-center gap-2.5 border-b py-3.25 active:opacity-70"
    >
      <span className="flex w-10.5 shrink-0 flex-col items-center gap-0.5">
        <span className={`text-body font-bold ${TONE_TEXT[tone]}`}>
          {primary}
        </span>
        <span className="text-micro-lg text-text-4">{secondary}</span>
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className="text-body text-text-strong min-w-0 truncate font-bold">
          {liveTeamLabel(match.home)}
        </span>
        <LiveCrest team={match.home} size={36} />
      </span>
      <span className="flex w-14.5 shrink-0 items-center justify-center gap-1.5">
        {scored ? (
          <span className="text-reel flex items-center gap-1.5 font-black">
            <span className={SCORE_TEXT[scoreTone(match, "home")]}>
              {match.score.home}
            </span>
            <span className="text-body text-text-4">:</span>
            <span className={SCORE_TEXT[scoreTone(match, "away")]}>
              {match.score.away}
            </span>
          </span>
        ) : (
          <span className="text-body-lg text-text-4 font-bold">-</span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <LiveCrest team={match.away} size={36} />
        <span className="text-body text-text-strong min-w-0 truncate font-bold">
          {liveTeamLabel(match.away)}
        </span>
      </span>
    </Link>
  );
}
