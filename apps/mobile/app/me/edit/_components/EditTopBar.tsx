import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";

/**
 * 프로필 수정 상단바 — 뒤로가기 + 중앙 정렬 타이틀.
 *
 * 뒤로가기는 진입 경로(마이페이지)로 되돌아간다.
 */
export function EditTopBar() {
  return (
    <TopBarShell
      className="border-border bg-nav/90 border-b backdrop-blur-md"
      innerClassName="relative"
    >
      <BackButton href="/me" />
      <h1 className="text-title text-text pointer-events-none absolute inset-x-0 text-center font-extrabold">
        프로필 수정
      </h1>
    </TopBarShell>
  );
}
