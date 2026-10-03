import Link from "next/link";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 팀 스쿼드 404 — 빅6 밖 id(TEAM_NOT_FOUND 매핑 대상)나 잘못된 주소로
 * 들어왔을 때 LIVE 목록으로 돌려보낸다 (KAN-567 톤).
 */
export default function TeamNotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer className="flex flex-col items-start gap-2 pt-16 pb-24">
          <p className="text-section text-text-strong tracking-title font-black">
            찾을 수 없는 팀이에요
          </p>
          <p className="text-body text-text-3">
            선수단은 빅6 팀만 볼 수 있어요
          </p>
          <Link
            href="/live"
            className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4 flex h-12 w-full max-w-60 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            LIVE로
          </Link>
        </PageContainer>
      </main>
    </>
  );
}
