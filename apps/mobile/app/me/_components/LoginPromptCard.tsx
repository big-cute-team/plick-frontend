import Link from "next/link";
import { ChevronMiniIcon, UserRoundIcon } from "@plick/ui/icons";

/**
 * 로그아웃 상태의 MY 상단 — 프로필 대신 로그인을 유도하는 카드 (KAN-255).
 *
 * `ProfileCard`와 같은 섀시·간격을 써서 로그인하면 자연스레 프로필로 바뀌어 보이게 한다.
 * 탭하면 로그인 화면으로 이동한다.
 */
export function LoginPromptCard() {
  return (
    <Link
      href="/login"
      className="bg-elevate-2 border-border rounded-card gap-gap-lg flex w-full items-center border p-4.25 text-left active:opacity-60"
    >
      <span className="bg-avatar text-icon rounded-pill grid size-13 shrink-0 place-items-center">
        <UserRoundIcon size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-lg text-text font-extrabold tracking-tight">
          로그인이 필요해요
        </span>
        <span className="text-label text-text-3">
          로그인하고 응원팀 소식을 받아보세요
        </span>
      </span>
      <ChevronMiniIcon className="text-text-4 shrink-0" />
    </Link>
  );
}
