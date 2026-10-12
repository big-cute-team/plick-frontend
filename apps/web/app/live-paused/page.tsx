import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/_components/PageContainer";
import { SiteFooter } from "@/_components/SiteFooter";
import { SiteHeader } from "@/_components/SiteHeader";

export const metadata: Metadata = {
  title: "LIVE 준비 중",
};

/**
 * 라이브 스코어 준비중 화면 (KAN-644). 축구 데이터 상류가 복구될 때까지 `proxy.ts`가
 * LIVE 목록, 경기 상세, 팀·선수 프로필을 이 화면으로 rewrite한다. 주소는 원래 경로
 * 그대로다. 판정과 깃발은 `@plick/domain/live-pause`. 톤은 전역 404와 같다.
 */
export default function LivePausedPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="flex flex-col items-start gap-2 pt-16 pb-24">
          <p className="text-caption tracking-live text-accent font-black">
            LIVE
          </p>
          <p className="text-section text-text-strong tracking-title font-black">
            경기 정보를 준비 중이에요
          </p>
          <p className="text-body text-text-3">
            더 나은 모습으로 곧 다시 열게요
          </p>
          <Link
            href="/"
            className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4 flex h-12 w-full max-w-60 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            홈으로
          </Link>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
