import Link from "next/link";
import { UserRoundIcon } from "@plick/ui/icons";

/**
 * MY 프로필 카드 — 기본 아바타·닉네임과 우측 "수정하기"로 프로필 수정에 진입한다.
 * 응원팀은 바로 아래 `FavoriteTeamsCard`가 목록으로 보여준다. 웹 `ProfileCard`(@plick/ui)와
 * 구성(핸들 줄·화살표)이 갈려 모바일 전용으로 둔다.
 *
 * @param nickname - 표시 닉네임
 */
export function MyProfileCard({ nickname }: { nickname: string }) {
  return (
    <Link
      href="/me/edit"
      className="bg-elevate-2 border-border rounded-card gap-gap-lg flex w-full items-center border p-4.25 text-left active:opacity-60"
    >
      <span className="bg-avatar text-icon rounded-pill grid size-13 shrink-0 place-items-center">
        <UserRoundIcon size={26} />
      </span>
      <span className="text-title text-text min-w-0 flex-1 font-extrabold tracking-tight">
        {nickname}
      </span>
      <span className="text-label text-accent shrink-0 font-semibold">
        수정하기
      </span>
    </Link>
  );
}
