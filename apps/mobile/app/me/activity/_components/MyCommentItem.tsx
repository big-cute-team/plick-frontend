import Link from "next/link";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { ChevronMiniIcon, HeartMiniIcon } from "@plick/ui/icons";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import type { MyComment } from "@/_types/activity";

/**
 * 내가 쓴 댓글 한 줄 (KAN-495). 탭하면 그 댓글이 달린 기사로 이동한다.
 *
 * 위는 댓글 본문(시각·수정됨·좋아요 수 메타 + 본문 3줄), 아래는 어느 기사에 쓴
 * 댓글인지 알려주는 기사 조각(썸네일 + 제목)이다. 기사 조각을 본문 밑에 작은
 * 카드로 두는 이유는 이 화면의 주인공이 댓글이라서다. 기사가 먼저 오면 홈
 * 리스트와 구분이 안 된다.
 *
 * 블라인드 댓글은 본문을 가리지 않는다. 내가 쓴 글이라 무엇이 가려졌는지 본인은
 * 봐야 하고, 대신 메타 줄에 블라인드 표식을 단다(BE 설계 결정: 원문 그대로 +
 * `isBlinded`). 삭제한 댓글은 API가 아예 내려주지 않아 tombstone 분기가 없다.
 *
 * 썸네일은 홈 리스트처럼 이미지가 없으면 자리를 그리지 않는다. 기사 조각에는
 * 팀 정보가 없어 그라데이션 색은 팀 없는 기사의 폴백(`NO_TEAM_COLOR_VAR`)이다.
 *
 * @param comment 표시할 댓글
 */
export function MyCommentItem({ comment }: { comment: MyComment }) {
  return (
    <Link
      href={`/articles/${comment.article.id}`}
      className="border-border flex flex-col gap-2.5 border-b py-3.5 active:opacity-70"
    >
      <div className="flex items-center gap-2">
        {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게 달라진다 */}
        <span className="text-caption text-text-4" suppressHydrationWarning>
          {formatRelativeTime(comment.createdAt)}
          {comment.isEdited && " · 수정됨"}
        </span>
        {comment.isBlinded && (
          <span className="text-micro text-danger border-border rounded-badge border px-1.5 py-0.5 font-bold">
            블라인드
          </span>
        )}
        <span className="text-caption text-text-4 ml-auto inline-flex items-center gap-1 font-semibold">
          <HeartMiniIcon />
          {formatCount(comment.likeCount)}
        </span>
      </div>

      <p className="text-body text-text leading-body line-clamp-3">
        {comment.content}
      </p>

      <div className="bg-elevate rounded-control flex items-center gap-2.5 p-2.5">
        {comment.article.imageUrl && (
          <MediaThumb
            colorVar={NO_TEAM_COLOR_VAR}
            imageUrl={comment.article.imageUrl}
            className="rounded-tile size-10 shrink-0"
          />
        )}
        <span className="text-label text-text-3 line-clamp-2 min-w-0 flex-1 font-semibold">
          {comment.article.title}
        </span>
        <ChevronMiniIcon className="text-text-4 shrink-0" />
      </div>
    </Link>
  );
}
