import type { PlayerMatch } from "@plick/domain/player-profile";
import type { ArticleCard } from "@plick/domain/types";
import { NewsItem } from "@/_components/NewsItem";
import { ProfileSection } from "@/_components/ProfileSection";
import { LiveLoadError } from "@/live/_components/LiveLoadError";
import { PlayerMatchRows } from "./PlayerMatchRows";

/**
 * 개요 탭 앞부분 (KAN-604, 시안 선수 프로필 모바일 개요). 관련 이슈는 연결된 인물
 * (`figureId`)로 받은 기사를 홈과 같은 이슈 행으로 깔고, 인물이 연결되지 않았으면 빈
 * 상태다. 최근 경기는 경기 기록 앞 5개(최신순)다. 시즌 출전과 같은 팀 선수는 호출부가
 * 이어 붙인다.
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
          <p className="text-body text-text-4 py-6">이슈를 불러오지 못했어요</p>
        ) : issues.length === 0 ? (
          <p className="text-body text-text-4 py-6">
            아직 올라온 이슈가 없어요
          </p>
        ) : (
          issues.map((article, i) => (
            <NewsItem key={article.id} article={article} rank={i} />
          ))
        )}
      </ProfileSection>
      <ProfileSection title="최근 경기">
        {recent === null ? (
          <LiveLoadError />
        ) : recent.length === 0 ? (
          <p className="text-body text-text-4 py-6">아직 치른 경기가 없어요</p>
        ) : (
          <PlayerMatchRows matches={recent} />
        )}
      </ProfileSection>
    </>
  );
}
