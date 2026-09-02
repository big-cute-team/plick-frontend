import Link from "next/link";
import { formatCount } from "@plick/domain/format";
import { TEAMS } from "@plick/domain/constants";
import { DebateLiveChip } from "@plick/ui/DebateLiveChip";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { HeartMiniIcon } from "@plick/ui/icons";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import type { ArticleCard, Filter } from "@plick/domain/types";
import { formatRelativeTime } from "@plick/domain/format";

/**
 * "지금 올라온 소식" 리스트의 한 줄. 탭하면 기사 세부 페이지로 이동한다.
 *
 * 사진이 null이면 썸네일 자리를 아예 그리지 않고 텍스트가 전체 폭을 쓴다
 * (KAN-284).
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓰고, 없으면
 * 팀 이름 자리를 비운다. 기자 이름도 원문이 없으면 빠진다.
 *
 * 행 맨 오른쪽에는 대표 팀 로고(`TeamCrest`)를 세로 중앙으로 붙인다(KAN-338).
 * 팀이 없는 기사는 로고 자리도 그리지 않는다.
 *
 * 팀 탭을 보고 있을 때는 기사의 첫 팀 대신 그 탭의 팀을 팀 이름·로고로 쓴다
 * (KAN-368) — 팀별 목록에서 다른 팀 표식이 섞여 보이는 걸 막는다. 전체 탭은
 * 기존대로 기사의 첫 팀이다.
 *
 * 토론이 진행 중인 기사(contentType=DEBATE)는 날짜 옆에 번쩍이는
 * "투표 진행 중" 칩을 단다(KAN-438) — 리스트를 내리다 눈에 걸려 들어가 보게
 * 하는 신호다. 행 자체는 손대지 않는다: 테두리 카드로 감싸면 좌우 얼라인이
 * 이웃 행들과 어긋난다. 마감 판정은 하지 않는다 — 목록 응답에 closesAt이
 * 없고, BE 열림/마감 실기준도 이 값이다.
 *
 * @param article - 표시할 기사 카드
 * @param filter - 지금 보고 있는 팀 탭. 팀이면 그 팀을 대표로 강제한다.
 */
export function NewsItem({
  article,
  filter = "ALL",
}: {
  article: ArticleCard;
  filter?: Filter;
}) {
  const team =
    filter !== "ALL"
      ? TEAMS[filter]
      : article.teams[0]
        ? TEAMS[article.teams[0]]
        : null;
  const debateLive = article.contentType === "DEBATE";

  return (
    <Link
      href={`/articles/${article.id}`}
      className="border-border gap-gap flex items-start border-b py-3 active:opacity-70"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {/* 팀명·기자명은 제목보다 어두운 text-3로 눌러 둔다 — 굵기로만 구분해
              리스트에서 밝게 남는 글자는 기사 제목 하나가 되게 한다 */}
          {team && (
            <span className="text-body text-text-3 font-extrabold">
              {team.name}
            </span>
          )}
          <span className="text-body text-text-4" suppressHydrationWarning>
            {formatRelativeTime(article.publishedAt)}
          </span>
          {debateLive && <DebateLiveChip label="투표 진행 중" />}
        </div>
        {/* 섹션 제목("지금 올라온 소식")이 h2라 카드 제목은 h3다 — 레벨을 건너뛰면
            보조기술이 목차를 못 만든다. 크기는 클래스가 정하므로 태그와 무관하다 */}
        <h3 className="text-title text-text mt-1 line-clamp-2 leading-snug font-bold">
          {article.title}
        </h3>
        <p className="text-body text-text-3 mt-1 flex flex-wrap items-center gap-x-1.5">
          {article.reporter && (
            <>
              <span className="font-semibold">{article.reporter.name}</span>
              <span>·</span>
            </>
          )}
          {/* 목록에서는 좋아요를 보여주기만 한다 — 누르는 건 릴스와 기사 세부에서.
              이웃한 조회·댓글과 달리 글자 없이 하트로만 표시한다 (KAN-308).
              내가 눌렀는지는 칠하지 않는다 — 목록 응답은 익명으로 받아
              `liked`가 늘 false다.
              크기는 아이콘 기본값(13) 그대로 둔다. 옆 글자에 맞춰 줄이면
              선 두께가 1px 아래로 내려가(0.92px) 행마다 픽셀 격자에 다르게 걸려
              어떤 줄은 하트가 흐리거나 반 픽셀 내려앉은 것처럼 보인다 */}
          <span className="inline-flex items-center gap-0.75">
            <HeartMiniIcon />
            {formatCount(article.likeCount)}
          </span>
          <span>·</span>
          <span>조회 {formatCount(article.views)}</span>
          <span>·</span>
          <span>댓글 {article.commentCount}</span>
        </p>
      </div>
      {article.imageUrl && (
        <MediaThumb
          colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
          imageUrl={article.imageUrl}
          className="rounded-control size-18 shrink-0"
        />
      )}
      {team && (
        <TeamCrest team={team} size={36} className="shrink-0 self-center" />
      )}
    </Link>
  );
}
