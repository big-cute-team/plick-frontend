import Link from "next/link";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import { HeartMiniIcon } from "@plick/ui/icons";
import type { MyComment } from "@/_types/activity";

/**
 * 내가 쓴 댓글 한 줄 (KAN-495, KAN-567 리디자인, 시안 MY 내 댓글 탭). 탭하면
 * 그 댓글이 달린 기사로 이동한다.
 *
 * 위는 본문 14.5/1.6, 가운데는 빨간 하트와 좋아요 수, 시각, 아래는 어느 기사에
 * 쓴 댓글인지 알려주는 기사 제목 한 줄이다. 시안의 "답글 N"과 팀 엠블럼은 내
 * 댓글 응답에 답글 수·팀이 없어 뺐다(API 공백). 옛 썸네일 카드도 걷어냈다.
 *
 * 블라인드 댓글은 본문을 가리지 않는다. 내가 쓴 글이라 무엇이 가려졌는지 본인은
 * 봐야 하고, 대신 메타 줄에 블라인드 표식을 단다(BE 설계 결정: 원문 그대로 +
 * `isBlinded`). 삭제한 댓글은 API가 아예 내려주지 않아 tombstone 분기가 없다.
 *
 * @param comment 표시할 댓글
 */
export function MyCommentItem({ comment }: { comment: MyComment }) {
  return (
    <Link
      href={`/articles/${comment.article.id}`}
      className="border-border-soft block border-b py-3.5 active:opacity-70"
    >
      <p className="text-hero-sm text-text-strong leading-body">
        {comment.content}
      </p>

      <div className="flex items-center gap-2.5 pt-1.75 pb-2">
        <span className="text-danger flex items-center gap-1">
          <HeartMiniIcon filled size={13} />
          <span className="text-caption-lg font-bold">
            {formatCount(comment.likeCount)}
          </span>
        </span>
        {comment.isBlinded && (
          <span className="text-micro text-danger tracking-label font-black">
            블라인드
          </span>
        )}
        {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게 달라진다 */}
        <span className="text-caption-lg text-text-4" suppressHydrationWarning>
          {formatRelativeTime(comment.createdAt)}
          {comment.isEdited && ", 수정됨"}
        </span>
      </div>

      <p className="text-label-lg text-text-3 truncate">
        {comment.article.title}
      </p>
    </Link>
  );
}
