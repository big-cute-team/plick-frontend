import Link from "next/link";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import { HeartMiniIcon } from "@plick/ui/icons";
import type { MyComment } from "@/_types/activity";

/**
 * 내가 쓴 댓글 한 줄 (KAN-567 시안 MY 612-629행). 왼쪽은 본문 14.5/1.6과 그 아래
 * 빨간 하트 + 수, 시각이고, 오른쪽 246px 칸은 어느 기사에 쓴 댓글인지 제목을 한 줄로
 * 말줄임해 보여준다. 기사 칸을 누르면 그 기사로 간다.
 *
 * 시안의 답글 수와 기사 엠블럼은 이 API에 없어 뺐다(응답에 답글 수도 팀도 없다).
 * 블라인드 댓글은 본문을 가리지 않고 메타 줄에 표식만 단다(BE 설계: 원문 그대로 +
 * `isBlinded`). 삭제한 댓글은 API가 아예 내려주지 않아 tombstone 분기가 없다.
 *
 * @param comment 표시할 댓글
 */
export function MyCommentRow({ comment }: { comment: MyComment }) {
  return (
    <div className="border-border-soft flex flex-col gap-3 border-b py-3.75 lg:flex-row lg:items-start lg:gap-5">
      <div className="min-w-0 flex-1">
        <p className="text-hero-sm text-text-strong leading-body pb-1.5">
          {comment.content}
        </p>
        <div className="flex items-center gap-2.5">
          <span className="text-caption-lg text-danger flex items-center gap-1 font-bold">
            <HeartMiniIcon filled />
            {formatCount(comment.likeCount)}
          </span>
          {comment.isBlinded && (
            <span className="text-micro-lg text-danger font-black">
              블라인드
            </span>
          )}
          {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게 달라진다 */}
          <span
            className="text-caption-lg text-text-4"
            suppressHydrationWarning
          >
            {formatRelativeTime(comment.createdAt)}
            {comment.isEdited && ", 수정됨"}
          </span>
        </div>
      </div>
      <Link
        href={`/articles/${comment.article.id}`}
        className="text-label-lg text-text-3 hover:text-accent focus-visible:outline-accent block min-w-0 shrink-0 truncate focus-visible:outline-2 focus-visible:outline-offset-2 lg:w-61.5"
      >
        {comment.article.title}
      </Link>
    </div>
  );
}
