import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@plick/core/client";
import { getReelsFrom } from "@plick/core/reels";
import { truncateText } from "@plick/domain/format";
import type { InitialReelFeed } from "@plick/domain/types";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { getAccessToken } from "@/_services/session";
import { ReelsWorkspace } from "@/reels/_components/ReelsWorkspace";

/**
 * 릴별 고유 메타데이터 (KAN-349) — 공유 미리보기가 그 릴의 제목·요약으로 나와야
 * 한다. 이 URL이 canonical이고(릴을 독립 랜딩으로 키우는 결정), 같은 릴의 모바일
 * URL을 alternate로 선언한다(별도 모바일 URL 패턴, 기사 세부와 같은 규약).
 * OG 이미지는 릴과 기사가 같은 `articleSummaryId` 체계라 기존 동적
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
      alternates: {
        canonical: `/reels/${reel.id}`,
        media: {
          [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/reels/${reel.id}`,
        },
      },
      openGraph: {
        title: reel.title,
        description,
        type: "article",
        publishedTime: reel.publishedAt,
        images: [
          {
            url: `/articles/${reel.id}/og`,
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
 * 데스크톱 릴스 딥링크 진입 (KAN-349) — 공유 링크로 특정 릴에 바로 떨어지는 화면.
 *
 * 첫 페이지를 `GET /api/v1/reels/{postId}`로 받아 씨앗으로 내려준다. `items[0]`이
 * 그 릴이고 이후가 시간순 다음 릴들이라 첫 화면이 요청 한 번으로 찬다. 이어보기는
 * 응답 커서로 기존 피드를 이어 간다({@link useReelsFeed} 앵커 모드).
 *
 * 없는·미발행 릴(404)과 정수가 아닌 id(400)는 삭제된 공유 링크나 손으로 친 주소의
 * 정상 경로다 — 에러 화면이 아니라 not-found로 보낸다. 그 외 실패(네트워크 순단
 * 등)는 씨앗 없이 내려보내 클라가 다시 받게 한다.
 */
export default async function ReelDeepLinkPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  let initial: InitialReelFeed | undefined;
  try {
    // 토큰을 실어야 응답의 `likedByMe`가 이 유저 기준으로 온다 (KAN-308)
    const page = await getReelsFrom(postId, {
      accessToken: await getAccessToken(),
    });
    initial = { page, fetchedAt: Date.now() };
  } catch (e) {
    if (
      e instanceof ApiError &&
      (e.code === "ARTICLE_NOT_FOUND" || e.code === "COMMON_INVALID_PARAM")
    ) {
      notFound();
    }
    console.error("[reels] 릴스 딥링크 초기 로드 실패:", e);
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SiteHeader />
      <ReelsWorkspace initial={initial} anchorId={postId} />
    </div>
  );
}
