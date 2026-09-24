import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import {
  figurePath,
  formatCount,
  formatRelativeTime,
  hashtagHref,
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
import { ArticleComments } from "./ArticleComments";
import { ArticleLikeButton } from "./ArticleLikeButton";
import { ArticleShareButton } from "./ArticleShareButton";
import { ReadEndSentinel } from "./ReadEndSentinel";

/**
 * 기사 세부 본문 컬럼 (KAN-233, 시안 KAN-567 "기사 상세") — 빵부스러기, 제목, 기자
 * 줄, 대표 이미지, 본문 문단, 투표 카드, 태그 줄, 액션 줄, 관련 기사, 댓글.
 *
 * 시안: 맨 위에 "목록 / 엠블럼 팀명" 빵부스러기, 본문 폭은 780(`max-w-read`).
 * 투표 기사면 `VS`와 "투표 진행 중" 11.5/700 빨강, 제목 30/900, 기자 13/700과
 * 시각·조회 12.5, 밑선. 문단 16/1.78. 태그는 12.5 보조색이고 팀·인물 태그는
 * 700 링크, 오른쪽 끝에 "출처 원문 보기". 액션 줄은 윗선 아래 하트와 "공유".
 * 관련 기사 2열과 댓글은 본문 폭 밖 컬럼 전폭이다. 루머 단계 라벨(`PostBadges`),
 * 기자 등급·"외 N명"(`ReporterLine`), 알약 칩(`TagChips`)은 시안 규칙으로 뺐고
 * 기자는 대표 한 명만 표기한다. 시안의 "이전 기사·다음 기사"는 API가 없어
 * 뺐다(API 공백).
 *
 * 정적 렌더(서버 컴포넌트)다. 실계약(KAN-322)으로 갈아타면서 마크업이 전제하던
 * 게 몇 개 깨졌다. 팀은 단일이 아니라 배열이고 비어 있을 수 있어 첫 팀만
 * 대표로 쓰고 없으면 빵부스러기의 팀 조각을 그리지 않는다. 기자도 없을 수 있어
 * 그때는 시각·조회만 한 줄로 남는다. 원문 버튼은 기자가 여럿일 때 기자별 원문
 * 링크 팝오버가 된다(KAN-365). 사진이 null이면(현재 발행 기사의 기본 상태)
 * 미디어 없이 텍스트만 흐른다. 본문은 문단 배열이 아니라 긴 요약 하나라
 * 줄바꿈으로 갈라 문단을 만든다.
 *
 * 저장 버튼은 뺐다 — BE 계약에 없다(모바일 KAN-283과 같은 판단). 좋아요는
 * KAN-330에서 눌리게 됐다 — 상세 응답의 `likedByMe`·`likeCount`를 초기값으로 받아
 * `ArticleLikeButton`(클라 경계)이 토글한다. 이 파일은 서버 컴포넌트로 남는다.
 * 댓글은 KAN-329에서 붙였다 — 헤더·입력바·목록은 클라 경계(`ArticleComments`)로
 * 내려가고, 이 파일은 서버가 미리 받아 둔 첫 페이지를 넘겨주기만 한다.
 *
 * @param article - 표시할 기사(본문은 `summary` — 상세 계약에 문단 필드가 없다)
 * @param related - 관련 기사 목록. 로드 실패면 null, 팀태그가 없거나 같은 팀 기사가
 *   더 없으면 빈 배열
 * @param initialComments - 서버가 미리 받아 둔 댓글 첫 페이지. 댓글 fetch가
 *   실패했으면 없이 들어오고, 그때는 목록이 클라에서 직접 받는다.
 * @param debate - 이 기사에 붙은 토론(KAN-418). null이면 투표 카드가 빠진다.
 */
export function ArticleMain({
  article,
  related,
  initialComments,
  debate = null,
}: {
  article: ArticleDetail;
  related: ArticleCard[] | null;
  initialComments?: InitialCommentPage;
  debate?: Debate | null;
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  // 긴 요약 하나가 본문의 전부다. 줄바꿈이 섞여 오면 문단으로 가른다
  const paragraphs = article.summary.split("\n").filter(Boolean);
  const lead = article.reporters[0] ?? null;
  const closed = article.contentType === "FINISH";

  return (
    <article className="min-w-0">
      {/* 빵부스러기 — 목록으로, 그리고 팀 프로필로 */}
      <nav aria-label="현재 위치" className="flex items-center gap-1.75 pb-4.5">
        <Link
          href="/articles"
          className="text-label text-accent hover:text-accent-hover font-bold"
        >
          목록
        </Link>
        {team && (
          <>
            <span aria-hidden className="text-caption text-text-3">
              /
            </span>
            <Link
              href={teamProfilePath(team.code)}
              className="text-label text-text-3 hover:text-accent flex items-center gap-1.75"
            >
              <TeamCrest team={team} size={15} />
              {team.name}
            </Link>
          </>
        )}
      </nav>

      <div className="max-w-read">
        {debate && (
          <div className="flex items-center gap-2 pb-2.5">
            <VsMark size="md" />
            <span
              className={`text-caption-lg font-bold ${
                closed ? "text-text-3" : "text-danger"
              }`}
            >
              {closed ? "투표 마감" : "투표 진행 중"}
            </span>
          </div>
        )}

        <h1 className="text-read-title text-text-strong tracking-title mb-3.5 font-black text-pretty">
          {article.title}
        </h1>

        <div className="border-border flex flex-wrap items-center gap-2.5 border-b pb-4">
          {lead && (
            <span className="text-body text-text font-bold">{lead.name}</span>
          )}
          <span className="text-label-lg text-text-3" suppressHydrationWarning>
            {formatRelativeTime(article.publishedAt)}
          </span>
          <span className="text-label-lg text-text-3">
            조회 {formatCount(article.views)}
          </span>
        </div>

        {/* 대표 이미지 — 사진 null이면 미디어 없이 텍스트만 흐른다 */}
        {article.imageUrl && (
          <div className="bg-media my-5 aspect-[16/7] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴과 같은 이유) */}
            <img
              src={article.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          </div>
        )}

        {/* 본문 문단 */}
        <div className="mt-5 flex flex-col gap-3.75">
          {paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="text-read-body text-text tracking-snug leading-[1.78]"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* 투표 카드 — 본문 밑, 태그 줄 위 (KAN-418, 시안 기사 상세).
            인터랙션이 있어 댓글처럼 클라 경계로 내려간다 */}
        {debate && (
          <div className="mt-6.5">
            <DebateVoteCard debate={debate} closed={closed} />
          </div>
        )}

        {/* 태그 줄 (KAN-500) — 팀 태그는 팀 프로필, 인물 태그는 인물 프로필로
            간다. 둘 다 없어도 오른쪽 원문 링크 때문에 줄은 남는다 */}
        <div className="flex flex-wrap items-center gap-2 pt-5">
          {article.hashtags.map((tag) => {
            const href = hashtagHref(tag);
            return href ? (
              <Link
                key={tag}
                href={href}
                className="text-label-lg text-text-3 hover:text-accent font-bold"
              >
                #{tag}
              </Link>
            ) : (
              <span
                key={tag}
                className="text-label-lg text-text-3 hover:text-accent"
              >
                #{tag}
              </span>
            );
          })}
          {article.figures.map((figure) => (
            <Link
              key={figure.id}
              href={figurePath(figure.id)}
              className="text-label-lg text-text-3 hover:text-accent font-bold"
            >
              #{figure.name}
            </Link>
          ))}
          <div aria-hidden className="flex-1" />
          {/* 기자가 여럿이면 기자별 원문 링크 팝오버, 한 명이면 대표 원문 직행 (KAN-365).
              누르면 원문 클릭 이벤트가 나간다 (KAN-543) */}
          <ArticleSourceLink
            articleId={article.id}
            label="출처 원문 보기"
            sourceUrl={lead?.sourceUrl ?? null}
            reporters={article.reporters}
          />
        </div>

        {/* 본문 끝 표식 — 여기까지 내리면 읽기 종료 이벤트의 reachedEnd가 true (KAN-543).
            관련 기사·댓글은 본문이 아니라 그 위에 둔다 */}
        <ReadEndSentinel articleId={article.id} />

        {/* 액션 — 좋아요·공유 버튼만 클라 경계로 떼어 낸다. 본문은 서버 컴포넌트로 남는다 */}
        <div className="border-border mt-5.5 flex items-center gap-5.5 border-t pt-5">
          <ArticleLikeButton
            articleId={article.id}
            initial={{ liked: article.liked, likeCount: article.likeCount }}
          />
          <ArticleShareButton articleId={article.id} />
        </div>
      </div>

      <section className="mt-8.5">
        <h2 className="text-body-lg text-text-strong pb-2.5 font-black tracking-tight">
          관련 기사
        </h2>
        {related === null ? (
          <p className="text-body text-text-4 py-4">
            관련 기사를 불러오지 못했어요
          </p>
        ) : related.length === 0 ? (
          <p className="text-body text-text-4 py-4">관련 기사가 아직 없어요</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8.5 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.id} className="border-border-soft border-b">
                <Link
                  href={`/articles/${item.id}`}
                  className="group flex h-8.5 items-center gap-2.25"
                >
                  <span className="text-body text-text group-hover:text-accent min-w-0 flex-1 truncate">
                    {item.title}
                  </span>
                  {item.commentCount > 0 && (
                    <span className="text-label text-danger shrink-0 font-bold">
                      [{formatCount(item.commentCount)}]
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ArticleComments
        articleId={article.id}
        initialCount={article.commentCount}
        initialComments={initialComments}
      />
    </article>
  );
}
