import Link from "next/link";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 선수 프로필 없음 화면 (KAN-600). 숫자가 아닌 id와 BE 404(이번 시즌 빅6 소속 기록이 없는 선수)가
 * 여기로 온다. 팀 프로필 없음 화면과 같은 구성이다.
 */
export default function PlayerProfileNotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="flex flex-col items-start gap-2 pt-16 pb-24">
          <p className="text-section text-text-strong tracking-title font-black">
            선수를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            프리미어리그 빅6 소속 선수만 프로필이 있어요
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
