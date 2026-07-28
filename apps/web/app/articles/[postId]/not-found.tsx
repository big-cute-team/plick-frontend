import Link from "next/link";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 기사 없음 화면 — 삭제·미발행 기사 딥링크의 정상 경로 (KAN-322).
 * BE 404 `ARTICLE_NOT_FOUND`와 정수가 아닌 id의 400을 페이지가 `notFound()`로
 * 보내면 Next가 세그먼트를 이 화면으로 대체한다. 모바일 `not-found.tsx`와 같은
 * 문구이고 데스크톱이라 GNB를 남기고 hover·focus만 얹는다.
 */
export default function ArticleNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center justify-center gap-7 px-6 py-40">
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-headline text-text font-extrabold">
            기사를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3 font-semibold">
            삭제됐거나 아직 준비 중인 기사예요
          </p>
        </div>
        <Link
          href="/"
          className="bg-accent text-on-accent rounded-pill text-body-lg focus-visible:outline-accent flex h-13 w-full max-w-60 items-center justify-center font-extrabold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-80"
        >
          홈으로
        </Link>
      </main>
    </>
  );
}
