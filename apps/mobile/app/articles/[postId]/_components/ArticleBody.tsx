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
 * 기사 세부 본문 — 칩·제목·기자 라인·대표 이미지·문단·태그·액션·댓글.
 *
 * 데스크톱 `ArticleMain`(KAN-233)과 같은 구성을 모바일 스케일로 옮긴 것으로,
 * 공용 조각(MediaThumb·ReporterTierBadge·아이콘·CommentThread)을 그대로 재사용한다.
 * 피그마 S1(301:4)의 균일 14px 세로 흐름을 `gap-3.5` 컬럼으로 재현한다.
 * 정적 렌더(서버 컴포넌트) — 액션·입력은 BE 연동 시 핸들러를 붙인다.
 *
 * @param post - 표시할 기사(본문은 `body`, 없으면 `summary` 한 문단)
 */
export function ArticleBody({ post }: { post: FeedPost }) {
  const team = TEAMS[post.team];
  const paragraphs = post.body ?? [post.summary];
  const comments = post.comments ?? [];

  return (
    <article className="px-edge flex flex-col gap-3.5 pt-1">
      {/* 팀·루머 칩 */}
      <div className="flex items-center gap-1.5">
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
      <h1 className="text-headline text-text font-extrabold">{post.title}</h1>

      {/* 기자 라인 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <ReporterTierBadge reporter={post.reporter} />
        <span className="text-body text-text font-semibold">
          {post.reporter.name}
        </span>
        <span className="text-label text-text-3 font-semibold">
          · {post.timeLabel} · 조회 {formatCount(post.views)}
        </span>
        <button
          type="button"
          className="text-label text-accent ml-auto flex items-center gap-1 font-bold active:opacity-60"
        >
          <LinkOutIcon size={13} />
          원문
        </button>
      </div>

      {/* 대표 이미지 */}
      <MediaThumb
        colorVar={team.colorVar}
        className="rounded-card aspect-[16/10] w-full"
      />

      {/* 본문 문단 */}
      {paragraphs.map((paragraph, i) => (
        <p
          key={i}
          className="text-body-lg text-text-2 leading-body-lg tracking-snug"
        >
          {paragraph}
        </p>
      ))}

      {/* 해시태그 */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
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
      <div className="border-border flex flex-wrap items-center gap-1.5 border-b pb-4">
        <button
          type="button"
          className="bg-accent-tint border-accent-border text-accent text-body rounded-pill flex h-9 items-center gap-1.5 border px-4 font-bold active:opacity-70"
        >
          <HeartMiniIcon size={15} filled={post.liked} />
          {formatCount(post.likeCount)}
        </button>
        <button
          type="button"
          className="bg-elevate-2 border-border text-text-2 text-body rounded-pill flex h-9 items-center gap-1.5 border px-4 font-bold active:opacity-70"
        >
          <SendIcon size={15} />
          공유
        </button>
        <button
          type="button"
          className="bg-elevate-2 border-border text-text-2 text-body rounded-pill flex h-9 items-center gap-1.5 border px-4 font-bold active:opacity-70"
        >
          <SaveIcon size={15} filled={post.saved} />
          저장
        </button>
      </div>

      {/* 댓글 헤더 */}
      <div className="flex items-baseline gap-2">
        <h2 className="text-body-lg text-text font-extrabold">댓글</h2>
        <span className="text-label text-text-3 font-semibold">
          {post.commentCount}
        </span>
      </div>

      {/* 댓글 입력 */}
      <form className="flex items-center gap-2.5">
        <input
          type="text"
          placeholder="팬 반응 남기기…"
          className="bg-elevate-2 border-border text-body text-text placeholder:text-text-4 rounded-pill h-11 min-w-0 flex-1 border px-4 focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="댓글 등록"
          className="bg-accent text-on-accent grid size-11 shrink-0 place-items-center rounded-full active:opacity-80"
        >
          <SendMiniIcon size={17} />
        </button>
      </form>

      {/* 댓글 목록 */}
      {comments.map((comment) => (
        <CommentThread key={comment.id} comment={comment} />
      ))}
    </article>
  );
}
