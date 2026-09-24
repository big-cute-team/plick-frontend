import Link from "next/link";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 인물 없음 화면 (KAN-501) — 등록되지 않았거나 운영자가 내린 인물 딥링크의
 * 정상 경로다. BE 404 `FIGURE_NOT_FOUND`와 정수가 아닌 id의 400을 페이지가
 * `notFound()`로 보내면 Next가 세그먼트를 이 화면으로 대체한다 (KAN-567 톤).
 */
export default function FigureNotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="flex flex-col items-start gap-2 pt-16 pb-24">
          <p className="text-section text-text-strong tracking-title font-black">
            인물을 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            등록되지 않았거나 내려간 인물이에요
          </p>
          <Link
            href="/"
            className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4 flex h-12 w-full max-w-60 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            홈으로
          </Link>
        </PageContainer>
      </main>
    </>
  );
}
