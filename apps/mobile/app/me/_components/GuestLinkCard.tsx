import Link from "next/link";
import { guestLinkNotice } from "@plick/domain/format";
import { ChevronMiniIcon, UserRoundIcon } from "@plick/ui/icons";

/**
 * 게스트 상태의 MY 상단 — 프로필 대신 소셜 연동을 안내하는 카드 (KAN-514).
 *
 * `LoginPromptCard`와 같은 섀시·간격을 쓰되 문구가 다르다. 비로그인에게 하는 말("로그인이
 * 필요해요")과 게스트에게 하는 말은 전제가 다르기 때문이다 — 게스트는 이미 기록을 쌓고
 * 있고, 연동은 그 기록을 잃지 않으려고 하는 일이다. 마감을 문구에 박아 언제까지 해야
 * 하는지도 같이 알린다.
 *
 * 탭하면 로그인 화면으로 간다. 게스트 세션이면 그 화면이 연동 화면으로 열린다.
 *
 * @param guestExpiresAt 게스트 마감 시각. 쿠키에서 읽으므로 없을 수 있다 —
 *   그때는 날짜 없는 14일 안내로 떨어진다
 */
export function GuestLinkCard({
  guestExpiresAt,
}: {
  guestExpiresAt: string | null;
}) {
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
          계정을 연동해 주세요
        </span>
        <span className="text-label text-text-3">
          {guestLinkNotice(guestExpiresAt)}
        </span>
      </span>
      <ChevronMiniIcon className="text-text-4 shrink-0" />
    </Link>
  );
}
