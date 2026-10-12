import { LIVE_SEASON_LABEL } from "@plick/domain/live";
import {
  fixtureOpponent,
  playedDateLabel,
  teamScoreLabel,
  type TeamFixture,
} from "@plick/domain/team-profile";
import type { ArticleCard, TeamCode } from "@plick/domain/types";
import { LiveCrest } from "@plick/ui/LiveCrest";
import { PostListItem } from "@/_components/PostListItem";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { TeamProfileLink } from "@/live/_components/TeamProfileLink";
import { ProfileSection } from "./ProfileSection";
import { ResultBox } from "./ResultBox";

/**
 * 개요 탭 (KAN-599, 시안 팀 프로필 1262-1294행). 관련 이슈는 홈과 같은 이슈 행
 * (`PostListItem`)을 이 팀 엠블럼으로 고정해 깔고, 최근 경기는 지난 경기 앞 5개를
 * 날짜, 홈/원정, 상대, 이 팀 기준 스코어, 결과 칸으로 그린다.
 *
 * @param code 이 팀 코드(이슈 행 엠블럼)
 * @param issues 팀 이슈. null이면 불러오지 못한 것
 * @param recent 최근 경기(최신순). null이면 불러오지 못한 것
 */
export function TeamOverviewPanel({
  code,
  issues,
  recent,
}: {
  code: TeamCode;
  issues: ArticleCard[] | null;
  recent: TeamFixture[] | null;
}) {
  return (
    <>
      <ProfileSection title="관련 이슈">
        {issues === null ? (
          <p className="text-body text-text-4 py-7">이슈를 불러오지 못했어요</p>
        ) : issues.length === 0 ? (
          <p className="text-body text-text-4 py-7">
            아직 올라온 이슈가 없어요
          </p>
        ) : (
          issues.map((post, i) => (
            <PostListItem
              key={post.id}
              post={post}
              variant="news"
              filter={code}
              rank={i}
            />
          ))
        )}
      </ProfileSection>
      <ProfileSection title="최근 경기" note={`${LIVE_SEASON_LABEL} 시즌`}>
        {recent === null ? (
          <LiveLoadError />
        ) : recent.length === 0 ? (
          <p className="text-body text-text-4 py-7">아직 치른 경기가 없어요</p>
        ) : (
          recent.map((fixture) => (
            <RecentRow key={fixture.matchId} fixture={fixture} />
          ))
        )}
      </ProfileSection>
    </>
  );
}

function RecentRow({ fixture }: { fixture: TeamFixture }) {
  const opponent = fixtureOpponent(fixture);
  return (
    <div className="border-border-soft grid h-11 grid-cols-[4rem_2.25rem_minmax(0,1fr)_3.5rem_1.5rem] items-center gap-2.5 border-b">
      <span className="text-label text-text-3 tabular-nums">
        {playedDateLabel(fixture.kickoffAt)}
      </span>
      <span className="text-label text-text-4">
        {fixture.isHome ? "홈" : "원정"}
      </span>
      <TeamProfileLink
        team={opponent}
        className="group focus-visible:outline-accent flex min-w-0 items-center gap-2 focus-visible:outline-2"
      >
        <LiveCrest team={opponent} size={20} />
        <span
          className={`text-body text-text-strong truncate font-bold ${opponent.code ? "group-hover:text-accent" : ""}`}
        >
          {opponent.name}
        </span>
      </TeamProfileLink>
      <span className="text-body-md text-text-strong text-center font-black tabular-nums">
        {teamScoreLabel(fixture) ?? "-"}
      </span>
      {fixture.result ? <ResultBox result={fixture.result} /> : <span />}
    </div>
  );
}
