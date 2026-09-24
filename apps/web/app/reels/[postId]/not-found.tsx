import Link from "next/link";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 릴 없음 화면 — 삭제, 미발행 릴 공유 링크의 정상 경로 (KAN-349).
 * BE 404 `ARTICLE_NOT_FOUND`와 정수가 아닌 id의 400을 페이지가 `notFound()`로
 * 보내면 Next가 세그먼트를 이 화면으로 대체한다. 전역 404와 같은 구성이다 (KAN-567 톤).
 */
export default function ReelNotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="flex flex-col items-start gap-2 pt-16 pb-24">
          <p className="text-section text-text-strong tracking-title font-black">
            릴스를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            삭제됐거나 아직 준비 중인 릴스예요
          </p>
          <Link
            href="/reels"
            className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4 flex h-12 w-full max-w-60 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            릴스 보러 가기
          </Link>
        </PageContainer>
      </main>
    </>
  );
}
