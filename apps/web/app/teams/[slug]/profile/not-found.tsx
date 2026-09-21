import Link from "next/link";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 팀 프로필 없음 화면 (KAN-507). 모르는 slug와, 레지스트리에는 있지만 BE
 * 인물 사전이 404를 주는 팀(마스터 재시드로 id가 어긋난 경우)이 여기로 온다.
 * 기사·인물 없음 화면과 같은 구성이다.
 */
export default function TeamProfileNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col items-center justify-center gap-7 px-6 py-40">
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-headline text-text font-extrabold">
            팀을 찾을 수 없어요
          </p>
          <p className="text-body text-text-3 font-semibold">
            프리미어리그 빅6만 프로필이 있어요
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
