import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";

/**
 * 경기 상세·스쿼드 상단바 — 뒤로가기 + 가운데 제목(피그마 L5~L9의
 * "프리미어리그 · 4R", L11의 "선수단"). 목록·순위 어느 쪽에서든 들어오므로
 * 뒤로가기는 히스토리 back이고 딥링크 폴백은 목록이다(KAN-386 규약).
 */
export function MatchTopBar({ title }: { title: string }) {
  return (
    <TopBarShell
      className="border-border bg-nav/90 border-b backdrop-blur-md"
      innerClassName="relative justify-center"
    >
      <span className="absolute left-3">
        <BackButton href="/live" behavior="back" />
      </span>
      <h1 className="text-body-lg text-text max-w-[70%] truncate font-bold">
        {title}
      </h1>
    </TopBarShell>
  );
}
