import Link from "next/link";
import { matchDetailPath } from "@plick/domain/format";
import { kickoffTimeLabel } from "@plick/domain/live";
import {
  fixtureOpponent,
  playedDateLabel,
  roundLabel,
  teamScoreLabel,
  type TeamFixture,
} from "@plick/domain/team-profile";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { ResultChip } from "@/_components/ResultChip";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";

/** 경기 행 열 그리드 (시안: 날짜 62, 홈/원정 30, 상대, 스코어, 결과 22). */
const COLS = "grid-cols-[3.875rem_1.875rem_minmax(0,1fr)_auto_1.375rem]";

/**
 * 팀 경기 행 목록 (KAN-604, 시안 팀 프로필 모바일 경기 행). 높이 52에 날짜(아래 줄은
 * 지난 경기면 라운드, 예정이면 시각), 홈/원정, 상대 엠블럼 24 + 이름, 이 팀 기준 스코어
 * 15/900(예정은 흐린 "vs"), 결과 칸 22다. 상대가 빅6면 팀 프로필로 링크한다. 개요의
 * 최근 경기와 경기 탭이 같이 쓴다.
 *
 * @param fixtures 경기(호출부가 정한 순서)
 */
export function TeamFixtureRows({ fixtures }: { fixtures: TeamFixture[] }) {
  return (
    <div>
      {fixtures.map((fixture) => (
        <FixtureRow key={fixture.matchId} fixture={fixture} />
      ))}
    </div>
  );
}

function FixtureRow({ fixture }: { fixture: TeamFixture }) {
  const opponent = fixtureOpponent(fixture);
  const score = teamScoreLabel(fixture);
  const played = score !== null;
  return (
    <div
      className={`border-border-soft grid h-13 items-center gap-2 border-b ${COLS}`}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-label-lg text-text-strong font-bold whitespace-nowrap tabular-nums">
          {playedDateLabel(fixture.kickoffAt)}
        </span>
        <span className="text-caption text-text-4 tabular-nums">
          {played
            ? roundLabel(fixture.round)
            : kickoffTimeLabel(fixture.kickoffAt)}
        </span>
      </span>
      <span className="text-caption text-text-3">
        {fixture.isHome ? "홈" : "원정"}
      </span>
      <TeamProfileLink
        team={opponent}
        className="flex min-w-0 items-center gap-2 active:opacity-70"
      >
        <LiveCrest team={opponent} size={24} decorative />
        <span className="text-body-md text-text-strong truncate font-bold">
          {opponent.name}
        </span>
      </TeamProfileLink>
      {/* 스코어 칸이 경기 상세 링크다 (KAN-683). 크롤러가 지난 경기에 닿는 유일한 길이다 */}
      <Link
        href={matchDetailPath(fixture.matchId)}
        aria-label={`${opponent.name} 경기 상세`}
        className={`text-body-lg text-right font-black tabular-nums active:opacity-60 ${played ? "text-text-strong" : "text-text-4"}`}
      >
        {score ?? "vs"}
      </Link>
      {fixture.result ? <ResultChip result={fixture.result} /> : <span />}
    </div>
  );
}
