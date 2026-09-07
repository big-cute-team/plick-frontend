import Link from "next/link";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 경기 상세 404 — 모르는 경기 id(MATCH_NOT_FOUND 매핑 대상)로 들어왔을 때
 * 목록으로 돌려보낸다. 전역 404와 같은 구조다.
 */
export default function MatchNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center justify-center gap-7 px-6 py-40">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-display text-accent font-extrabold">404</p>
          <h1 className="text-headline text-text font-extrabold">
            찾을 수 없는 경기예요
          </h1>
          <p className="text-body text-text-3 font-semibold">
            끝난 지 오래됐거나 잘못된 주소일 수 있어요
          </p>
        </div>
        <Link
          href="/live"
          className="bg-accent text-on-accent rounded-pill text-body-lg focus-visible:outline-accent px-7 py-3 font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          경기 목록으로
        </Link>
      </main>
    </>
  );
}
