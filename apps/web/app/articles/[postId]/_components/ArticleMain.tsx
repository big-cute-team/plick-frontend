import { MediaThumb } from "@plick/ui/MediaThumb";
import { PostChips } from "@plick/ui/PostChips";
import { ReporterLine } from "@plick/ui/ReporterLine";
import { TagChips } from "@plick/ui/TagChips";
import {
  HeartMiniIcon,
  LinkOutIcon,
  SaveIcon,
  SendIcon,
} from "@plick/ui/icons";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentsHeader } from "@/_components/CommentsHeader";
import { CommentThread } from "@/_components/CommentThread";
import { TEAMS } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type { FeedPost } from "@plick/domain/types";

/**
 * 기사 세부 본문 컬럼 — 칩·제목·기자 라인·대표 이미지·본문 문단·태그·액션·댓글.
 *
 * 정적 렌더(서버 컴포넌트)이며, 공용 조각(PostChips·ReporterLine·TagChips·
 * CommentsHeader·CommentComposer)과 답글 토글이 있는 댓글(CommentThread)을
 * 재사용한다. 좌우 폭은 상위 그리드가 정한다.
 *
 * @param post - 표시할 기사(본문은 `body`, 없으면 `summary` 한 문단)
 */
export function ArticleMain({ post }: { post: FeedPost }) {
  const team = TEAMS[post.team];
  const paragraphs = post.body ?? [post.summary];
  const comments = post.comments ?? [];

  return (
    <article className="min-w-0">
      <PostChips teamName={team.name} stage={post.stage} tone="surface" />

      {/* 제목 */}
      <h1 className="text-read-title text-text mt-3 font-bold">{post.title}</h1>

      <ReporterLine
        reporter={post.reporter}
        meta={`· ${post.timeLabel} · 조회 ${formatCount(post.views)}`}
        className="border-border mt-4 flex-wrap gap-x-2 gap-y-1.5 border-b pb-4"
      >
        <button
          type="button"
          className="text-label text-accent focus-visible:outline-accent ml-auto flex items-center gap-1 rounded font-bold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <LinkOutIcon size={13} />
          출처 원문 보기
        </button>
      </ReporterLine>

      {/* 대표 이미지 */}
      <MediaThumb
        colorVar={team.colorVar}
        className="rounded-hero mt-5 aspect-[16/7] w-full"
      />

      {/* 본문 문단 */}
      <div className="mt-5 flex flex-col gap-3.5">
        {paragraphs.map((paragraph, i) => (
          <p
            key={i}
            className="text-read-body text-text-2 leading-body-lg tracking-snug"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {/* 해시태그 */}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <TagChips tags={post.tags} />
        </div>
      )}

      {/* 액션 */}
      <div className="border-border mt-4 flex flex-wrap items-center gap-2.5 border-b pb-4">
        <button
          type="button"
          className="bg-accent-tint border-accent-border text-accent text-body rounded-pill focus-visible:outline-accent flex h-9 items-center gap-1.5 border px-4 font-bold hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <HeartMiniIcon size={15} filled={post.liked} />
          {formatCount(post.likeCount)}
        </button>
        <button
          type="button"
          className="bg-elevate-2 border-border text-text-2 text-body rounded-pill hover:border-border-strong hover:text-text focus-visible:outline-accent flex h-9 items-center gap-1.5 border px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <SendIcon size={15} />
          공유
        </button>
        <button
          type="button"
          className="bg-elevate-2 border-border text-text-2 text-body rounded-pill hover:border-border-strong hover:text-text focus-visible:outline-accent flex h-9 items-center gap-1.5 border px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <SaveIcon size={15} filled={post.saved} />
          저장
        </button>
      </div>

      <CommentsHeader count={post.commentCount} className="mt-4" />

      <CommentComposer className="mt-3" />

      {/* 댓글 목록 */}
      <div className="mt-5 flex flex-col gap-4.5">
        {comments.map((comment) => (
          <CommentThread key={comment.id} comment={comment} />
        ))}
      </div>
    </article>
  );
}
