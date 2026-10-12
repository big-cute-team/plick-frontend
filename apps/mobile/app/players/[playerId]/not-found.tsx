import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 선수 없음 화면 (KAN-604). 숫자가 아닌 id와 BE 404(이번 시즌 빅6 소속 기록이 없는 선수)가
 * 여기로 온다. 팀 없음 화면과 같은 구성이다.
 */
export default function PlayerProfileNotFound() {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2">
          <p className="text-profile tracking-title text-text-strong font-black">
            선수를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            프리미어리그 빅6 소속 선수만 프로필이 있어요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/">홈으로</PrimaryButton>
        </div>
      </main>
    </AppShell>
  );
}
