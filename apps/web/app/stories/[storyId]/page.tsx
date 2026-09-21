import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { ApiError } from "@plick/core/client";
import { getStory } from "@plick/core/stories";
import type { InitialArticleFeed } from "@plick/domain/types";
import { ScopedArticlesFeed } from "@/_components/ScopedArticlesFeed";
import { SiteHeader } from "@/_components/SiteHeader";
import { StoryHeader } from "./_components/StoryHeader";

/**
 * 이슈별 메타데이터 (KAN-523). 이슈 제목이 곧 "히샬리송", "맨체스터 더비" 같은
 * 짧은 키워드라(KAN-533) title에 그대로 쓴다. 키워드가 이적설만이 아니라 경기나
 * 대표팀 명단일 수도 있어 설명에는 기사 종류를 적지 않는다. 모바일에는 이슈
 * 화면이 없어 alternate는 두지 않는다. 없는 이슈는 빈 메타데이터로 두면 본문이
 * notFound()로 떨어진다. 익명 fetch라 본문의 같은 호출과 렌더 안에서 중복
 * 제거된다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string }>;
}): Promise<Metadata> {
  const { storyId } = await params;
  try {
    const story = await getStory(storyId);
    return {
      title: story.title,
      description: `${story.title} 관련 기사 ${story.articleCount}건 모아보기`,
      alternates: { canonical: `/stories/${storyId}` },
    };
  } catch {
    return {};
  }
}

/**
 * 데스크톱 이슈 상세 (KAN-523). 사이드바 급상승 랭킹의 이슈 줄이 여기로 들어온다.
 *
 * 인물 프로필(`/figures/[figureId]`)과 같은 구성이다. 이슈 머리를 두고 그 아래
 * 이슈에 묶인 기사를 무한 목록으로 잇는다. 폭은 기사 목록과 같은 `max-w-read`
 * 단일 컬럼이다.
 *
 * 이슈와 기사 첫 페이지를 병렬로 받는다. 이슈가 404·400이면 not-found고, 기사
 * 첫 페이지만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보낸다 — 목록이
 * 클라에서 다시 받으며 에러·재시도를 그린다.
 *
 * 비로그인도 전부 보인다. 두 호출 다 익명 공개 API라 토큰을 싣지 않는다.
 */
export default async function StoryPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;

  const [storyResult, feedResult] = await Promise.allSettled([
    getStory(storyId),
    getArticles({ storyId }),
  ]);

  if (storyResult.status === "rejected") {
    const error = storyResult.reason;
    // 없는 이슈·어드민이 숨긴 이슈(404)와 정수가 아닌 id(400)는 옛 링크나 손으로
    // 친 주소의 정상 경로다 — 에러 화면이 아니라 not-found로 보낸다
    if (
      error instanceof ApiError &&
      (error.code === "STORY_NOT_FOUND" ||
        error.code === "COMMON_INVALID_PARAM")
    ) {
      notFound();
    }
    throw error;
  }
  const story = storyResult.value;

  let initial: InitialArticleFeed | undefined;
  if (feedResult.status === "fulfilled") {
    initial = { page: feedResult.value, fetchedAt: Date.now() };
  } else {
    console.error("[story] 이슈 기사 초기 로드 실패:", feedResult.reason);
  }

  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-read px-gutter mx-auto w-full pb-22">
          <StoryHeader story={story} />
          <section>
            <h2 className="text-section text-text tracking-heading pb-2 font-extrabold">
              이 이슈의 기사
            </h2>
            <ScopedArticlesFeed
              scope={{ kind: "story", id: story.id }}
              initial={initial}
              emptyText="아직 이 이슈의 기사가 없어요."
            />
          </section>
        </div>
      </main>
    </>
  );
}
