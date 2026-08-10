import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import type { InitialReelFeed } from "@plick/domain/types";
import { getReels } from "@plick/core/reels";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { getAccessToken } from "@/_services/session";
import { ReelsWorkspace } from "./_components/ReelsWorkspace";

/** 이 URL이 canonical이고 대응 모바일 릴스를 alternate로 선언한다 (KAN-346) — 홈과 같은 상호 참조. */
export const metadata: Metadata = {
  title: "릴스",
  description: PAGE_DESCRIPTIONS.reels,
  alternates: {
    canonical: "/reels",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/reels` },
  },
};

/**
 * 데스크톱 웹 릴스 화면 (KAN-218) — GNB + 세로 스냅 릴 뷰어.
 * 제목·댓글 클릭 시 오른쪽 세부 패널 (KAN-219) — `ReelsWorkspace`가 소유.
 *
 * 뷰포트 전체(100dvh)를 헤더 + 작업 영역으로 채우고, 스크롤은 뷰어 안에서만 일어난다
 * (문서 흐름을 스크롤시키지 않아 스냅이 깔끔하다).
 *
 * 첫 페이지는 `GET /api/v1/reels`로 여기서 미리 받아 내려준다 (KAN-323). 클라가
 * 같은 데이터를 또 부르는 이중 페치를 막는 씨앗이고, 끝에 가까워지면 클라가
 * 커서로 이어받는다.
 */
export default async function ReelsPage() {
  let initial: InitialReelFeed | undefined;
  try {
    // 받은 시각을 함께 넘긴다 — 클라 캐시가 이 씨앗의 신선도를 재는 기준이 된다.
    // 토큰을 실어야 응답의 `likedByMe`가 이 유저 기준으로 온다 (KAN-308)
    const page = await getReels({ accessToken: await getAccessToken() });
    initial = { page, fetchedAt: Date.now() };
  } catch (e) {
    // 서버에서 못 받아도 페이지 전체를 에러로 떨어뜨리지 않는다.
    // 클라가 다시 받아 뷰어 자리에 에러와 재시도 버튼을 보여준다.
    console.error("[reels] 릴스 피드 초기 로드 실패:", e);
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SiteHeader />
      <ReelsWorkspace initial={initial} />
    </div>
  );
}
