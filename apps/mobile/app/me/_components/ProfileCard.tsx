import Link from "next/link";
import { ChevronMiniIcon, UserRoundIcon } from "@plick/ui/icons";
import type { User } from "@/_lib/types";

/**
 * MY 프로필 카드 — 아바타·닉네임·핸들 + 프로필 수정 진입 화살표.
 *
 * 탭하면 프로필 수정(`/me/edit`)으로 이동한다.
 *
 * @param user - 표시할 로그인 유저
 */
export function ProfileCard({ user }: { user: User }) {
  return (
    <Link
      href="/me/edit"
      className="bg-elevate-2 border-border rounded-card gap-gap-lg flex w-full items-center border p-4.25 text-left active:opacity-60"
    >
      <span className="bg-avatar text-icon rounded-pill grid size-13 shrink-0 place-items-center">
        <UserRoundIcon size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-lg text-text font-extrabold tracking-tight">
          {user.nickname}
        </span>
        <span className="text-label text-text-3">{user.handle}</span>
      </span>
      <ChevronMiniIcon className="text-text-4 shrink-0" />
    </Link>
  );
}
