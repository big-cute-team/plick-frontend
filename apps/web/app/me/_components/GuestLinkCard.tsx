import Link from "next/link";
import { guestLinkNotice } from "@plick/domain/format";

/**
 * 게스트 상태의 MY 본문 — 프로필 대신 소셜 연동을 안내한다 (KAN-514).
 *
 * `LoginPromptCard`와 같은 구성인데 문구가 다르다. 비로그인에게 하는 말("로그인이
 * 필요해요")과 게스트에게 하는 말은 전제가 다르기 때문이다. 게스트는 이미 기록을 쌓고
 * 있고, 연동은 그 기록을 잃지 않으려고 하는 일이다. 마감을 문구에 박아 언제까지 해야
 * 하는지도 같이 알린다. 버튼을 누르면 로그인 화면으로 간다. 게스트 세션이면 그 화면이
 * 연동 화면으로 열린다. 시안 웹 규칙대로 테두리 없는 본문이다 (KAN-567).
 *
 * @param guestExpiresAt 게스트 마감 시각. 쿠키에서 읽으므로 없을 수 있다.
 *   그때는 날짜 없는 14일 안내로 떨어진다
 */
export function GuestLinkCard({
  guestExpiresAt,
}: {
  guestExpiresAt: string | null;
}) {
  return (
    <div className="max-w-narrow flex flex-col items-start gap-2">
      <p className="text-section text-text-strong tracking-title font-black">
        계정을 연동해 주세요
      </p>
      <p className="text-body text-text-3">{guestLinkNotice(guestExpiresAt)}</p>
      <Link
        href="/login"
        className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4 flex h-12 w-full max-w-60 items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        계정 연동
      </Link>
    </div>
  );
}
