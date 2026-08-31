import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@plick/core/client";
import { getReelsFrom } from "@plick/core/reels";
import { truncateText } from "@plick/domain/format";
import type { InitialReelFeed } from "@plick/domain/types";
import { AppShell } from "@/_components/AppShell";
import { ReelsFeed } from "@/reels/_components/ReelsFeed";
import { TabBar } from "@/_components/TabBar";
import { WEB_SITE_URL } from "@/_constants/site";
import { getAccessToken } from "@/_services/session";
import { getReelSeedTweet } from "@/_services/tweet";
import { tweetImageUrl } from "@/_utils/tweet";
import type { ReelSeedTweet } from "@/_types/reels";

/**
 * 릴별 고유 메타데이터 (KAN-349) — 공유 미리보기가 그 릴의 제목·요약으로 나와야
 * 한다. canonical은 같은 릴의 데스크톱 URL이다(별도 모바일 URL 패턴, 기사 세부와
 * 같은 규약). OG 이미지는 릴과 기사가 같은 `articleSummaryId` 체계라 기존 동적
 * OG(`/articles/{id}/og`, KAN-351)를 그대로 쓴다.
 *
 * 메타데이터는 유저 무관이라 토큰 없이, 앵커 한 장만(size 1) 받는다. 없는 릴은
 * 빈 메타데이터로 두면 페이지 본문이 notFound()로 떨어진다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  try {
    const page = await getReelsFrom(postId, { size: 1 });
    const reel = page.items[0];
    if (!reel) return {};
    const description = truncateText(reel.summary, 160);
    return {
      title: reel.title,
      description,
      alternates: { canonical: `${WEB_SITE_URL}/reels/${reel.id}` },
      openGraph: {
        title: reel.title,
        description,
        type: "article",
        publishedTime: reel.publishedAt,
        images: [
          {
            url: `${WEB_SITE_URL}/articles/${reel.id}/og`,
            width: 1200,
            height: 630,
            alt: reel.title,
          },
        ],
      },
    };
  } catch {
    return {};
  }
}

/**
 * 릴스 딥링크 진입 (KAN-349) — 공유 링크로 특정 릴에 바로 떨어지는 화면.
 *
 * 첫 페이지를 `GET /api/v1/reels/{postId}`로 받아 씨앗으로 내려준다. `items[0]`이
 * 그 릴이고 이후가 시간순 다음 릴들이라 첫 화면이 요청 한 번으로 찬다. 이어보기는
 * 응답 커서로 기존 피드를 이어 간다({@link useReelsFeed} 앵커 모드). 위로
 * 스와이프(진입 릴보다 최신)는 v1 미지원 — 아래로만 이어진다.
 *
 * 없는·미발행 릴(404)과 정수가 아닌 id(400)는 삭제된 공유 링크나 손으로 친 주소의
 * 정상 경로다 — 에러 화면이 아니라 not-found로 보낸다. 그 외 실패(네트워크 순단
 * 등)는 씨앗 없이 내려보내 클라가 다시 받게 한다.
 *
 * 진입 릴(`items[0]`)이 임베드 릴이면 트윗 데이터도 미리 받아 preload까지 건다
 * (KAN-422) — 탭 피드와 같은 LCP 체인 단축이다.
 */
export default async function ReelDeepLinkPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  let initial: InitialReelFeed | undefined;
  let seedTweet: ReelSeedTweet | undefined;
  try {
    // 토큰을 실어야 응답의 `likedByMe`가 이 유저 기준으로 온다 (KAN-308)
    const page = await getReelsFrom(postId, {
      accessToken: await getAccessToken(),
    });
    initial = { page, fetchedAt: Date.now() };
    seedTweet = await getReelSeedTweet(page.items[0]);
  } catch (e) {
    if (
      e instanceof ApiError &&
      (e.code === "ARTICLE_NOT_FOUND" || e.code === "COMMON_INVALID_PARAM")
    ) {
      notFound();
    }
    console.error("[reels] 릴스 딥링크 초기 로드 실패:", e);
  }

  /* 탭 피드와 같은 이유로 preload()가 아니라 <link> 렌더 (reels/page.tsx 주석) */
  const seedImageUrl = seedTweet ? tweetImageUrl(seedTweet.tweet) : null;

  return (
    <AppShell>
      {seedImageUrl && (
        <link
          rel="preload"
          as="image"
          href={seedImageUrl}
          fetchPriority="high"
        />
      )}
      <ReelsFeed initial={initial} anchorId={postId} seedTweet={seedTweet} />
      <TabBar variant="overlay" />
    </AppShell>
  );
}
