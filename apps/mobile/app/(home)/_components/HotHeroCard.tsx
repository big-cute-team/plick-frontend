import Link from "next/link";
import { formatCount } from "@plick/domain/format";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { TweetEmbed } from "@/_components/TweetEmbed";
import type { HotArticle } from "@/_types/articles";
import { formatRelativeTime } from "@/_utils/time";

/**
 * 핫이슈 히어로 카드 — 릴스와 같은 임베딩 전략으로 통일했다 (KAN-297).
 *
 * 배경은 팀별 그라데이션을 걷어내고 릴 배경과 같은 단색(bg-reel-bg)으로 고정한다.
 * 사진(imageUrl)이 있으면 카드를 가득 덮고, 없으면 원문 트윗을 사진째 임베드한다
 * (layout="reel", 사진 포함 전체 게시물). 임베드는 카드 가로를 꽉 채우고, 카드보다
 * 작으면 세로 가운데에 서고 크면 카드 밖으로 나간 만큼 그대로 잘린다
 * (overflow-hidden). 임베드도 사진도 없으면 통일 배경색이 그대로 남는다.
 *
 * 사진 위에는 어두운 스크림(가독성용 고정 값, 테마 무관) + 흰 텍스트를 얹는다.
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀 이름
 * 자리를 비운다. 단계·기자도 null이면 그 조각만 빠진다 (KAN-282).
 *
 * 카드 전체가 기사 세부로 가는 링크다 (KAN-283). 임베드 내부 상호작용은 전역에서
 * 꺼뒀으므로(KAN-297) 어디를 눌러도 세부 이동이 받는다.
 */
export function HotHeroCard({ article }: { article: HotArticle }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const stage = article.stage ? STAGE_META[article.stage] : null;

  return (
    <div className="rounded-hero bg-reel-bg relative h-full overflow-hidden">
      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴·MediaThumb과 같은 이유)
        <img
          src={article.imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        article.sourceUrl && (
          <div className="reel-embed absolute inset-0 flex flex-col [justify-content:safe_center]">
            <TweetEmbed url={article.sourceUrl} layout="reel" />
          </div>
        )
      )}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4"
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
      <Link
        href={`/articles/${article.id}`}
        aria-label={article.title}
        className="absolute inset-0"
      />
    </div>
  );
}
