import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type { HotArticle } from "@plick/domain/types";
import { ArticleLink } from "@/_components/ArticleLink";
import { TweetEmbed } from "@/_components/TweetEmbed";

/**
 * 핫이슈 카드 — 미디어 위 어두운 스크림 + 흰 텍스트.
 *
 * 원래 히어로(lg)/서브(sm) 그리드용 사이즈 변형이 있었지만, 핫이슈 섹션이
 * 모바일과 같은 캐러셀로 바뀌면서(KAN-338) 단일 스타일로 접었다. 카드 비율은
 * 캐러셀 래퍼(`HotCarousel`의 `slideClassName`)가 정하고 카드는 `h-full`로
 * 채운다.
 *
 * 밀도는 모바일 히어로 카드와 같다(p-4·`text-title`). KAN-480 전에는 lg 이상에서
 * px-6·`text-hero`로 키웠는데, 데스크톱 캐러셀이 네 장을 한 줄에 깔면서 카드가
 * 1200px에서 300px 아래로 줄어 그 스케일이 카드를 넘쳤다.
 *
 * 실계약(KAN-324)으로 갈아타면서 배경이 팀 컬러 placeholder(`MediaThumb`)에서
 * 릴 공용 단색(`bg-reel-bg`)으로 바뀌었다. 모바일이 KAN-297에서 히어로 카드를
 * 그렇게 통일했고 web 릴스도 KAN-323에서 같은 색을 따랐다.
 *
 * 사진(`imageUrl`)이 있으면 카드를 가득 덮고, 없으면 통일 배경색이 그대로 남는다.
 *
 * KAN-484 전에는 사진이 없을 때 원문 트윗을 통째로 임베드했다. 그런데 임베드는
 * 프로필 사진·아이디·본문·버튼까지 다 들고 와서, 사진이 주인공이어야 할 캐러셀
 * 칸에서 정작 사진이 작게 박히는 모습이 됐다. 지금은 홈 서버 컴포넌트가
 * `withTweetPhotos`로 원문 게시물의 제일 큰 사진만 뽑아 `imageUrl`을 채워 주므로
 * 카드는 이미지 한 장만 알면 된다.
 *
 * 그래도 `imageUrl`이 빌 수 있다. BE가 핫이슈를 나눈 기준은 원문 X 게시물의
 * 사진 유무(`raw_articles.media_url`)이고 카드가 그리는 건 기사 대표
 * 이미지(`article_summaries.image_url`)라 서로 다른 컬럼인데, 원문 사진마저
 * 신디케이션에서 못 받는 경우가 있다.
 *
 * 그 빈 칸을 제목만으로 두니 사진 있는 칸들 사이에서 유독 허전해서, 방어를 한 단
 * 더 뒀다 (KAN-514). 대표 이미지 → 홈이 원문에서 뽑아 채운 사진 → **원문 트윗
 * 임베드** 순이다. 임베드가 KAN-484에서 걷어낸 방식이긴 하지만, 그때 문제는
 * 임베드가 *기본* 경로였다는 것이지 마지막 방어선으로 드물게 쓰는 건 빈 칸보다 낫다.
 *
 * 스크림은 이미지 가독성용 고정 값(테마 무관)이고 모바일 히어로와 같은 농도다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀
 * 이름 자리를 비운다. 단계·기자도 null이면 그 조각만 빠진다.
 *
 * 카드 전체가 기사 세부(`/articles/[postId]`)로 가는 링크다. 스크림이 텍스트를
 * 덮는 구조라 링크를 형제로 깔아 카드를 덮는다 — 폴백 임베드가 뜨는 칸에서도
 * 임베드 안 링크는 전역 CSS에서 꺼져 있어(globals.css) 카드 링크만 산다.
 *
 * @param article - 표시할 핫이슈 기사
 */
export function HotCard({
  article,
  rank,
  fetchPriority = "auto",
}: {
  article: HotArticle;
  /** 핫이슈 안 순위(0부터). 조회 기록의 `feed_rank`가 된다 (KAN-543) */
  rank?: number;
  /** 첫 화면에 실제로 보이는 카드만 high, 나머지는 low로 대역폭 경합을 줄인다
   *  (KAN-421). 데스크톱은 네 장이 한꺼번에 보이므로 호출부가 앞 네 장을 high로 준다 */
  fetchPriority?: "high" | "low" | "auto";
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const stage = article.stage ? STAGE_META[article.stage] : null;

  return (
    <div className="rounded-hero bg-reel-bg relative h-full overflow-hidden transition-opacity hover:opacity-90">
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

      {/* pt가 스크림 윗선 — 팀·단계 줄보다 조금 위까지만 어둡다 (KAN-300) */}
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
            {/* 퍼블리싱 시안(피그마 W1)은 RUMOUR일 때만 단계를 노출했지만, 실계약에선
                단계가 있으면 다 보여준다 — 모바일 히어로 카드와 같게 맞춘 것이다 */}
            {stage && (
              <span className="text-media-on-dim text-micro tracking-label font-bold">
                {stage.label}
              </span>
            )}
          </div>
        )}
        <h3 className="text-media-on tracking-heading text-title line-clamp-2 font-extrabold">
          {article.title}
        </h3>
        <p className="text-caption">
          {article.reporter && (
            <span className="text-media-on/85 font-semibold">
              {article.reporter.name}
            </span>
          )}
          <span className="text-media-on-dim">
            {article.reporter && " · "}
            <span suppressHydrationWarning>
              {formatRelativeTime(article.publishedAt)}
            </span>
            {" · 조회 "}
            {formatCount(article.views)}
          </span>
        </p>
      </div>

      <ArticleLink
        articleId={article.id}
        rank={rank}
        aria-label={article.title}
        className="focus-visible:outline-accent rounded-hero absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
      />
    </div>
  );
}
