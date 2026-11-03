import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 이슈 없음 화면 (KAN-709, 웹 KAN-523과 같은 동선). 없거나 어드민이 숨긴 이슈 딥링크의 정상
 * 경로다. BE 404 `STORY_NOT_FOUND`와 정수가 아닌 id의 400을 페이지가 `notFound()`로 보내면
 * Next가 세그먼트를 이 화면으로 대체한다. 모양은 인물 없음 화면과 같다.
 */
export default function StoryNotFound() {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2">
          <p className="text-profile tracking-title text-text-strong font-black">
            이슈를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">없어졌거나 내려간 이슈예요</p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/">홈으로</PrimaryButton>
        </div>
      </main>
    </AppShell>
  );
}
