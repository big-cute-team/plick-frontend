import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { formatCount, teamProfilePath } from "@plick/domain/format";
import { tweetPhotoSrcSet } from "@plick/domain/tweet-photo";
import type { HotArticle } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { ArticleLink } from "@/_components/ArticleLink";

/** 170 CSS px 카드의 배율별 후보. 배율 3은 `small`(680)이 510px 필요를 채운다 */
const HERO_SRCSET = (url: string) =>
  tweetPhotoSrcSet(url, [
    ["240x240", 1],
    ["360x360", 2],
    ["small", 3],
  ]) ?? undefined;

/**
 * 핫이슈 사진 카드 (시안 KAN-567) — 6:5 사진 위 왼쪽 위 순위 배지(21px, 강조색),
 * 아래 팀(엠블럼 13 + 이름 10.5/700)과 제목 두 줄(13/700) + `[댓글]`(빨강).
 *
 * 폭은 트랙({@link HotHeroTrack}) 안쪽 폭에서 간격 하나를 뺀 절반이라 어떤 폰 폭에서도
 * 정확히 두 장이 보인다 (KAN-585). 시안의 168px 고정 폭은 폭이 넓은 기기에서 셋째
 * 카드가 걸쳐 보였다. 스냅은 홀수 번째 카드(`odd:`)에만 걸어 두 장 단위로 넘긴다.
 * 마지막 카드는 끝맞춤(`snap-end`)이다. 카드가 홀수 장이면 마지막 카드의 시작 맞춤이
 * 스크롤 한계 밖이라 크롬이 스냅 후보에서 빼 버려 마지막 카드까지 못 간다.
 *
 * 사진은 `imageUrl`을 쓰고, 홈 서버 컴포넌트가 `withTweetPhotos`로 원문 게시물의
 * 제일 큰 사진을 `small` webp로 채운다(KAN-484, KAN-624). 카드는 170 CSS px이라 배율별
 * `srcset`을 달아 배율 1은 240, 2는 360, 3은 680(`small`)짜리를 받는다. Lighthouse 기본
 * 에뮬레이션(DPR 1.75)은 360을 고른다. 그것도 못 구한 카드는 홈이 아예 빼므로
 * (KAN-569) 여기 오는 카드는 늘 사진이 있다. 원문 임베드 폴백(KAN-514)은 걷었다.
 *
 * 카드 전체가 기사 세부로 가는 링크고 팀 이름만 팀 프로필로 간다. 카드 링크는 사진을 품지
 * 않고 덮기만 해서 전역의 `a:has(img)` 드래그 금지에 안 걸리므로 `draggable={false}`로
 * 직접 끈다 (KAN-677).
 *
 * @param article - 핫이슈 기사(사진 있는 그룹)
 * @param rank - 핫이슈 안 순위(0부터). 배지에는 1부터 보여주고 조회 기록의 `feed_rank`가 된다 (KAN-543)
 * @param fetchPriority - 첫 두 장만 high (KAN-421)
 */
export function HotHeroCard({
  article,
  rank,
  fetchPriority = "auto",
}: {
  article: HotArticle;
  rank: number;
  fetchPriority?: "high" | "low" | "auto";
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;

  return (
    <div className="relative w-[calc((100%-0.625rem)/2)] shrink-0 last:snap-end odd:not-last:snap-start">
      <div className="rounded-tile bg-media relative mb-2 aspect-[6/5] overflow-hidden">
        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴과 같은 이유)
          <img
            src={article.imageUrl}
            srcSet={HERO_SRCSET(article.imageUrl)}
            alt=""
            loading="eager"
            fetchPriority={fetchPriority}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <span className="bg-accent text-on-accent rounded-badge text-caption absolute top-1.75 left-1.75 grid size-5.25 place-items-center font-black">
          {rank + 1}
        </span>
      </div>
      {team && (
        <Link
          href={teamProfilePath(team.code)}
          /* 위아래 패딩으로 터치 영역을 24px 넘게 키우고 음수 위 마진으로 자리는 그대로 둔다 (target-size, KAN-670) */
          className="relative z-10 -mt-1 flex w-fit items-center gap-1.25 py-1 active:opacity-60"
        >
          <TeamCrest team={team} size={13} decorative />
          <span className="text-micro-lg text-text-3 font-bold">
            {team.name}
          </span>
        </Link>
      )}
      <div className="flex items-start gap-1">
        <h3 className="text-body text-text-strong line-clamp-2 min-w-0 flex-1 leading-[1.38] font-bold tracking-tight">
          {article.title}
        </h3>
        {article.commentCount > 0 && (
          <span className="text-label-lg text-danger-strong shrink-0 leading-[1.38] font-bold">
            [{formatCount(article.commentCount)}]
          </span>
        )}
      </div>
      <ArticleLink
        articleId={article.id}
        rank={rank}
        entry="hot"
        aria-label={article.title}
        draggable={false}
        className="absolute inset-0"
      />
    </div>
  );
}
