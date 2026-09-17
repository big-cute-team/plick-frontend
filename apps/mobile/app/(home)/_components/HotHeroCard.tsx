import Link from "next/link";
import type { HotArticle } from "@plick/domain/types";
import { TweetEmbed } from "@/_components/TweetEmbed";

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
 * 신디케이션에서 못 받는 경우가 있다. 사진이 아예 없는 기사는 캐러셀에 오지
 * 않고 아래 {@link HotTextCard}가 받는다.
 *
 * 그 빈 칸을 배경색 위 제목만으로 두니 사진 있는 칸들 사이에서 유독 허전했다.
 * 그래서 방어를 한 단 더 둔다 (KAN-514): 대표 이미지가 있으면 그걸 쓰고, 없으면
 * 홈이 원문에서 뽑아 채운 사진을 쓰고, 그것도 못 구했으면 **원문 트윗을 통째로
 * 임베드해** 칸을 메운다. 임베드는 KAN-484에서 걷어냈던 방식인데, 그때 문제는
 * 임베드가 *기본* 경로여서 사진이 주인공이어야 할 칸에 프로필·아이디·버튼이
 * 같이 들어온 것이었다. 마지막 방어선으로 드물게만 쓰면 빈 칸보다 낫다.
 *
 * 사진 위에는 어두운 스크림(가독성용 고정 값, 테마 무관) + 흰 텍스트를 얹는다.
 *
 * KAN-515부터 한 화면에 두 장이 나란히 서면서 칸 폭이 절반으로 줄었다. 팀·단계·
 * 기자·시각·조회 줄까지 다 얹으면 사진이 글자에 묻혀 제목과 요약만 남겼다.
 * 제목은 두 줄, 요약은 한 줄을 넘으면 말줄임한다. 요약은 BE가 못 만든 기사도
 * 있어(null) 있을 때만 깐다.
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
      ) : article.sourceUrl ? (
        /* 사진을 끝내 못 구한 칸 — 원문 임베드로 메운다. 트윗 링크가 아니거나
           원문이 지워졌으면 `TweetEmbed`가 아무것도 그리지 않아 배경색만 남는다 */
        <TweetEmbed url={article.sourceUrl} />
      ) : null}
      {/* 두 장이 나란히 서는 좁은 칸이라 제목·요약만 싣는다 (KAN-515) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3 pt-6"
        style={{
          backgroundImage:
            "linear-gradient(to top, var(--plk-scrim) 0%, color-mix(in srgb, var(--plk-scrim) 97%, transparent) 60%, color-mix(in srgb, var(--plk-scrim) 78%, transparent) 85%, transparent 100%)",
        }}
      >
        <h3 className="text-body-lg text-media-on tracking-heading line-clamp-2 leading-snug font-extrabold">
          {article.title}
        </h3>
        {article.summaryShort && (
          <p className="text-caption text-media-on/75 line-clamp-1">
            {article.summaryShort}
          </p>
        )}
      </div>
      <Link
        href={`/articles/${article.id}`}
        aria-label={article.title}
        className="absolute inset-0"
      />
    </div>
  );
}
