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
 * 위에 얹어 중첩 앵커를 피한다. 임베드의 링크·액션은 X Display Requirements상
 * 막을 수 없어서, 임베드가 보일 때는 Link를 하단 텍스트 구간으로 좁혀 위쪽
 * 탭은 임베드가, 제목 쪽 탭은 기사 세부 이동이 받는다.
 *
 * 스크림은 이미지 가독성용 고정 값(테마 무관)이고, 팀·강조색은 토큰을 쓴다.
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓰고, 없으면
 * 팀 이름 자리를 비운다. 단계·기자도 null이면 그 조각만 빠진다 (KAN-282).
 * 탭하면 기사 세부 페이지로 이동한다(KAN-283) — 상세 API가 없던 동안 릴스로
 * 보내던 임시 목적지를 걷어냈다.
 */
export function HotHeroCard({ article }: { article: HotArticle }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const stage = article.stage ? STAGE_META[article.stage] : null;
  const embedUrl =
    !article.imageUrl && article.sourceUrl ? article.sourceUrl : null;

  return (
    <div className="relative h-full">
      <MediaThumb
        colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
        imageUrl={article.imageUrl}
        className="rounded-hero h-full"
      >
        {embedUrl && <TweetEmbed url={embedUrl} />}
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
        href={`/articles/${article.id}`}
        aria-label={article.title}
        className={
          embedUrl ? "absolute inset-x-0 bottom-0 h-2/5" : "absolute inset-0"
        }
      />
    </div>
  );
}
