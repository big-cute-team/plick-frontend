import Link from "next/link";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 전역 404 화면 — 라우트에 매칭되지 않는 모든 주소가 온다.
 * Next 기본 404 대신 브랜드(GNB·토큰) 있는 화면을 보여 준다. 모바일
 * `not-found.tsx`와 같은 문구이고 데스크톱이라 GNB를 남기고 hover·focus만 얹는다.
 * 기사 딥링크 404는 `articles/[postId]/not-found.tsx`가 따로 맡는다.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center justify-center gap-7 px-6 py-40">
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-display text-accent font-extrabold">404</p>
          <p className="text-headline text-text font-extrabold">
            페이지를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3 font-semibold">
            주소가 잘못됐거나 사라진 페이지예요
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
