import Link from "next/link";
import type { Team } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { UserRoundIcon } from "@plick/ui/icons";

/**
 * MY 프로필+응원팀 통합 카드 — 응원팀 로고(없으면 기본 아바타)·닉네임·팀 배지와
 * 우측 "수정하기"로 프로필 수정에 진입한다. 웹 `ProfileCard`(@plick/ui)와 레이아웃이
 * 갈려(팀 로고·배지·텍스트 진입) 모바일 전용으로 둔다.
 *
 * @param nickname - 표시 닉네임
 * @param team - 응원팀 레지스트리 항목. 미설정이면 null
 */
export function ProfileTeamCard({
  nickname,
  team,
}: {
  nickname: string;
  team: Team | null;
}) {
  return (
    <Link
      href="/me/edit"
      className="bg-elevate-2 border-border rounded-card gap-gap-lg flex w-full items-center border p-4.25 text-left active:opacity-60"
    >
      <span className="bg-avatar text-icon rounded-pill grid size-13 shrink-0 place-items-center">
        {team ? (
          <TeamCrest team={team} size={34} />
        ) : (
          <UserRoundIcon size={26} />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-body-lg text-text font-extrabold tracking-tight">
          {nickname}
        </span>
        {team ? (
          <span className="bg-accent-tint text-accent rounded-pill text-caption self-start px-2.5 py-1 font-extrabold">
            {team.name}
          </span>
        ) : (
          <span className="text-label text-text-4">응원팀 미설정</span>
        )}
      </span>
      <span className="text-label text-text-3 shrink-0 font-semibold">
        수정하기
      </span>
    </Link>
  );
}
