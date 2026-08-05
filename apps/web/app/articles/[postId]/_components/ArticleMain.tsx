import { MediaThumb } from "@plick/ui/MediaThumb";
import { PostBadges } from "@plick/ui/PostBadges";
import { ReporterLine } from "@plick/ui/ReporterLine";
import { SourceLinkButton } from "@plick/ui/SourceLinkButton";
import { TagChips } from "@plick/ui/TagChips";
import { SendIcon } from "@plick/ui/icons";
import { TEAMS } from "@plick/domain/constants";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type {
  ArticleCard,
  ArticleDetail,
  InitialCommentPage,
} from "@plick/domain/types";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import { ArticleComments } from "./ArticleComments";
import { ArticleLikeButton } from "./ArticleLikeButton";
import { SuggestedArticles } from "./SuggestedArticles";

/**
 * 기사 세부 본문 컬럼 — 칩·제목·기자 라인·대표 이미지·본문 문단·태그·액션·댓글.
 *
 * 정적 렌더(서버 컴포넌트)이며, 공용 조각(PostBadges·ReporterLine·TagChips·
 * CommentsHeader·CommentComposer)을 재사용한다. 좌우 폭은 상위 그리드가 정한다.
 * 배지 줄과 "함께 보면 좋은 기사"의 위치는 모바일 `ArticleBody`와 같게 맞췄다
 * (KAN-322) — 로고 + 알약 없는 단계 글자, 추천 행은 본문 글 바로 밑 액션 위.
 *
 * 실계약(KAN-322)으로 갈아타면서 마크업이 전제하던 게 몇 개 깨졌다. 팀은 단일이
 * 아니라 배열이고 비어 있을 수 있어 첫 팀만 대표로 쓰고 없으면 칩을 그리지
 * 않는다. 기자도 없을 수 있어 그때는 시각·조회만 한 줄로 남는다. 기자 줄은
 * KAN-365에서 전원 노출로 바꿨다 — 이름 옆 기자 수를 누르면 기자 목록(표시
 * 전용)이 열리고, 원문 버튼은 기자가 여럿일 때 기자별 원문 링크 팝오버가
 * 된다. 사진이 null이면
 * (현재 발행 기사의 기본 상태) 미디어 없이 텍스트만 흐른다. 본문은 문단 배열이
 * 아니라 긴 요약 하나라 줄바꿈으로 갈라 문단을 만든다.
 *
 * 저장 버튼은 뺐다 — BE 계약에 없다(모바일 KAN-283과 같은 판단). 좋아요는
 * KAN-330에서 눌리게 됐다 — 상세 응답의 `likedByMe`·`likeCount`를 초기값으로 받아
 * `ArticleLikeButton`(클라 경계)이 토글한다. 이 파일은 서버 컴포넌트로 남는다.
 * 댓글은 KAN-329에서 붙였다 — 헤더·입력바·목록은 클라 경계(`ArticleComments`)로
 * 내려가고, 이 파일은 서버가 미리 받아 둔 첫 페이지를 넘겨주기만 한다.
 *
 * @param article - 표시할 기사(본문은 `summary` — 상세 계약에 문단 필드가 없다)
 * @param suggested - 본문 밑 "함께 보면 좋은 기사" 목록. BE 추천 API가 아직 없어
 *   기본은 빈 배열이고, 비어 있으면 카드 대신 준비 중 문구가 나온다.
 * @param initialComments - 서버가 미리 받아 둔 댓글 첫 페이지. 댓글 fetch가
 *   실패했으면 없이 들어오고, 그때는 목록이 클라에서 직접 받는다.
 */
export function ArticleMain({
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
  const lead = article.reporters[0] ?? null;

  // 기자가 여럿이면 기자별 원문 링크 팝오버, 한 명이면 대표 원문 직행 (KAN-365)
  const sourceLink = (
    <SourceLinkButton
      label="출처 원문 보기"
      sourceUrl={lead?.sourceUrl ?? null}
      reporters={article.reporters}
      className="ml-auto"
    />
  );

  return (
    <article className="min-w-0">
      {/* 모바일 릴·기사 세부와 같은 배지 줄 — 구단 로고 + 알약 없는 단계 글자 */}
      <PostBadges team={team} stage={article.stage} crestSize={34} />

      {/* 제목 */}
      <h1 className="text-read-title text-text mt-3 font-bold">
        {article.title}
      </h1>

      {lead ? (
        <ReporterLine
          reporter={lead}
          reporters={article.reporters}
          meta={`· ${meta}`}
          className="border-border mt-4 flex-wrap gap-x-2 gap-y-1.5 border-b pb-4"
        >
          {sourceLink}
        </ReporterLine>
      ) : (
        <div className="border-border mt-4 flex items-center border-b pb-4">
          <span className="text-label text-text-3">{meta}</span>
          {sourceLink}
        </div>
      )}

      {/* 대표 이미지 — 사진 null이면 미디어 없이 텍스트만 흐른다 */}
      {article.imageUrl && (
        <MediaThumb
          colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
          imageUrl={article.imageUrl}
          className="rounded-hero mt-5 aspect-[16/7] w-full"
        />
      )}

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
      {article.hashtags.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <TagChips tags={article.hashtags} />
        </div>
      )}

      {/* 함께 보면 좋은 기사 — 본문 글 바로 밑, 액션·댓글 위 (모바일과 같은 자리) */}
      <SuggestedArticles articles={suggested} />

      {/* 액션 — 좋아요만 클라 경계로 떼어 낸다(누른 상태일 때 강조색) */}
      <div className="border-border mt-4 flex flex-wrap items-center gap-2.5 border-b pb-4">
        <ArticleLikeButton
          articleId={article.id}
          initial={{ liked: article.liked, likeCount: article.likeCount }}
        />
        <button
          type="button"
          className="bg-elevate-2 border-border text-text-2 text-body rounded-pill hover:border-border-strong hover:text-text focus-visible:outline-accent flex h-9 items-center gap-1.5 border px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <SendIcon size={15} />
          공유
        </button>
      </div>

      <ArticleComments
        articleId={article.id}
        initialCount={article.commentCount}
        initialComments={initialComments}
      />
    </article>
  );
}
