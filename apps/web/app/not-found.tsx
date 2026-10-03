import Link from "next/link";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 전역 404 화면 — 라우트에 매칭되지 않는 모든 주소가 온다.
 * Next 기본 404 대신 브랜드(GNB, 토큰) 있는 화면을 보여 준다. 시안 톤(KAN-567)대로
 * 제목 22/900, 안내 한 줄, 채운 강조색 버튼 48px이고 큰 "404" 글자는 뺐다.
 * 기사 딥링크 404는 `articles/[postId]/not-found.tsx`가 따로 맡는다.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="flex flex-col items-start gap-2 pt-16 pb-24">
          <p className="text-section text-text-strong tracking-title font-black">
            페이지를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            주소가 잘못됐거나 사라진 페이지예요
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
