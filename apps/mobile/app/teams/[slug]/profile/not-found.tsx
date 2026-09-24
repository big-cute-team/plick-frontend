import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 팀 없음 화면 (KAN-500). 레지스트리에 없는 slug와 BE 404 `TEAM_NOT_FOUND`를
 * 페이지가 `notFound()`로 보내면 Next가 세그먼트를 이 화면으로 대체한다.
 */
export default function TeamProfileNotFound() {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2">
          <p className="text-profile tracking-title text-text-strong font-black">
            팀을 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            해축이모가 다루는 팀이 아니거나 주소가 잘못됐어요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/">홈으로</PrimaryButton>
        </div>
      </main>
    </AppShell>
  );
}
