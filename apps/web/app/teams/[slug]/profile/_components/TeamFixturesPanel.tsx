import Link from "next/link";
import { kickoffDateLabel, kickoffTimeLabel } from "@plick/domain/live";
import { matchDetailPath } from "@plick/domain/format";
import {
  playedDateLabel,
  roundLabel,
  type TeamFixture,
} from "@plick/domain/team-profile";
import type { LiveTeam } from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";
import { ProfileSection } from "@/_components/ProfileSection";
import { ResultBox } from "./ResultBox";

/** 경기 행 열 그리드 (시안 1299행: 라운드 40, 일시 118, 홈, 스코어 64, 원정, 결과 26). */
const COLS =
  "grid-cols-[2.5rem_7.375rem_minmax(0,1fr)_4rem_minmax(0,1fr)_1.625rem]";

/**
 * 경기 탭 (KAN-599, 시안 팀 프로필 1295-1330행). 예정 경기와 지난 경기를 같은 행 모양으로
 * 깐다. 라운드, 일시, 홈팀 + 엠블럼, 스코어 또는 vs, 엠블럼 + 원정팀, 결과 칸이고 이 팀
 * 이름만 900이다. 빅6 팀 이름은 팀 프로필로 링크한다.
 *
 * @param fixtures 시즌 경기. null이면 불러오지 못한 것
 */
export function TeamFixturesPanel({
  fixtures,
}: {
  fixtures: { upcoming: TeamFixture[]; results: TeamFixture[] } | null;
}) {
  if (fixtures === null) return <LiveLoadError />;
  return (
    <>
      <ProfileSection title="예정 경기">
        {fixtures.upcoming.length === 0 ? (
          <p className="text-body text-text-4 py-7">남은 경기가 없어요</p>
        ) : (
          <FixtureList fixtures={fixtures.upcoming} />
        )}
      </ProfileSection>
      <ProfileSection title="지난 경기">
        {fixtures.results.length === 0 ? (
          <p className="text-body text-text-4 py-7">아직 치른 경기가 없어요</p>
        ) : (
          <FixtureList fixtures={fixtures.results} />
        )}
      </ProfileSection>
    </>
  );
}

/** 좁은 화면에서는 열을 숨기지 않고 목록만 가로로 넘긴다. */
function FixtureList({ fixtures }: { fixtures: TeamFixture[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[32rem]">
        {fixtures.map((fixture) => (
          <FixtureRow key={fixture.matchId} fixture={fixture} />
        ))}
      </div>
    </div>
  );
}

function FixtureRow({ fixture }: { fixture: TeamFixture }) {
  const { home, away, score, result } = fixture;
  const played = score.home !== null && score.away !== null;
  const when = played
    ? playedDateLabel(fixture.kickoffAt)
    : `${kickoffDateLabel(fixture.kickoffAt)} ${kickoffTimeLabel(fixture.kickoffAt)}`;

  return (
    <div
      className={`border-border-soft grid h-12 items-center gap-3 border-b ${COLS}`}
    >
      <span className="text-label text-text-4 tabular-nums">
        {roundLabel(fixture.round)}
      </span>
      <span
        className="text-label text-text-2 truncate tabular-nums"
        title={fixture.competition}
      >
        {when}
      </span>
      <Side team={home} self={fixture.isHome} align="end" />
      {/* 스코어 칸이 경기 상세 링크다 (KAN-683). 크롤러가 지난 경기에 닿는 유일한 길이다 */}
      <Link
        href={matchDetailPath(fixture.matchId)}
        aria-label={`${home.name} ${away.name} 경기 상세`}
        className={`text-body-lg hover:text-accent focus-visible:outline-accent text-center font-black tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 ${played ? "text-text-strong" : "text-text-4"}`}
      >
        {played ? `${score.home}-${score.away}` : "vs"}
      </Link>
      <Side team={away} self={!fixture.isHome} align="start" />
      {result ? <ResultBox result={result} /> : <span />}
    </div>
  );
}

function Side({
  team,
  self,
  align,
}: {
  team: LiveTeam;
  self: boolean;
  align: "start" | "end";
}) {
  const name = (
    <span
      className={`text-body text-text-strong truncate ${self ? "font-black" : "font-medium"} ${team.code ? "group-hover:text-accent" : ""}`}
    >
      {team.name}
    </span>
  );
  const crest = <LiveCrest team={team} size={20} decorative />;
  return (
    <TeamProfileLink
      team={team}
      className={`group focus-visible:outline-accent flex min-w-0 items-center gap-2 focus-visible:outline-2 ${align === "end" ? "justify-end" : ""}`}
    >
      {align === "end" ? (
        <>
          {name}
          {crest}
        </>
      ) : (
        <>
          {crest}
          {name}
        </>
      )}
    </TeamProfileLink>
  );
}
