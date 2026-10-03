import type { ReactNode } from "react";
import { BackButton } from "./BackButton";
import { TopBarShell } from "./TopBarShell";

/**
 * 세부 화면 상단바 (KAN-567) — 뒤로 가기 + 왼쪽 정렬 제목(13.5/700) + 오른쪽 액션.
 * 시안의 기사 세부, 경기 상세, 채팅방, 계정, 차단 목록, 프로필이 전부 이 한 줄이다.
 * 전에는 화면마다 가운데 정렬 제목 상단바가 따로 있었는데(ProfileTopBar·MatchTopBar·
 * EditTopBar 등) 시안이 한 모양이라 하나로 모았다.
 *
 * @param title - 제목. 넘치면 말줄임한다
 * @param backHref - 뒤로 가기 목적지(히스토리가 없을 때의 폴백)
 * @param backBehavior - `"back"`이면 히스토리 back 우선(어디서든 들어오는 화면), 기본은 href 이동
 * @param trailing - 오른쪽 액션(공유·더보기 등). 아이콘 색은 text-3이다
 */
export function SubTopBar({
  title,
  backHref,
  backBehavior = "push",
  trailing,
}: {
  title: string;
  backHref: string;
  backBehavior?: "push" | "back";
  trailing?: ReactNode;
}) {
  return (
    <TopBarShell
      className="border-border border-b"
      innerClassName="gap-3.5 !px-3.5"
    >
      <BackButton href={backHref} behavior={backBehavior} />
      <h1 className="text-body text-text-strong min-w-0 flex-1 truncate font-bold">
        {title}
      </h1>
      {trailing}
    </TopBarShell>
  );
}
