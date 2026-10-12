import type { Metadata } from "next";
import { Suspense } from "react";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { WEB_SITE_URL } from "@/_constants/site";
import { ReelSkeleton } from "@/reels/_components/ReelSkeleton";
import { ReelsFeedSection } from "@/reels/_components/ReelsFeedSection";

/** canonical은 데스크톱 릴스다 (KAN-346) — 모바일 홈 canonical과 같은 이유. */
export const metadata: Metadata = {
  title: "릴스",
  description: PAGE_DESCRIPTIONS.reels,
  alternates: { canonical: `${WEB_SITE_URL}/reels` },
};

/**
 * 릴스 화면 (KAN-167). 풀스크린 세로 피드 위에 오버레이 하단 탭을 얹는다. 상단 바는
 * 없다. KAN-567 시안이 상단 바와 일반 탭으로 바꿨다가 KAN-569에서 이 배치로 되돌렸다.
 *
 * 피드와 씨앗 조회는 {@link ReelsFeedSection}이 Suspense 안에서 맡는다 (KAN-602).
 * 셸과 탭바는 기다리지 않고 바로 나간다.
 */
export default function ReelsPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <main className="flex-1 overflow-hidden">
            <ReelSkeleton />
          </main>
        }
      >
        <ReelsFeedSection />
      </Suspense>
      <TabBar variant="overlay" />
    </AppShell>
  );
}
