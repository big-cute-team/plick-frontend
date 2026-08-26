import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { getBlockedUsers } from "@/_services/blocks";
import { BlockedTopBar } from "./_components/BlockedTopBar";
import { BlockedUserList } from "./_components/BlockedUserList";

/** 개인화 화면이라 색인 가치가 없다 — robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "차단 목록",
  robots: { index: false, follow: false },
};

/**
 * 차단 목록 — 마이페이지 설정 줄 진입 (KAN-411). 목록은
 * `GET /users/me/blocks`로 읽고(페이지네이션 없는 배열, 최근 차단순),
 * 줄마다 차단 해제 버튼을 단다. 해제 반영은 `BlockedUserList`가 로컬로 한다.
 */
export default async function BlockedUsersPage() {
  const blocked = await getBlockedUsers();
  if (!blocked) {
    redirect("/login"); // 내 정보 화면이라 비로그인 진입이 성립하지 않는다
  }

  return (
    <AppShell>
      <BlockedTopBar />

      <ScrollArea>
        <div className="px-edge pt-3 pb-8">
          <BlockedUserList initial={blocked} />
        </div>
      </ScrollArea>
    </AppShell>
  );
}
