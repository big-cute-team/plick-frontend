import Link from "next/link";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 팀 스쿼드 404 — 빅6 밖 id(TEAM_NOT_FOUND 매핑 대상)나 잘못된 주소로
 * 들어왔을 때 대시보드로 돌려보낸다.
 */
export default function TeamNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center justify-center gap-7 px-6 py-40">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-display text-accent font-extrabold">404</p>
          <h1 className="text-headline text-text font-extrabold">
            찾을 수 없는 팀이에요
          </h1>
          <p className="text-body text-text-3 font-semibold">
            선수단은 빅6 팀만 볼 수 있어요
          </p>
        </div>
        <Link
          href="/live"
          className="bg-accent text-on-accent rounded-pill text-body-lg focus-visible:outline-accent px-7 py-3 font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          LIVE 대시보드로
        </Link>
      </main>
    </>
  );
}
