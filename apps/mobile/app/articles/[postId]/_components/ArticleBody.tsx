import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import {
  formatCount,
  formatRelativeTime,
  teamProfilePath,
} from "@plick/domain/format";
import type {
  ArticleCard,
  ArticleDetail,
  Debate,
  InitialCommentPage,
} from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsMark } from "@plick/ui/VsMark";
import { ArticleSourceLink } from "@/_components/ArticleSourceLink";
import { DebateVoteCard } from "@/_components/DebateVoteCard";
import { EntityChips } from "@/_components/EntityChips";
import { ArticleComments } from "./ArticleComments";
import { ArticleLikeButton } from "./ArticleLikeButton";
import { ArticleShareButton } from "./ArticleShareButton";
import { ReadEndSentinel } from "./ReadEndSentinel";
import { SuggestedArticles } from "./SuggestedArticles";

/**
 * 기사 세부 본문 (시안 KAN-567 "기사 세부"). 머리(팀 + VS, 제목, 기자와 시각, 조회),
 * 대표 이미지, 문단, 투표 카드, 태그 칩과 원문 링크, 좋아요와 공유, 관련 기사, 댓글 순이다.
 *
 * 시안 규칙으로 뺀 것: 루머 단계 라벨(PostBadges), 기자 등급과 "외 N명"(ReporterLine),
 * 팀컬러 그라데이션 썸네일. 기자는 대표 한 명만 12/700으로 쓴다. 기자
 * 프로필 링크는 시안에 있지만 기자 프로필 API가 없어 글자로만 둔다. 액션 줄 오른쪽의
 * "신고"도 기사 신고 API가 없어 뺐다.
 *
 * 사진이 null이면(현재 발행 기사의 기본 상태) 미디어 없이 텍스트만 흐른다.
 * 트윗 임베드 폴백은 KAN-301에서 뺐다 — 본문과 임베드 내용이 겹치고 로딩이
 * 무거워서다. 원문은 태그 줄 오른쪽의 "원문 보기"로만 연결한다.
 * 서버 컴포넌트 — 댓글 섹션(`ArticleComments`)만 클라 경계로 내려간다(KAN-303).
 * 좋아요는 KAN-308, 공유는 KAN-312에서 각각 클라 경계 버튼으로 연결했다.
 *
 * @param article - 표시할 기사(본문은 `summary` — 상세 계약에 문단 필드가 없다)
 * @param suggested - 본문 밑 "함께 보면 좋은 기사" 목록(KAN-301). 팀태그 기반
 *   관련 기사를 받는다(KAN-338). 비어 있으면 행 대신 빈 문구가 나온다.
 * @param initialComments - 서버가 미리 받아 둔 댓글 첫 페이지(KAN-303).
 *   실패했으면 undefined — 목록이 클라에서 직접 받는다.
 * @param debate - 이 기사에 붙은 토론(KAN-418). null이면 투표 카드와 VS가 빠진다.
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
  const lead = article.reporters[0] ?? null;

  return (
    <article>
      {/* 머리 — 팀 줄, 제목, 기자와 시각, 조회 */}
      <header className="px-edge pt-4.5">
        {(team || debate) && (
          <div className="flex items-center gap-1.75 pb-2.5">
            {team && (
              <Link
                href={teamProfilePath(team.code)}
                className="flex items-center gap-1.75 active:opacity-60"
              >
                <TeamCrest team={team} size={18} />
                <span className="text-caption-lg text-text-3 font-bold">
                  {team.name}
                </span>
              </Link>
            )}
            {debate && <VsMark size="md" />}
          </div>
        )}
        <h1 className="text-hero tracking-title text-text-strong pb-2.75 font-black text-pretty">
          {article.title}
        </h1>
        <div className="flex items-center gap-2 pb-3.5">
          {lead && (
            <span className="text-label text-text font-bold">{lead.name}</span>
          )}
          {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게 달라진다 */}
          <span
            className="text-caption-lg text-text-4"
            suppressHydrationWarning
          >
            {formatRelativeTime(article.publishedAt)}
          </span>
          <span className="text-caption-lg text-text-4 ml-auto">
            조회 {formatCount(article.views)}
          </span>
        </div>
      </header>

      <div className="px-edge">
        {/* 대표 이미지 — 사진 null이면 자리를 그리지 않는다 (KAN-301). 16:9, radius 10 */}
        {article.imageUrl && (
          <div className="rounded-tile bg-media mb-4 aspect-video overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴·핫이슈와 같은 이유) */}
            <img
              src={article.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          </div>
        )}

        {/* 본문 문단 — 15/1.75, 문단 사이 13px */}
        <div className="flex flex-col gap-3.25">
          {paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="text-body-lg text-text leading-body-lg tracking-snug"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* 투표 카드 (KAN-418). 인터랙션이 있어 댓글처럼 클라 경계로 내려간다.
            마감 판정은 기사 contentType이 실기준이다(FINISH = 마감) */}
        {debate && (
          <div className="pt-5">
            <DebateVoteCard
              debate={debate}
              closed={article.contentType === "FINISH"}
            />
          </div>
        )}

        {/* 태그 칩 줄 (KAN-500) — 선수·팀 이름 칩은 700에 프로필 링크. 오른쪽 끝은
            원문 링크. 누르면 원문 클릭 이벤트가 나간다 (KAN-543) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4.5">
          <EntityChips hashtags={article.hashtags} figures={article.figures} />
          <ArticleSourceLink
            articleId={article.id}
            label="원문 보기"
            sourceUrl={lead?.sourceUrl ?? null}
            reporters={article.reporters}
            className="ml-auto"
          />
        </div>

        {/* 액션 줄 — 좋아요와 공유. 시안의 "신고"는 기사 신고 API가 없어 뺐다 */}
        <div className="flex items-center gap-5 pt-4.5">
          <ArticleLikeButton
            articleId={article.id}
            initial={{ liked: article.liked, likeCount: article.likeCount }}
          />
          <ArticleShareButton articleId={article.id} />
        </div>

        {/* 본문 끝 표식 — 여기까지 내리면 읽기 종료 이벤트의 reachedEnd가 true (KAN-543).
            관련 기사·댓글은 본문이 아니라 그 위에 둔다 */}
        <ReadEndSentinel articleId={article.id} />
      </div>

      <SuggestedArticles articles={suggested} />

      <div className="px-edge pt-6.5">
        <ArticleComments
          articleId={article.id}
          initialCount={article.commentCount}
          initialComments={initialComments}
        />
      </div>
    </article>
  );
}
