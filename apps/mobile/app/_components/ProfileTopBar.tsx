import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";

/**
 * 팀·인물 프로필 상단바 (KAN-500) — 뒤로가기 + 가운데 제목. 라이브의
 * `MatchTopBar`와 같은 구성인데 딥링크 폴백이 화면마다 달라 따로 둔다.
 *
 * 칩·카드 어디서든 들어오므로 뒤로가기는 히스토리 back이다(KAN-386 규약).
 * 새 탭·딥링크로 열려 되돌아갈 곳이 없으면 `fallbackHref`로 간다.
 *
 * @param title - 가운데 제목 (팀명·인물명)
 * @param fallbackHref - 히스토리가 없을 때의 뒤로가기 목적지
 */
export function ProfileTopBar({
  title,
  fallbackHref,
}: {
  title: string;
  fallbackHref: string;
}) {
  return (
    <TopBarShell
      className="border-border bg-nav/90 border-b backdrop-blur-md"
      innerClassName="relative justify-center"
    >
      <span className="absolute left-3">
        <BackButton href={fallbackHref} behavior="back" />
      </span>
      <h1 className="text-body-lg text-text max-w-[70%] truncate font-bold">
        {title}
      </h1>
    </TopBarShell>
  );
}
