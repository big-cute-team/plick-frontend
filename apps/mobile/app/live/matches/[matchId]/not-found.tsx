import Link from "next/link";
import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 경기 상세 404 — 모르는 경기 id(빅6 밖 포함, MATCH_NOT_FOUND 매핑 대상)로
 * 들어왔을 때 목록으로 돌려보낸다. 기사·릴스 세그먼트 404와 같은 구조다.
 */
export default function MatchNotFound() {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-label tracking-label text-accent font-bold">404</p>
          <h1 className="text-headline text-text font-extrabold">
            찾을 수 없는 경기예요
          </h1>
          <p className="text-body text-text-3 font-semibold">
            끝난 지 오래됐거나 잘못된 주소일 수 있어요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/live">경기 목록으로</PrimaryButton>
        </div>
        <Link
          href="/"
          className="text-body text-text-4 font-semibold underline"
        >
          홈으로 갈래요
        </Link>
      </main>
    </AppShell>
  );
}
