import type { PlayerMatch } from "@plick/domain/player-profile";
import type { ArticleCard } from "@plick/domain/types";
import { PostListItem } from "@/_components/PostListItem";
import { ProfileSection } from "@/_components/ProfileSection";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { PlayerMatchRows } from "./PlayerMatchRows";

/**
 * 개요 탭 (KAN-600, 시안 선수 프로필 1508-1545행). 관련 이슈는 연결된 인물(`figureId`)로 받은
 * 기사를 홈과 같은 이슈 행으로 깔고, 인물이 연결되지 않았으면 빈 상태다. 최근 경기는 경기 기록
 * 앞 5개(최신순)다.
 *
 * @param issues 관련 이슈. null이면 불러오지 못한 것, 인물 미연결이면 빈 배열
 * @param recent 최근 경기. null이면 불러오지 못한 것
 */
export function PlayerOverviewPanel({
  issues,
  recent,
}: {
  issues: ArticleCard[] | null;
  recent: PlayerMatch[] | null;
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
            <PostListItem key={post.id} post={post} variant="news" rank={i} />
          ))
        )}
      </ProfileSection>
      <ProfileSection title="최근 경기">
        {recent === null ? (
          <LiveLoadError />
        ) : recent.length === 0 ? (
          <p className="text-body text-text-4 py-7">아직 치른 경기가 없어요</p>
        ) : (
          <PlayerMatchRows matches={recent} variant="brief" />
        )}
      </ProfileSection>
    </>
  );
}
