import { ChevronMiniIcon, UserRoundIcon } from "@plick/ui/icons";

/**
 * MY 프로필 카드 — 아바타·닉네임·핸들 + 프로필 수정 진입 화살표. 웹·모바일 공용 (`@plick/ui`).
 *
 * 앱마다 다른 유저 타입에 묶이지 않도록 표시에 필요한 값만 받는다.
 * `@plick/ui`는 프레임워크 중립을 유지하므로 next/link 대신 순수 `<a>`로 이동한다.
 * 데스크톱 포인터를 위해 hover·focus-visible을 둔다.
 *
 * @param nickname - 표시 닉네임
 * @param handle - 닉네임 아래 보조 줄 (핸들·이메일 등). 실계약에 없을 수 있어
 *   optional — 없으면 줄 자체를 그리지 않는다(KAN-319).
 * @param href - 탭 시 이동할 프로필 수정 경로
 */
export function ProfileCard({
  nickname,
  handle,
  href,
}: {
  nickname: string;
  handle?: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="bg-elevate-2 border-border rounded-card gap-gap-lg focus-visible:outline-accent hover:border-border-strong flex w-full items-center border p-4.25 text-left focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
    >
      <span className="bg-avatar text-icon rounded-pill grid size-13 shrink-0 place-items-center">
        <UserRoundIcon size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-lg text-text font-extrabold tracking-tight">
          {nickname}
        </span>
        {handle && <span className="text-label text-text-3">{handle}</span>}
      </span>
      <ChevronMiniIcon className="text-text-4 shrink-0" />
    </a>
  );
}
