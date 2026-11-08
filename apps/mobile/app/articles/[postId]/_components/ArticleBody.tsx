import dynamic from "next/dynamic";
import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import {
  formatCount,
  formatRelativeTime,
  teamProfilePath,
} from "@plick/domain/format";
import type { ArticleCard, ArticleDetail, Debate } from "@plick/domain/types";
import { AiArticleLabel } from "@plick/ui/AiArticleLabel";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsMark } from "@plick/ui/VsMark";
import { AdSlot } from "@/_components/AdSlot";
import { ArticleSourceLink } from "@/_components/ArticleSourceLink";
import { EntityChips } from "@/_components/EntityChips";
import { ArticleComments } from "./ArticleComments";
import { ArticleDebateCard } from "./ArticleDebateCard";
import { ArticleLikeButton } from "./ArticleLikeButton";
import { ArticleShareButton } from "./ArticleShareButton";
import { ReadEndSentinel } from "./ReadEndSentinel";
import { SuggestedArticles } from "./SuggestedArticles";

/** 임베드는 본문 아래에서 브라우저가 받으므로 react-tweet을 초기 번들에서 뺀다 (KAN-742) */
const TweetEmbed = dynamic(() =>
  import("@/_components/TweetEmbed").then((m) => m.TweetEmbed),
);

/**
 * 기사 세부 본문 (시안 KAN-567 "기사 세부", 배치 KAN-742). 머리(팀 + VS, 제목, 기자와
 * 시각·조회, 고정 부제목), 대표 이미지, 문단, 투표 카드, 태그 칩, 좋아요와 공유, 구분선,
 * 원문 링크와 임베드, 댓글, 관련 기사 순이다.
 * 관련 기사는 시안에서 댓글 위였지만 KAN-676에서 댓글 밑으로 내렸다.
 *
 * 시안 규칙으로 뺀 것: 루머 단계 라벨(PostBadges), 기자 등급과 "외 N명"(ReporterLine),
 * 팀컬러 그라데이션 썸네일. 기자는 대표 한 명만 12/700으로 쓴다. 기자
 * 프로필 링크는 시안에 있지만 기자 프로필 API가 없어 글자로만 둔다. 액션 줄 오른쪽의
 * "신고"도 기사 신고 API가 없어 뺐다.
 *
 * 사진이 null이면(현재 발행 기사의 기본 상태) 본문 위에 미디어를 그리지 않는다.
 * 원문 트윗 임베드는 KAN-301에서 뺐다가 KAN-742에서 본문 아래로 되살렸다. 우리가 쓴 기사와
 * 원문을 구분선으로 가르고 원문 사진을 온전히 보여 주려는 배치다.
 * 서버 컴포넌트 — 댓글 섹션(`ArticleComments`)만 클라 경계로 내려간다(KAN-303).
 * 좋아요는 KAN-308, 공유는 KAN-312에서 각각 클라 경계 버튼으로 연결했다.
 *
 * @param article - 표시할 기사(본문은 `summary` — 상세 계약에 문단 필드가 없다)
 * @param suggested - 댓글 밑 "함께 보면 좋은 기사" 목록(KAN-301, 위치 KAN-676). 팀태그 기반
 *   관련 기사를 받는다(KAN-338). 가로 카드 한 줄이고(KAN-668) 비어 있으면 빈 문구가 나온다.
 * @param debate - 이 기사에 붙은 토론(KAN-418). null이면 투표 카드와 VS가 빠진다.
 */
export function ArticleBody({
  article,
  suggested = [],
  debate = null,
}: {
  article: ArticleDetail;
  suggested?: ArticleCard[];
  debate?: Debate | null;
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  // 긴 요약 하나가 본문의 전부다. 줄바꿈이 섞여 오면 문단으로 가른다
  const paragraphs = article.summary.split("\n").filter(Boolean);
  const lead = article.reporters[0] ?? null;
  const sourceUrl =
    lead?.sourceUrl ??
    article.reporters.find((reporter) => reporter.sourceUrl)?.sourceUrl ??
    null;

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
                <TeamCrest team={team} size={18} decorative />
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
        <div className="flex items-center gap-2 pb-2.5">
          {lead && (
            <span className="text-label text-text min-w-0 truncate font-bold">
              by {lead.name}
            </span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게 달라진다 */}
            <span
              className="text-caption-lg text-text-4"
              suppressHydrationWarning
            >
              {formatRelativeTime(article.publishedAt)}
            </span>
            <span className="text-caption-lg text-text-4">
              조회 {formatCount(article.views)}
            </span>
          </div>
        </div>
        {/* 본문 첫 줄의 줄 간격이 아래 공백에 더해져 pb를 작게 둔다. 보이는 위아래 공백이 같아진다 */}
        <AiArticleLabel className="border-border border-t pt-2.5 pb-1.25" />
      </header>

      <div className="px-edge">
        {/* 대표 이미지 — 사진 null이면 자리를 그리지 않는다 (KAN-301). 16:9, radius 10 */}
        {article.imageUrl && (
          <div className="rounded-tile bg-media mt-3.5 mb-4 aspect-video overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴·핫이슈와 같은 이유) */}
            <img
              // X CDN이 Referer 붙은 핫링크를 351로 막는다 (KAN-682) - 보내지 않는다
              referrerPolicy="no-referrer"
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
            서버가 준 토론은 씨앗이고 집계는 브라우저가 다시 받는다 (KAN-681).
            마감 판정은 기사 contentType이 실기준이다(FINISH = 마감) */}
        {debate && (
          <ArticleDebateCard
            articleId={article.id}
            debate={debate}
            closed={article.contentType === "FINISH"}
          />
        )}

        {/* 태그 칩 줄 (KAN-500) — 선수·팀 이름 칩은 700에 프로필 링크 */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4.5">
          <EntityChips hashtags={article.hashtags} figures={article.figures} />
        </div>

        {/* 액션 줄 — 좋아요와 공유. 시안의 "신고"는 기사 신고 API가 없어 뺐다 */}
        <div className="flex items-center gap-5 pt-4.5">
          <ArticleLikeButton
            articleId={article.id}
            initialCount={article.likeCount}
          />
          <ArticleShareButton articleId={article.id} />
        </div>

        {/* 본문 끝 표식 — 여기까지 내리면 읽기 종료 이벤트의 reachedEnd가 true (KAN-543).
            관련 기사·댓글은 본문이 아니라 그 위에 둔다 */}
        <ReadEndSentinel articleId={article.id} />

        {/* 원문 (KAN-742) — 구분선 밑에 링크와 임베드. 사진을 자르지 않고 자연 높이로 세운다.
            링크를 누르면 원문 클릭 이벤트가 나간다 (KAN-543) */}
        {sourceUrl && (
          <div className="border-border-strong mt-4.5 flex flex-col gap-3 border-t pt-4.5">
            <ArticleSourceLink
              articleId={article.id}
              label="원문 기사 바로가기"
              sourceUrl={sourceUrl}
              reporters={article.reporters}
            />
            <TweetEmbed url={sourceUrl} />
          </div>
        )}
      </div>

      {/* 광고 (KAN-652) — 본문 끝 표식 뒤, 댓글 위. 본문이 아니라
          읽기 종료 판정에 들지 않는다 */}
      <AdSlot placement="article" className="px-edge mt-6.5" />

      <div className="px-edge pt-6.5">
        <ArticleComments
          articleId={article.id}
          initialCount={article.commentCount}
          debate={debate}
          closed={article.contentType === "FINISH"}
        />
      </div>

      {/* 함께 보면 좋은 기사는 댓글 밑이다 (KAN-676). 본문을 다 읽은 사람이 반응부터
          보고, 댓글까지 내려온 뒤 다음 기사로 넘어가게 한다 */}
      <SuggestedArticles articles={suggested} />
    </article>
  );
}
