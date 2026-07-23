import Link from "next/link";
import { formatCount } from "@plick/domain/format";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TweetEmbed } from "@/_components/TweetEmbed";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import type { HotArticle } from "@/_types/articles";
import { formatRelativeTime } from "@/_utils/time";

/**
 * 핫이슈 히어로 카드 — 사진 위에 어두운 스크림 + 흰 텍스트.
 *
 * 사진이 null이면 원문 트윗 임베드로 사진 자리를 대체하고, 원문 링크마저 없으면
 * MediaThumb 그라데이션 placeholder로 폴백한다 (KAN-284). 임베드가 내부에 링크를
 * 그리므로 카드 전체를 Link로 감싸는 대신, 미디어를 아래 층에 두고 투명 Link를
 * 맨 위에 얹어 중첩 앵커를 피한다. 임베드 자체는 눌리지 않는다(TweetEmbed).
 *
 * 스크림은 이미지 가독성용 고정 값(테마 무관)이고, 팀·강조색은 토큰을 쓴다.
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓰고, 없으면
 * 팀 이름 자리를 비운다. 단계·기자도 null이면 그 조각만 빠진다 (KAN-282).
 * 탭하면 릴스 화면으로 이동한다 — 게시물을 지정하는 딥링크였지만 BE에 릴 단건
 * 조회 API가 없어 라우트를 걷어냈다(KAN-276).
 */
export function HotHeroCard({ article }: { article: HotArticle }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const stage = article.stage ? STAGE_META[article.stage] : null;

  return (
    <div className="relative h-full">
      <MediaThumb
        colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
        imageUrl={article.imageUrl}
        className="rounded-hero h-full"
      >
        {!article.imageUrl && article.sourceUrl && (
          <TweetEmbed url={article.sourceUrl} />
        )}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4"
          style={{
            backgroundImage:
              "linear-gradient(to top, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 0%, color-mix(in srgb, var(--plk-scrim) 55%, transparent) 55%, transparent 100%)",
          }}
        >
          {(team || stage) && (
            <div className="flex items-center gap-2">
              {team && (
                <span className="text-caption text-media-on font-extrabold">
                  {team.name}
                </span>
              )}
              {stage && (
                <span className="text-media-on/50 text-micro tracking-label font-bold">
                  {stage.label}
                </span>
              )}
            </div>
          )}
          <h3 className="text-title text-media-on line-clamp-2 leading-tight font-extrabold">
            {article.title}
          </h3>
          <p className="text-caption text-media-on/75">
            {article.reporter && (
              <span className="font-semibold">{article.reporter.name}</span>
            )}
            <span className="text-media-on/50">
              {article.reporter && " · "}
              <span suppressHydrationWarning>
                {formatRelativeTime(article.publishedAt)}
              </span>
              {" · 조회 "}
              {formatCount(article.views)}
            </span>
          </p>
        </div>
      </MediaThumb>
      <Link
        href="/reels"
        aria-label={article.title}
        className="absolute inset-0"
      />
    </div>
  );
}
