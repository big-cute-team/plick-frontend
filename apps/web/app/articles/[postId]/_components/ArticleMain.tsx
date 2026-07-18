import { MediaThumb } from "@plick/ui/MediaThumb";
import { ReporterTierBadge } from "@plick/ui/ReporterTierBadge";
import {
  HeartMiniIcon,
  LinkOutIcon,
  SaveIcon,
  SendIcon,
  SendMiniIcon,
} from "@plick/ui/icons";
import { CommentThread } from "@/_components/CommentThread";
import { TEAMS } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type { FeedPost } from "@plick/domain/types";

/**
 * 기사 세부 본문 컬럼 — 칩·제목·기자 라인·대표 이미지·본문 문단·태그·액션·댓글.
 *
 * 정적 렌더(서버 컴포넌트)이며, 답글 토글이 있는 댓글만 클라이언트
 * 컴포넌트(CommentThread)를 재사용한다. 좌우 폭은 상위 그리드가 정한다.
 *
 * @param post - 표시할 기사(본문은 `body`, 없으면 `summary` 한 문단)
 */
export function ArticleMain({ post }: { post: FeedPost }) {
  const team = TEAMS[post.team];
  const paragraphs = post.body ?? [post.summary];
  const comments = post.comments ?? [];

  return (
    <article className="min-w-0">
      {/* 팀·루머 칩 */}
      <div className="flex items-center gap-2">
        <span className="bg-elevate border-border text-text text-caption rounded-pill tracking-label border px-3 py-1 font-extrabold">
          {team.name}
        </span>
        {post.stage === "RUMOUR" && (
          <span className="bg-accent-tint border-accent-border text-accent text-caption rounded-pill tracking-label border px-3 py-1 font-extrabold">
            RUMOUR
          </span>
        )}
      </div>

      {/* 제목 */}
      <h1 className="text-read-title text-text mt-3 font-bold">{post.title}</h1>

      {/* 기자 라인 */}
      <div className="border-border mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b pb-4">
        <ReporterTierBadge reporter={post.reporter} />
        <span className="text-body text-text font-semibold">
          {post.reporter.name}
        </span>
        <span className="text-label text-text-3">
          · {post.timeLabel} · 조회 {formatCount(post.views)}
        </span>
        <button
          type="button"
          className="text-label text-accent focus-visible:outline-accent ml-auto flex items-center gap-1 rounded font-bold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <LinkOutIcon size={13} />
          출처 원문 보기
        </button>
      </div>

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
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="bg-elevate text-text-3 text-label rounded-pill px-3 py-1"
            >
              #{tag}
            </span>
          ))}
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

      {/* 댓글 헤더 */}
      <div className="mt-4 flex items-baseline gap-2">
        <h2 className="text-body-lg text-text font-extrabold">댓글</h2>
        <span className="text-label text-text-3 font-semibold">
          {post.commentCount}
        </span>
      </div>

      {/* 댓글 입력 */}
      <form className="mt-3 flex items-center gap-2.5">
        <input
          type="text"
          placeholder="팬 반응 남기기…"
          className="bg-elevate-2 border-border text-body text-text placeholder:text-text-4 rounded-pill focus-visible:border-border-strong h-11 min-w-0 flex-1 border px-4 focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="댓글 등록"
          className="bg-accent text-on-accent focus-visible:outline-accent grid size-11 shrink-0 place-items-center rounded-full hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <SendMiniIcon size={17} />
        </button>
      </form>

      {/* 댓글 목록 */}
      <div className="mt-5 flex flex-col gap-4.5">
        {comments.map((comment) => (
          <CommentThread key={comment.id} comment={comment} />
        ))}
      </div>
    </article>
  );
}
