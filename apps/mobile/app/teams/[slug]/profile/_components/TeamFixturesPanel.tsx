import type { TeamFixtures } from "@plick/domain/team-profile";
import { ProfileSection } from "@/_components/ProfileSection";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { TeamFixtureRows } from "./TeamFixtureRows";

/**
 * 경기 탭 (KAN-604, 시안 팀 프로필 모바일 경기). 예정 경기(킥오프 오름차순)와 지난
 * 경기(최신순)를 같은 행 모양으로 깐다.
 *
 * @param fixtures 시즌 경기. null이면 불러오지 못한 것
 */
export function TeamFixturesPanel({
  fixtures,
}: {
  fixtures: TeamFixtures | null;
}) {
  if (fixtures === null) return <LiveLoadError />;
  return (
    <>
      <ProfileSection title="예정 경기">
        {fixtures.upcoming.length === 0 ? (
          <p className="text-body text-text-4 py-6">남은 경기가 없어요</p>
        ) : (
          <TeamFixtureRows fixtures={fixtures.upcoming} />
        )}
      </ProfileSection>
      <ProfileSection title="지난 경기">
        {fixtures.results.length === 0 ? (
          <p className="text-body text-text-4 py-6">아직 치른 경기가 없어요</p>
        ) : (
          <TeamFixtureRows fixtures={fixtures.results} />
        )}
      </ProfileSection>
    </>
  );
}
