import {
  placeLabel,
  type TeamInfo,
  type TeamFixture,
} from "@plick/domain/team-profile";
import type { StandingRow } from "@plick/domain/live";
import type { ArticleCard, TeamCode } from "@plick/domain/types";
import { NewsItem } from "@/_components/NewsItem";
import { ProfileFacts } from "@/_components/ProfileFacts";
import { ProfileSection } from "@/_components/ProfileSection";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { StandingsWindow } from "./StandingsWindow";
import { TeamFixtureRows } from "./TeamFixtureRows";

/**
 * 개요 탭 (KAN-604, 시안 팀 프로필 모바일 개요). 관련 이슈(홈과 같은 이슈 행을 이 팀
 * 엠블럼으로 고정), 최근 경기 5, 리그 순위 5팀, 구단 정보 순이다. 웹은 순위와 구단
 * 정보가 우측 레일인데 모바일은 레일이 없어 본문 아래로 내렸다.
 *
 * @param code 이 팀 코드
 * @param teamId 이 팀 BE id(순위 강조)
 * @param issues 팀 이슈. null이면 불러오지 못한 것
 * @param recent 최근 경기(최신순). null이면 불러오지 못한 것
 * @param standings 자른 순위표. null이면 불러오지 못한 것, 빈 배열이면 이 팀 행이 없는 것
 * @param info 구단 정보. null이면 섹션을 뺀다
 */
export function TeamOverviewPanel({
  code,
  teamId,
  issues,
  recent,
  standings,
  info,
}: {
  code: TeamCode;
  teamId: number;
  issues: ArticleCard[] | null;
  recent: TeamFixture[] | null;
  standings: StandingRow[] | null;
  info: TeamInfo | null;
}) {
  return (
    <>
      <ProfileSection title="관련 이슈">
        {issues === null ? (
          <p className="text-body text-text-4 py-6">이슈를 불러오지 못했어요</p>
        ) : issues.length === 0 ? (
          <p className="text-body text-text-4 py-6">
            아직 올라온 이슈가 없어요
          </p>
        ) : (
          issues.map((article, i) => (
            <NewsItem
              key={article.id}
              article={article}
              filter={code}
              rank={i}
            />
          ))
        )}
      </ProfileSection>

      <ProfileSection title="최근 경기">
        {recent === null ? (
          <LiveLoadError />
        ) : recent.length === 0 ? (
          <p className="text-body text-text-4 py-6">아직 치른 경기가 없어요</p>
        ) : (
          <TeamFixtureRows fixtures={recent} />
        )}
      </ProfileSection>

      {standings !== null && standings.length > 0 && (
        <ProfileSection title="리그 순위">
          <StandingsWindow rows={standings} teamId={teamId} />
        </ProfileSection>
      )}

      {info && (
        <ProfileSection title="구단 정보">
          <ProfileFacts
            items={[
              { label: "감독", value: info.coachName ?? "-" },
              {
                label: "홈구장",
                value: info.stadium ? placeLabel(info.stadium) : "-",
              },
              {
                label: "수용 인원",
                value: info.capacity
                  ? `${info.capacity.toLocaleString("ko-KR")}석`
                  : "-",
              },
              {
                label: "연고지",
                value: info.city ? placeLabel(info.city) : "-",
              },
              {
                label: "창단",
                value: info.founded ? `${info.founded}년` : "-",
              },
            ]}
          />
        </ProfileSection>
      )}
    </>
  );
}
