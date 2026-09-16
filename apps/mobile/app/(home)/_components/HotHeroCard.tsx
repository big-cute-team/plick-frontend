import Link from "next/link";
import { formatCount } from "@plick/domain/format";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import type { HotArticle } from "@plick/domain/types";
import { formatRelativeTime } from "@plick/domain/format";

/**
 * 핫이슈 히어로 카드 — 릴스와 같은 임베딩 전략으로 통일했다 (KAN-297).
 *
 * 배경은 팀별 그라데이션을 걷어내고 릴 배경과 같은 단색(bg-reel-bg)으로 고정한다.
 * 사진(imageUrl)이 있으면 카드를 가득 덮고, 없으면 통일 배경색이 그대로 남는다.
 *
 * KAN-484 전에는 사진이 없을 때 원문 트윗을 통째로 임베드했다. 임베드는 프로필
 * 사진·아이디·본문·버튼까지 다 들고 와서, 사진이 주인공이어야 할 캐러셀 칸에서
 * 정작 사진이 작게 박혔다. 지금은 홈 서버 컴포넌트가 `withTweetPhotos`로 원문
 * 게시물의 제일 큰 사진만 뽑아 `imageUrl`을 채우므로 카드는 이미지 한 장만 알면
 * 된다.
 *
 * 그래도 `imageUrl`이 빌 수 있다. BE가 핫이슈를 나눈 기준은 원문 X 게시물의 사진
 * 유무(`raw_articles.media_url`)이고 카드가 그리는 건 기사 대표
 * 이미지(`article_summaries.image_url`)라 서로 다른 컬럼인데, 원문 사진마저
 * 신디케이션에서 못 받는 경우가 있다. 그때는 배경색 위에 제목만 선다. 사진이
 * 아예 없는 기사는 캐러셀에 오지 않고 아래 세 칸의 {@link HotTextCard}가 받는다.
 *
 * 사진 위에는 어두운 스크림(가독성용 고정 값, 테마 무관) + 흰 텍스트를 얹는다.
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀 이름
 * 자리를 비운다. 단계·기자도 null이면 그 조각만 빠진다 (KAN-282).
 *
 * 카드 전체가 기사 세부로 가는 링크다 (KAN-283).
 */
export function HotHeroCard({
  article,
  fetchPriority = "auto",
}: {
  article: HotArticle;
  /** 첫 카드(첫 화면에 실제로 보이는 1장)만 high, 나머지는 low로 대역폭 경합을 줄인다 (KAN-421) */
  fetchPriority?: "high" | "low" | "auto";
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const stage = article.stage ? STAGE_META[article.stage] : null;

  return (
    <div className="rounded-hero bg-reel-bg relative h-full overflow-hidden">
      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴·MediaThumb과 같은 이유)
        <img
          src={article.imageUrl}
          alt=""
          /* 캐러셀이 무한 루프용으로 카드를 복제해 두는데, lazy면 옆 칸 복제본이
             화면에 들어오는 순간에야 받기 시작해 빈 카드가 잠깐 스친다.
             홈 최상단이라 어차피 첫 화면 이미지다 (KAN-382) */
          loading="eager"
          fetchPriority={fetchPriority}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      {/* pt가 스크림 윗선 — 팀·루머 단계 줄보다 조금 위까지만 어둡다 (KAN-300) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 pt-6"
        style={{
          backgroundImage:
            "linear-gradient(to top, var(--plk-scrim) 0%, color-mix(in srgb, var(--plk-scrim) 97%, transparent) 60%, color-mix(in srgb, var(--plk-scrim) 78%, transparent) 85%, transparent 100%)",
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
