import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";

/**
 * 문서 페이지 상단바 — 뒤로가기 + 중앙 정렬 타이틀.
 *
 * 개인정보처리방침·이용약관·FAQ가 같이 쓴다. 스토어 심사원처럼 URL로 직접
 * 진입하는 경우가 있어 뒤로가기는 홈으로 보낸다.
 *
 * @param title - 중앙에 표시할 페이지 제목
 */
export function DocTopBar({ title }: { title: string }) {
  return (
    <TopBarShell
      className="border-border bg-nav/90 border-b backdrop-blur-md"
      innerClassName="relative"
    >
      <BackButton href="/" />
      <h1 className="text-title text-text pointer-events-none absolute inset-x-0 text-center font-extrabold">
        {title}
      </h1>
    </TopBarShell>
  );
}
