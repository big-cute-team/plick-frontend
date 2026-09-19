import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { ArticleLink } from "@/_components/ArticleLink";
import { DebateLiveChip } from "@plick/ui/DebateLiveChip";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsIcon } from "@plick/ui/icons";
import type { ArticleCard, Filter } from "@plick/domain/types";
import {
  formatRelativeTime,
  isRecentlyPublished,
  teamProfilePath,
} from "@plick/domain/format";
import { NewBadge } from "@plick/ui/NewBadge";

/**
 * "지금 올라온 소식" 리스트의 한 줄. 탭하면 기사 세부 페이지로 이동한다.
 *
 * KAN-482에서 행을 세 칸으로 다시 짰다: 왼쪽 팀 로고, 가운데 제목·요약,
 * 오른쪽 시각·기자명. 그전에는 팀명·시각이 제목 위에, 기자명·좋아요·조회·댓글이
 * 제목 아래에 깔리고 로고와 썸네일이 오른쪽에 붙어 한 줄에 표식이 아홉 개였다.
 * 집계 숫자(좋아요·조회·댓글)와 썸네일, 인물 칩은 뺐다 — 리스트에서 읽을 것은
 * 제목과 요약이고 나머지는 기사 세부에 있다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓴다. 팀이 없는
 * 기사는 로고 자리를 그리지 않고 제목이 왼쪽 끝부터 찬다. 기자 이름도 원문이
 * 없으면 빠진다.
 *
 * 팀 탭을 보고 있을 때는 기사의 첫 팀 대신 그 탭의 팀을 로고로 쓴다 (KAN-368)
 * — 팀별 목록에서 다른 팀 표식이 섞여 보이는 걸 막는다. 전체 탭은 기존대로
 * 기사의 첫 팀이다.
 *
 * 토론이 진행 중인 기사(contentType=DEBATE)는 제목 앞에 번쩍이는 VS 칩(하단
 * 탭과 같은 VsIcon + "VS")을 인라인으로 단다(KAN-438, 자리는 KAN-482에서 시각
 * 옆에서 제목 앞으로). 마감 판정은 하지 않는다 — 목록 응답에 closesAt이 없고,
 * BE 열림/마감 실기준도 이 값이다.
 *
 * 발행 30분 안의 기사는 시각 옆에 NEW 태그를 단다 (KAN-481). 판정은 렌더 시각
 * 기준이라 상대 시각 글자와 같은 사정으로 서버 HTML과 클라 첫 렌더가 어긋날 수
 * 있는데, 글자는 `suppressHydrationWarning`으로 덮이지만 태그는 요소 유무라
 * 덮이지 않는다. 경계(정확히 30분)를 SSR과 하이드레이션 사이 몇 초에 넘는
 * 기사가 있어야 생기는 일이라 React가 그 트리를 클라에서 다시 그리는 걸로
 * 감수한다.
 *
 * 팀 로고는 팀 프로필로 간다 (KAN-500). 행 전체가 `<a>`였을 때는 안에 링크를
 * 둘 수 없어(중첩 앵커는 무효 HTML) 구조를 바꿨다 — 제목 링크의 `::after`를
 * 행 전체로 펼쳐 어디를 눌러도 기사로 가고, 로고만 `relative z-10`으로 그 위에
 * 올려 자기 목적지를 갖는다.
 *
 * 그 `z-10`은 행 안에서만 뜻이 있어야 해서 행에 `isolate`를 건다 (KAN-514).
 * `article`이 `relative`이긴 해도 `z-index: auto`면 쌓임 맥락이 생기지 않아,
 * 로고의 `z-10`이 페이지 레벨까지 새어 나가 같은 `z-10`인 리스트 sticky 헤더와
 * 겨뤘다. 값이 같으면 DOM 순서가 이기는데 행이 헤더보다 뒤라, 스크롤할 때
 * 팀 엠블럼이 헤더와 그 위 상단 바까지 덮고 지나갔다. `isolation: isolate`로
 * 행을 자기 맥락으로 닫으면 로고는 행 안에서만 위로 올라간다.
 *
 * 오른쪽 칸은 고정폭(`w-22`, 88px)이다. 기자 이름 길이에 따라 칸이 늘었다
 * 줄었다 하면 행마다 제목 폭이 달라져 리스트가 들쭉날쭉해진다. 88px은 실데이터에서
 * 제일 자주 나오는 긴 이름(`Fabrizio Romano` 85px, `Match of the Day` 87px)이
 * 안 잘리는 최소폭이다 — 더 넓히면 제목이 그만큼 좁아진다. BE가 기자 한글명을
 * 아직 못 채워 전부 영문명이고, `Sky Sports Premier League` 같은 매체명도 섞여
 * 온다. 이런 긴 이름은 `truncate`가 `…`으로 자른다.
 *
 * @param article - 표시할 기사 카드
 * @param filter - 지금 보고 있는 팀 탭. 팀이면 그 팀을 대표로 강제한다.
 */
export function NewsItem({
  article,
  filter = "ALL",
  rank,
}: {
  article: ArticleCard;
  filter?: Filter;
  /** 목록 안 순위(0부터). 조회 기록의 `feed_rank`가 된다 (KAN-543). 순위 없는 자리는 생략 */
  rank?: number;
}) {
  const team =
    filter !== "ALL"
      ? TEAMS[filter]
      : article.teams[0]
        ? TEAMS[article.teams[0]]
        : null;
  const debateLive = article.contentType === "DEBATE";
  const isNew = isRecentlyPublished(article.publishedAt);
  // BE 실데이터는 한 줄 요약이 전 건 채워져 있지만 계약상 null이 가능해
  // 긴 요약으로 떨어뜨린다 — 어느 쪽이든 길이는 보장이 없어 한 줄로 자른다
  const summary = (article.summaryShort ?? article.summary).trim();

  return (
    <article className="border-border gap-gap relative isolate flex items-start border-b py-3 active:opacity-70">
      {team && (
        <Link
          href={teamProfilePath(team.code)}
          aria-label={`${team.name} 프로필`}
          className="relative z-10 shrink-0 self-center"
        >
          <TeamCrest team={team} size={36} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {/* 섹션 제목("지금 올라온 소식")이 h2라 카드 제목은 h3다 — 레벨을 건너뛰면
            보조기술이 목차를 못 만든다. 크기는 클래스가 정하므로 태그와 무관하다 */}
        <h3 className="text-title text-text-strong line-clamp-2 leading-snug font-bold">
          {debateLive && (
            /* -webkit-box(line-clamp) 안에서 flex 자식은 제 줄을 차지하므로
               inline-flex 래퍼로 한 번 감싸 제목 글자와 같은 줄에 흐르게 한다 */
            <span className="mr-1 inline-flex align-middle">
              <DebateLiveChip
                variant="outline"
                icon={<VsIcon size={13} />}
                label="VS"
              />
            </span>
          )}
          {/* 행 전체를 덮는 기사 링크. h3는 positioned가 아니라 line-clamp의
              overflow가 ::after를 자르지 않는다 */}
          <ArticleLink
            articleId={article.id}
            rank={rank}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {article.title}
          </ArticleLink>
        </h3>
        {summary && (
          <p className="text-body text-text-strong mt-1 truncate">{summary}</p>
        )}
      </div>
      <div className="mt-0.5 flex w-22 shrink-0 flex-col items-end gap-1">
        {/* 시각과 NEW가 한 줄에 다 안 들어가는 폭에서는 태그가 아랫줄로 내려간다 */}
        <div className="flex w-full flex-wrap items-center justify-end gap-1">
          <span className="text-caption text-text-4" suppressHydrationWarning>
            {formatRelativeTime(article.publishedAt)}
          </span>
          {isNew && <NewBadge />}
        </div>
        {article.reporter && (
          <span className="text-caption text-text-3 max-w-full truncate font-semibold">
            {article.reporter.name}
          </span>
        )}
      </div>
    </article>
  );
}
