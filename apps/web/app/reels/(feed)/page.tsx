import type { Metadata } from "next";
import { Suspense } from "react";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { SiteHeader } from "@/_components/SiteHeader";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { ReelsFeedSection } from "@/reels/_components/ReelsFeedSection";
import { ReelsWorkspaceSkeleton } from "@/reels/_components/ReelsWorkspaceSkeleton";

/**
 * 익명 ISR (KAN-667, 모바일 KAN-664·ADR 0200). 내 좋아요·투표는 화면이 뜬 뒤 내 상태 캐시가
 * 얹고, 이 페이지는 누구에게나 같은 것만 서버에서 받는다. 피드의 데이터 fetch가 익명 60초
 * 캐시라 같은 주기다.
 */
export const revalidate = 60;

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
 * 피드 조회는 {@link ReelsFeedSection}이 Suspense 안에서 맡는다 (KAN-602). 상단 바는
 * 기다리지 않고 바로 나간다.
 */
export default function ReelsPage() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <SiteHeader />
      <Suspense fallback={<ReelsWorkspaceSkeleton />}>
        <ReelsFeedSection />
      </Suspense>
    </div>
  );
}
