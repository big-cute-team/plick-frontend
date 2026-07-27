import { MediaThumb } from "@plick/ui/MediaThumb";
import { ReporterLine } from "@plick/ui/ReporterLine";
import { TagChips } from "@plick/ui/TagChips";
import { LinkOutIcon } from "@plick/ui/icons";
import { PostBadges } from "@/_components/PostBadges";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import { TEAMS } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type { ArticleCard, ArticleDetail } from "@/_types/articles";
import type { InitialCommentPage } from "@/_types/comments";
import { formatRelativeTime } from "@/_utils/time";
import { ArticleComments } from "./ArticleComments";
import { ArticleLikeButton } from "./ArticleLikeButton";
import { ArticleShareButton } from "./ArticleShareButton";
import { SuggestedArticles } from "./SuggestedArticles";

/**
 * 기사 세부 본문 — 칩·제목·기자 라인·대표 이미지·문단·태그·액션·댓글.
 *
 * 데스크톱 `ArticleMain`(KAN-233)과 같은 구성을 모바일 스케일로 옮긴 것으로,
 * 공용 조각(MediaThumb·PostBadges·ReporterLine·TagChips·CommentsHeader·
 * CommentComposer)을 그대로 재사용한다. 배지 줄은 릴과 같은 표시다(KAN-301).
 * 피그마 S1(301:4)의 균일 14px 세로 흐름을 `gap-3.5` 컬럼으로 재현한다.
 *
 * 사진이 null이면(현재 발행 기사의 기본 상태) 미디어 없이 텍스트만 흐른다.
 * 트윗 임베드 폴백은 KAN-301에서 뺐다 — 본문과 임베드 내용이 겹치고 로딩이
 * 무거워서다. 원문은 기자 라인의 원문 링크로만 연결한다.
 * 팀·단계·기자는 null이면 그 조각만 빠진다.
 * 서버 컴포넌트 — 댓글 섹션(`ArticleComments`)만 클라 경계로 내려간다(KAN-303).
 * 좋아요는 KAN-308, 공유는 KAN-312에서 각각 클라 경계 버튼으로 연결했다.
 *
 * @param article - 표시할 기사(본문은 `summary` — 상세 계약에 문단 필드가 없다)
 * @param suggested - 본문 밑 "함께 보면 좋은 기사" 목록(KAN-301). BE 추천 API가
 *   아직 없어 기본은 빈 배열이고, 비어 있으면 카드 대신 준비 중 문구가 나온다.
 * @param initialComments - 서버가 미리 받아 둔 댓글 첫 페이지(KAN-303).
 *   실패했으면 undefined — 목록이 클라에서 직접 받는다.
 */
export function ArticleBody({
  article,
  suggested = [],
  initialComments,
}: {
  article: ArticleDetail;
  suggested?: ArticleCard[];
  initialComments?: InitialCommentPage;
}) {
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
      {/* 릴과 같은 배지 줄 — 구단 로고 + 알약 없는 단계 글자 (KAN-301) */}
      <PostBadges team={team} stage={article.stage} />

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

      {/* 대표 이미지 — 사진 null이면 미디어 없이 텍스트만 흐른다 (KAN-301) */}
      {article.imageUrl && (
        <MediaThumb
          colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
          imageUrl={article.imageUrl}
          className="rounded-card aspect-[16/10] w-full"
        />
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

      {/* 함께 보면 좋은 기사 — 본문 글 바로 밑, 액션·댓글 위 (KAN-301) */}
      <SuggestedArticles articles={suggested} />

      {/* 액션 */}
      <div className="border-border flex flex-wrap items-center gap-1.5 border-b pb-4">
        <ArticleLikeButton
          articleId={article.id}
          initial={{ liked: article.liked, likeCount: article.likeCount }}
        />
        <ArticleShareButton articleId={article.id} />
      </div>

      <ArticleComments
        articleId={article.id}
        initialCount={article.commentCount}
        initialComments={initialComments}
      />
    </article>
  );
}
