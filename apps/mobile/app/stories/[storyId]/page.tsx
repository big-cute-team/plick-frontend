import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@plick/core/articles";
import { articleKeys } from "@plick/core/articleKeys";
import { ApiError } from "@plick/core/client";
import { getStory } from "@plick/core/stories";
import type { InitialArticleFeed } from "@plick/domain/types";
import { AppShell } from "@/_components/AppShell";
import { ProfileScrollArea } from "@/_components/ProfileScrollArea";
import { ProfileSectionTitle } from "@/_components/ProfileSectionTitle";
import { ScopedArticlesFeed } from "@/_components/ScopedArticlesFeed";
import { SubTopBar } from "@/_components/SubTopBar";
import { TabBar } from "@/_components/TabBar";
import { WEB_SITE_URL } from "@/_constants/site";
import { StoryHeader } from "./_components/StoryHeader";

/**
 * 빈 목록이어도 선언해 둔다 (KAN-632). Next는 `generateStaticParams`가 아예 없는 동적 세그먼트를
 * 요청마다 렌더(ƒ)로 다루고, 있으면(목록 밖 값 포함) 첫 요청에 그려 fetch의 revalidate만큼 캐시한다.
 * 이슈는 수가 늘어나서 빌드 때 전부 그리지는 않는다. 인물 페이지와 같은 판단이다.
 */
export function generateStaticParams(): { storyId: string }[] {
  return [];
}

/**
 * 이슈별 메타데이터 (KAN-709, 웹 KAN-523과 같은 글). 이슈 제목이 곧 "히샬리송", "맨체스터 더비"
 * 같은 짧은 키워드라 title에 그대로 쓴다. canonical은 대응 데스크톱 이슈 페이지다. 웹이 이쪽을
 * alternate로 가리키는 상호 선언의 모바일 절반이다. 없는 이슈는 빈 메타데이터로 두면 본문이
 * notFound()로 떨어진다. 익명 fetch라 본문의 같은 호출과 렌더 안에서 중복 제거된다.
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
      alternates: { canonical: `${WEB_SITE_URL}/stories/${storyId}` },
    };
  } catch {
    return {};
  }
}

/**
 * 모바일 이슈 상세 (KAN-709, 웹 `stories/[storyId]`의 이식). 홈 실검 띠의 이슈 항목이 여기로
 * 들어온다. 전에는 모바일에 이 라우트가 없어 실검을 누르면 404였다.
 *
 * 인물 프로필(`/figures/[figureId]`)과 같은 구성이다. 상단 바 제목은 "이슈", 머리는 이슈 제목과
 * 기사 수, 그 아래 이슈에 묶인 기사를 무한 목록으로 잇는다. 목록 행은 홈 소식과 같은 `NewsItem`이다.
 *
 * 이슈와 기사 첫 페이지를 병렬로 받는다. 이슈가 404·400이면 not-found고, 기사
 * 첫 페이지만 실패하면 페이지를 죽이지 않고 씨앗 없이 내려보낸다. 목록이
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
    /* 없는 이슈·어드민이 숨긴 이슈(404)와 정수가 아닌 id(400)는 옛 링크나 손으로
       친 주소의 정상 경로다. 에러 화면이 아니라 not-found로 보낸다 */
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
    <AppShell>
      <SubTopBar title="이슈" backHref="/" backBehavior="back" />
      {/* 당겨서 새로고침 (KAN-681) — 기사 목록은 브라우저가, 머리는 서버 갱신 */}
      <ProfileScrollArea feedKey={articleKeys.storyFeed(story.id)}>
        <StoryHeader story={story} />
        <section>
          <div className="px-edge">
            <ProfileSectionTitle>이 이슈의 기사</ProfileSectionTitle>
          </div>
          <ScopedArticlesFeed
            scope={{ kind: "story", id: story.id }}
            initial={initial}
            emptyText="아직 이 이슈의 기사가 없어요"
          />
        </section>
      </ProfileScrollArea>
      <TabBar />
    </AppShell>
  );
}
