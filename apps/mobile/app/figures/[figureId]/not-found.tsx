import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 인물 없음 화면 (KAN-500). BE 404 `FIGURE_NOT_FOUND`(없는 id와 운영자가 내린
 * 인물 둘 다)와 정수가 아닌 id의 400을 페이지가 `notFound()`로 보내면 Next가
 * 세그먼트를 이 화면으로 대체한다. 기사 없음 화면과 같은 구성이다.
 */
export default function FigureNotFound() {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2">
          <p className="text-profile tracking-title text-text-strong font-black">
            인물을 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            등록되지 않았거나 내려간 인물이에요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/">홈으로</PrimaryButton>
        </div>
      </main>
    </AppShell>
  );
}
