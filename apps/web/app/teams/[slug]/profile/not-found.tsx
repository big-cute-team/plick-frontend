import Link from "next/link";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 팀 프로필 없음 화면 (KAN-507). 모르는 slug와, 레지스트리에는 있지만 BE
 * 인물 사전이 404를 주는 팀(마스터 재시드로 id가 어긋난 경우)이 여기로 온다.
 * 기사, 인물 없음 화면과 같은 구성이다 (KAN-567 톤).
 */
export default function TeamProfileNotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="flex flex-col items-start gap-2 pt-16 pb-24">
          <p className="text-section text-text-strong tracking-title font-black">
            팀을 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            프리미어리그 빅6만 프로필이 있어요
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
