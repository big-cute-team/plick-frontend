import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { SiteHeader } from "@/_components/SiteHeader";
import { getBlockedUsers } from "@/_services/blocks";
import { BlockedUserList } from "./_components/BlockedUserList";

/** 개인화 화면이라 색인 가치가 없다 — robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "차단 목록",
  robots: { index: false, follow: false },
};

/**
 * 데스크톱 차단 목록 — 마이페이지 설정 줄 진입 (KAN-411, 모바일과 동시 구현).
 * GNB + 중앙 정렬 좁은 컬럼(max-w-narrow, `/me/edit`와 같은 뼈대). 목록은
 * `GET /users/me/blocks`로 읽고 해제 반영은 `BlockedUserList`가 로컬로 한다.
 */
export default async function BlockedUsersPage() {
  const blocked = await getBlockedUsers();
  if (!blocked) {
    redirect("/login"); // 내 정보 화면이라 비로그인 진입이 성립하지 않는다
  }

  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          {/* 목록에서 나가는 명시적 경로 — 모바일 상단바 뒤로가기의 데스크톱 대응 */}
          <Link
            href="/me"
            className="text-label text-text-3 hover:text-text focus-visible:ring-accent inline-flex items-center gap-1 rounded-sm font-semibold focus-visible:ring-2 focus-visible:outline-none active:opacity-60"
          >
            <ChevronMiniIcon className="rotate-180" />
            MY
          </Link>
          <h1 className="text-hero text-text tracking-heading pt-3 font-bold">
            차단 목록
          </h1>

          <div className="pt-5.5">
            <BlockedUserList initial={blocked} />
          </div>
        </div>
      </main>
    </>
  );
}
