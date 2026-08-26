import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 릴 없음 화면 — 삭제·미발행 릴 공유 링크의 정상 경로 (KAN-349).
 * BE 404 `ARTICLE_NOT_FOUND`와 정수가 아닌 id의 400을 페이지가 `notFound()`로
 * 보내면 Next가 세그먼트를 이 화면으로 대체한다. 티켓의 안내대로 릴스 피드로
 * 이어 준다.
 */
export default function ReelNotFound() {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-headline text-text font-extrabold">
            릴스를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3 font-semibold">
            삭제됐거나 아직 준비 중인 릴스예요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/reels">릴스 보러 가기</PrimaryButton>
        </div>
      </main>
    </AppShell>
  );
}
