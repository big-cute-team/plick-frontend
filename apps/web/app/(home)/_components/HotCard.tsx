import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime, teamProfilePath } from "@plick/domain/format";
import type { HotArticle } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { ArticleLink } from "@/_components/ArticleLink";
import { TweetEmbed } from "@/_components/TweetEmbed";

/**
 * 핫이슈 카드 (KAN-567, 시안 "핫이슈" 3열) — 위에 16:10 사진, 아래 순위 11/900 강조색
 * + 엠블럼 14 + 팀명 10.5/700, 제목 14.5/900 한 덩어리에 댓글 수 13/900 빨강, 마지막
 * 줄에 기자와 시각 11px. 사진 위 어두운 스크림에 흰 글자를 얹던 카드(KAN-338)와
 * 달리 사진과 글자가 분리된 평면 카드다. 시안이 댓글 수를 대괄호 없이 숫자만
 * 두므로 그대로 따른다.
 *
 * 사진(`imageUrl`)이 있으면 16:10 상자를 가득 덮는다. 없으면 원문 트윗 임베드로
 * 상자를 메운다 — BE가 핫이슈를 나눈 기준은 원문 X 게시물의 사진 유무
 * (`raw_articles.media_url`)이고 카드가 그리는 건 기사 대표 이미지
 * (`article_summaries.image_url`)라 서로 다른 컬럼인데, 홈 서버 컴포넌트가
 * `withTweetPhotos`로 원문 사진을 뽑아 채워 줘도 끝내 빌 수 있다(KAN-514).
 * 사진 없는 그룹(`withoutImage`)은 처음부터 임베드다. 트윗 링크가 아니거나 원문이
 * 지워졌으면 `TweetEmbed`가 안내만 세우고, 원문 링크조차 없으면 줄무늬 배경만
 * 남는다. 임베드가 상자보다 길면 `overflow-hidden`이 아래를 자른다.
 *
 * 단계 라벨(`stage`)과 조회수는 시안 규칙으로 뺐다. BE는 팀을 다중으로 주고 아예
 * 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀 자리를 비운다. 기자도 null이면
 * 시각만 남는다.
 *
 * 카드 전체가 기사 세부(`/articles/[postId]`)로 가는 링크다. 링크를 형제로 깔아
 * 카드를 덮고, 팀명만 `relative z-10`으로 그 위에 올려 팀 프로필로 간다(중첩
 * 앵커를 피하는 표 행과 같은 수). 임베드 안 링크는 전역 CSS에서 꺼져 있어
 * (globals.css) 카드 링크만 산다.
 *
 * @param article - 표시할 핫이슈 기사
 */
export function HotCard({
  article,
  rank,
  fetchPriority = "auto",
}: {
  article: HotArticle;
  /** 핫이슈 안 순위(0부터). 조회 기록의 `feed_rank`가 되고(KAN-543) 카드에 1부터 찍힌다 */
  rank: number;
  /** 첫 화면에 실제로 보이는 카드만 high, 나머지는 low로 대역폭 경합을 줄인다 (KAN-421) */
  fetchPriority?: "high" | "low" | "auto";
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;

  return (
    <article className="group relative isolate">
      <div className="bg-media relative mb-2.5 aspect-[16/10] overflow-hidden">
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴·MediaThumb과 같은 이유)
          <img
            src={article.imageUrl}
            alt=""
            loading="eager"
            fetchPriority={fetchPriority}
            className="absolute inset-0 size-full object-cover"
          />
        ) : article.sourceUrl ? (
          /* 사진을 끝내 못 구한 칸 — 원문 임베드로 메운다 */
          <div className="bg-bg absolute inset-0">
            <TweetEmbed url={article.sourceUrl} />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 pb-1.25">
        <span className="text-caption text-accent font-black">{rank + 1}</span>
        {team && (
          <>
            <TeamCrest team={team} size={14} className="shrink-0" />
            <Link
              href={teamProfilePath(team.code)}
              className="text-micro-lg text-text-3 hover:text-accent relative z-10 font-bold"
            >
              {team.name}
            </Link>
          </>
        )}
      </div>
      <div className="flex items-start gap-1.25">
        <h3 className="text-hero-sm text-text-strong tracking-heading group-hover:text-accent min-w-0 leading-[1.35] font-black">
          {article.title}
        </h3>
        {article.commentCount > 0 && (
          <span className="text-body text-danger shrink-0 font-black">
            {article.commentCount}
          </span>
        )}
      </div>
      <p className="text-caption text-text-3 mt-1.25">
        {article.reporter && <>{article.reporter.name}, </>}
        <span suppressHydrationWarning>
          {formatRelativeTime(article.publishedAt)}
        </span>
      </p>

      <ArticleLink
        articleId={article.id}
        rank={rank}
        aria-label={article.title}
        className="focus-visible:outline-accent absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
      />
    </article>
  );
}
