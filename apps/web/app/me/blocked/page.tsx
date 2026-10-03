import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBlockedUsers } from "@/_services/blocks";
import { MeShell } from "@/me/_components/MeShell";
import { BlockedUserList } from "./_components/BlockedUserList";

/** 개인화 화면이라 색인 가치가 없다. robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "차단 목록",
  robots: { index: false, follow: false },
};

/**
 * 데스크톱 차단 목록 (KAN-411 → KAN-567 리디자인, 시안 MY 719-736행). MY 좌측 메뉴의
 * "차단 목록"이고 안내 한 줄 아래 닉네임, 차단일, "차단 해제" 행을 쌓는다. 목록은
 * `GET /users/me/blocks`로 읽고 해제 반영은 `BlockedUserList`가 로컬로 한다.
 */
export default async function BlockedUsersPage() {
  const blocked = await getBlockedUsers();
  if (!blocked) {
    redirect("/login"); // 내 정보 화면이라 비로그인 진입이 성립하지 않는다
  }

  return (
    <MeShell>
      <h1 className="text-section text-text-strong tracking-title pb-5.5 font-black">
        차단 목록
      </h1>
      <div className="max-w-narrow">
        <p className="text-body text-text-3 pb-1">
          차단한 사용자의 댓글은 모든 화면에서 가려집니다
        </p>
        <BlockedUserList initial={blocked} />
      </div>
    </MeShell>
  );
}
