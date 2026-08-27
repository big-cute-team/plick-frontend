import { MediaThumb } from "@plick/ui/MediaThumb";
import { PostBadges } from "@plick/ui/PostBadges";
import { ReporterLine } from "@plick/ui/ReporterLine";
import { SourceLinkButton } from "@plick/ui/SourceLinkButton";
import { TagChips } from "@plick/ui/TagChips";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import { TEAMS } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type {
  ArticleCard,
  ArticleDetail,
  Debate,
  InitialCommentPage,
} from "@plick/domain/types";
import { formatRelativeTime } from "@plick/domain/format";
import { DebateVoteCard } from "@/_components/DebateVoteCard";
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
 * 팀·단계·기자는 없으면 그 조각만 빠진다. 기자 줄은 대표만 보이던 것을
 * KAN-365에서 전원 노출로 바꿨다 — 이름 옆 기자 수를 누르면 기자 목록(표시
 * 전용)이 열리고, 원문 버튼은 기자가 여럿일 때 기자별 원문 링크 팝오버가 된다.
 * 서버 컴포넌트 — 댓글 섹션(`ArticleComments`)만 클라 경계로 내려간다(KAN-303).
 * 좋아요는 KAN-308, 공유는 KAN-312에서 각각 클라 경계 버튼으로 연결했다.
 *
 * @param article - 표시할 기사(본문은 `summary` — 상세 계약에 문단 필드가 없다)
 * @param suggested - 본문 밑 "함께 보면 좋은 기사" 목록(KAN-301). 팀태그 기반
 *   관련 기사를 받는다(KAN-338). 비어 있으면 카드 대신 빈 문구가 나온다.
 * @param initialComments - 서버가 미리 받아 둔 댓글 첫 페이지(KAN-303).
 *   실패했으면 undefined — 목록이 클라에서 직접 받는다.
 * @param debate - 이 기사에 붙은 토론(KAN-418). null이면 투표 카드가 빠진다.
 */
export function ArticleBody({
  article,
  suggested = [],
  initialComments,
  debate = null,
}: {
  article: ArticleDetail;
  suggested?: ArticleCard[];
  initialComments?: InitialCommentPage;
  debate?: Debate | null;
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  // 긴 요약 하나가 본문의 전부다. 줄바꿈이 섞여 오면 문단으로 가른다
  const paragraphs = article.summary.split("\n").filter(Boolean);
  const meta = `${formatRelativeTime(article.publishedAt)} · 조회 ${formatCount(article.views)}`;
  const lead = article.reporters[0] ?? null;

  // 기자가 여럿이면 기자별 원문 링크 팝오버, 한 명이면 대표 원문 직행 (KAN-365)
  const sourceLink = (
    <SourceLinkButton
      label="원문"
      sourceUrl={lead?.sourceUrl ?? null}
      reporters={article.reporters}
      className="ml-auto"
    />
  );

  return (
    <article className="px-edge flex flex-col gap-3.5 pt-1">
      {/* 배지 줄 — 알약 없는 단계 글자만 (KAN-301). 상단 구단 로고는 KAN-368에서
          뺐다(릴은 유지) — 제목 위 로고가 목록 진입 맥락과 겹쳐 자리만 차지해서다 */}
      <PostBadges
        team={null}
        stage={article.stage}
        stageTextClass="text-label"
      />

      {/* 제목 */}
      <h1 className="text-hero tracking-heading text-text font-extrabold">
        {article.title}
      </h1>

      {lead ? (
        <ReporterLine
          reporter={lead}
          reporters={article.reporters}
          meta={`· ${meta}`}
          className="flex-wrap gap-x-2 gap-y-1.5"
        >
          {sourceLink}
        </ReporterLine>
      ) : (
        <div className="flex items-center">
          <span className="text-body text-text-3">{meta}</span>
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
          className="text-title text-text-2 leading-body-lg tracking-snug"
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

      {/* 투표 카드 — 태그 행과 액션 행 사이 (KAN-418, 시안 V3·W14).
          인터랙션이 있어 댓글처럼 클라 경계로 내려간다. 마감 판정은 기사
          contentType이 실기준이다(FINISH = 마감) */}
      {debate && (
        <DebateVoteCard
          debate={debate}
          closed={article.contentType === "FINISH"}
        />
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
