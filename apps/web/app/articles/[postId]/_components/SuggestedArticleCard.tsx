import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { formatRelativeTime } from "@plick/domain/format";
import type { ArticleCard } from "@plick/domain/types";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";

/**
 * "함께 보면 좋은 기사" 카드 — 사진 위 스크림 + 팀·제목·기자.
 *
 * 홈 핫이슈 카드(HotCard)와 같은 미디어 스크림 패턴이지만, 기사 세부 하단
 * 3열 추천 행 전용이라 제목 스케일(text-body-lg)·비율(16:10)이 달라 따로 둔다.
 * 클릭하면 해당 기사 세부(`/articles/[postId]`)로 이동한다.
 *
 * BE 추천 API가 아직 없어 지금은 그리는 자리가 없지만(SuggestedArticles가 준비 중
 * 문구를 대신 그린다), 실계약 타입으로는 맞춰 뒀다(KAN-322) — 팀·기자가 없을 수
 * 있어 그 조각만 빠지고, 사진이 null이면 팀컬러 배경만 남는다.
 */
export function SuggestedArticleCard({ article }: { article: ArticleCard }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;

  return (
    <Link
      href={`/articles/${article.id}`}
      className="rounded-hero focus-visible:outline-accent group block aspect-[16/10] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <MediaThumb
        colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
        imageUrl={article.imageUrl}
        className="rounded-hero h-full"
      >
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-4 pt-12 pb-4"
          style={{
            backgroundImage:
              "linear-gradient(to top, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 0%, color-mix(in srgb, var(--plk-scrim) 50%, transparent) 55%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-1.5">
            {team && (
              <span className="text-caption text-media-on font-extrabold">
                {team.name}
              </span>
            )}
            {article.stage && (
              <span className="text-media-on-dim text-micro tracking-label font-bold">
                {STAGE_META[article.stage].label}
              </span>
            )}
          </div>
          <h3 className="text-body-lg text-media-on tracking-heading line-clamp-1 font-extrabold">
            {article.title}
          </h3>
          <p className="text-caption">
            {article.reporter && (
              <span className="text-media-on/85 font-semibold">
                {article.reporter.name}
              </span>
            )}
            <span className="text-media-on-dim" suppressHydrationWarning>
              {article.reporter ? " · " : ""}
              {formatRelativeTime(article.publishedAt)}
            </span>
          </p>
        </div>
      </MediaThumb>
    </Link>
  );
}
