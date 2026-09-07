import Link from "next/link";
import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 팀 스쿼드 404 — 빅6 밖 id(TEAM_NOT_FOUND 매핑 대상)나 잘못된 주소로
 * 들어왔을 때 순위표로 돌려보낸다.
 */
export default function TeamNotFound() {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-label tracking-label text-accent font-bold">404</p>
          <h1 className="text-headline text-text font-extrabold">
            찾을 수 없는 팀이에요
          </h1>
          <p className="text-body text-text-3 font-semibold">
            선수단은 빅6 팀만 볼 수 있어요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/live/standings">순위표로</PrimaryButton>
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
