import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";

/**
 * 활동 화면 상단바 (KAN-495). 뒤로가기 + 중앙 정렬 타이틀로 `BlockedTopBar`와
 * 같은 모양이다. 뒤로가기는 진입 경로(마이페이지)로 되돌아간다.
 */
export function ActivityTopBar() {
  return (
    <TopBarShell
      className="border-border bg-nav/90 border-b backdrop-blur-md"
      innerClassName="relative"
    >
      <BackButton href="/me" />
      <h1 className="text-title text-text pointer-events-none absolute inset-x-0 text-center font-extrabold">
        내 활동
      </h1>
    </TopBarShell>
  );
}
