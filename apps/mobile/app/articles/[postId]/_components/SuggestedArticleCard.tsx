import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import type { ArticleCard } from "@/_types/articles";
import { formatRelativeTime } from "@/_utils/time";

/**
 * "함께 보면 좋은 기사" 가로 스크롤 카드 한 장 — 팀·단계 + 제목 + 기자·시각의
 * 단순 서페이스 카드 (KAN-301).
 *
 * 포털 뉴스 이슈 카드처럼 배경색 없는 담백한 카드다. 팀컬러 그라데이션이나
 * 스크림을 깔지 않고, 사진이 있으면 우측에 작은 썸네일로만 붙이고 null이면
 * 텍스트만 남긴다. 톤은 홈 "지금 올라온 소식"의 `NewsItem`과 맞춘다.
 * 탭하면 해당 기사 세부로 이동한다.
 */
export function SuggestedArticleCard({ article }: { article: ArticleCard }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;

  return (
    <Link
      href={`/articles/${article.id}`}
      className="bg-elevate border-border rounded-card gap-gap flex w-[62%] shrink-0 items-start border p-3.5 active:opacity-70"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {team && (
            <span className="text-caption text-icon font-extrabold">
              {team.name}
            </span>
          )}
          {article.stage && (
            <span className="text-micro tracking-label text-text-4 font-bold">
              {STAGE_META[article.stage].label}
            </span>
          )}
          {/* 탭하면 이동한다는 단서 — 포털 이슈 카드의 우상단 화살표 */}
          <ChevronMiniIcon size={14} className="text-text-4 ml-auto shrink-0" />
        </div>
        <h3 className="text-body text-text mt-1 line-clamp-2 leading-snug font-bold">
          {article.title}
        </h3>
        <p className="text-caption text-text-3 mt-1">
          {article.reporter && (
            <span className="text-text-2 font-semibold">
              {article.reporter.name}
            </span>
          )}
          <span suppressHydrationWarning>
            {article.reporter ? " · " : ""}
            {formatRelativeTime(article.publishedAt)}
          </span>
        </p>
      </div>
      {article.imageUrl && (
        <MediaThumb
          colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
          imageUrl={article.imageUrl}
          className="rounded-control size-14 shrink-0"
        />
      )}
    </Link>
  );
}
