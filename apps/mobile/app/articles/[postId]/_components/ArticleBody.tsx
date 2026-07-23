import { MediaThumb } from "@plick/ui/MediaThumb";
import { PostChips } from "@plick/ui/PostChips";
import { ReporterLine } from "@plick/ui/ReporterLine";
import { TagChips } from "@plick/ui/TagChips";
import { HeartMiniIcon, LinkOutIcon, SendIcon } from "@plick/ui/icons";
import { CommentComposer } from "@/_components/CommentComposer";
import { CommentsHeader } from "@/_components/CommentsHeader";
import { TweetEmbed } from "@/_components/TweetEmbed";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import { TEAMS } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type { ArticleDetail } from "@/_types/articles";
import { formatRelativeTime } from "@/_utils/time";

/**
 * 기사 세부 본문 — 칩·제목·기자 라인·대표 이미지·문단·태그·액션·댓글.
 *
 * 데스크톱 `ArticleMain`(KAN-233)과 같은 구성을 모바일 스케일로 옮긴 것으로,
 * 공용 조각(MediaThumb·PostChips·ReporterLine·TagChips·CommentsHeader·
 * CommentComposer)을 그대로 재사용한다.
 * 피그마 S1(301:4)의 균일 14px 세로 흐름을 `gap-3.5` 컬럼으로 재현한다.
 *
 * 사진이 null이면(현재 발행 기사의 기본 상태) 고정 프레임 없이 원문 트윗
 * 임베드가 문서 흐름에 자연 높이로 서고, 원문마저 없으면 미디어 없이 텍스트만
 * 흐른다(KAN-284 폴백의 상세판 — 프레임·음영 없이 임베드만).
 * 팀·단계·기자는 null이면 그 조각만 빠진다. 좋아요·댓글·조회는 BE가 아직
 * 자리 구현이라 전부 0으로 온다 — 값은 그대로 그린다.
 * 정적 렌더(서버 컴포넌트) — 액션·입력은 커뮤니티 API 연동 시 핸들러를 붙인다.
 *
 * @param article - 표시할 기사(본문은 `summary` — 상세 계약에 문단 필드가 없다)
 */
export function ArticleBody({ article }: { article: ArticleDetail }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  // 긴 요약 하나가 본문의 전부다. 줄바꿈이 섞여 오면 문단으로 가른다
  const paragraphs = article.summary.split("\n").filter(Boolean);
  const meta = `${formatRelativeTime(article.publishedAt)} · 조회 ${formatCount(article.views)}`;

  const sourceLink = article.sourceUrl && (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-label text-accent ml-auto flex items-center gap-1 font-bold active:opacity-60"
    >
      <LinkOutIcon size={13} />
      원문
    </a>
  );

  return (
    <article className="px-edge flex flex-col gap-3.5 pt-1">
      {/* 팀 칩은 BE 태그 원문 그대로 보여준다 — 레지스트리 표기로 옮기지 않는다 */}
      <PostChips
        teamName={article.hashtags[0]}
        stage={article.stage}
        tone="surface"
      />

      {/* 제목 */}
      <h1 className="text-headline text-text font-extrabold">
        {article.title}
      </h1>

      {article.reporter ? (
        <ReporterLine
          reporter={article.reporter}
          meta={`· ${meta}`}
          className="flex-wrap gap-x-2 gap-y-1.5"
        >
          {sourceLink}
        </ReporterLine>
      ) : (
        <div className="flex items-center">
          <span className="text-label text-text-3">{meta}</span>
          {sourceLink}
        </div>
      )}

      {/* 대표 이미지 — 사진 null이면 프레임 없이 원문 트윗 임베드만 그린다 */}
      {article.imageUrl ? (
        <MediaThumb
          colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
          imageUrl={article.imageUrl}
          className="rounded-card aspect-[16/10] w-full"
        />
      ) : (
        article.sourceUrl && (
          <TweetEmbed url={article.sourceUrl} layout="flow" />
        )
      )}

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
      {article.hashtags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <TagChips tags={article.hashtags} />
        </div>
      )}

      {/* 액션 */}
      <div className="border-border flex flex-wrap items-center gap-1.5 border-b pb-4">
        {/* 눌렀을 때만 강조색 — 기본은 이웃 버튼과 같은 중립 톤 */}
        <button
          type="button"
          className={`${
            article.liked
              ? "bg-accent-tint border-accent-border text-accent"
              : "bg-elevate-2 border-border text-text-2"
          } text-body rounded-pill flex h-9 items-center gap-1.5 border px-4 font-bold active:opacity-70`}
        >
          <HeartMiniIcon size={15} filled={article.liked} />
          {formatCount(article.likeCount)}
        </button>
        <button
          type="button"
          className="bg-elevate-2 border-border text-text-2 text-body rounded-pill flex h-9 items-center gap-1.5 border px-4 font-bold active:opacity-70"
        >
          <SendIcon size={15} />
          공유
        </button>
      </div>

      <CommentsHeader count={article.commentCount} />

      <CommentComposer />

      {/* 댓글 목록은 아직 계약에 없다(BE 커뮤니티 미구현) — 빈 상태만 둔다 */}
      <p className="text-body text-text-4 py-4 text-center">
        아직 댓글이 없어요
      </p>
    </article>
  );
}
