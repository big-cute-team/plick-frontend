import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";

/**
 * 개인정보처리방침 상단바 — 뒤로가기 + 중앙 정렬 타이틀.
 *
 * 스토어 심사원처럼 URL로 직접 진입하는 경우가 있어 뒤로가기는 홈으로 보낸다.
 */
export function PrivacyTopBar() {
  return (
    <TopBarShell
      className="border-border bg-nav/90 border-b backdrop-blur-md"
      innerClassName="relative"
    >
      <BackButton href="/" />
      <h1 className="text-title text-text pointer-events-none absolute inset-x-0 text-center font-extrabold">
        개인정보처리방침
      </h1>
    </TopBarShell>
  );
}
