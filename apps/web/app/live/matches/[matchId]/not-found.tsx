import Link from "next/link";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 경기 상세 404 — 모르는 경기 id(MATCH_NOT_FOUND 매핑 대상)로 들어왔을 때
 * 목록으로 돌려보낸다. 전역 404와 같은 구성이다 (KAN-567 톤).
 */
export default function MatchNotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="flex flex-col items-start gap-2 pt-16 pb-24">
          <p className="text-section text-text-strong tracking-title font-black">
            찾을 수 없는 경기예요
          </p>
          <p className="text-body text-text-3">
            끝난 지 오래됐거나 잘못된 주소일 수 있어요
          </p>
          <Link
            href="/live"
            className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4 flex h-12 w-full max-w-60 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            경기 목록으로
          </Link>
        </PageContainer>
      </main>
    </>
  );
}
