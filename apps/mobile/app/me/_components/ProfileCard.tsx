import { ChevronMiniIcon, UserRoundIcon } from "@/_components/icons";
import type { User } from "@/_lib/types";

/**
 * MY 프로필 카드 — 아바타·닉네임·핸들 + 프로필 수정 진입 화살표.
 *
 * 프로필 수정 화면은 추후 라우트 연결(퍼블리싱 단계라 동작 없음).
 *
 * @param user - 표시할 로그인 유저
 */
export function ProfileCard({ user }: { user: User }) {
  return (
    <button
      type="button"
      className="bg-elevate-2 border-border rounded-card flex w-full items-center gap-3.5 border p-4.25 text-left active:opacity-60"
    >
      <span className="bg-avatar text-icon rounded-pill grid size-13 shrink-0 place-items-center">
        <UserRoundIcon size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-lg text-text font-extrabold tracking-[-0.2px]">
          {user.nickname}
        </span>
        <span className="text-label text-text-3">{user.handle}</span>
      </span>
      <ChevronMiniIcon className="text-text-4 shrink-0" />
    </button>
  );
}
