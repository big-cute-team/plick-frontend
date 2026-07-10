import { BackButton } from "@/_components/BackButton";

/**
 * 프로필 수정 상단바 — 뒤로가기 + 중앙 정렬 타이틀.
 *
 * TopBar와 동일하게 pt에 `safe-area-inset-top`을 더해 노치 아래로 내려온다.
 * 뒤로가기는 진입 경로(마이페이지)로 되돌아간다.
 */
export function EditTopBar() {
  return (
    <header
      className="border-border bg-nav/90 shrink-0 border-b backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="px-edge relative flex h-13 items-center">
        <BackButton href="/me" />
        <h1 className="text-title text-text pointer-events-none absolute inset-x-0 text-center font-extrabold">
          프로필 수정
        </h1>
      </div>
    </header>
  );
}
