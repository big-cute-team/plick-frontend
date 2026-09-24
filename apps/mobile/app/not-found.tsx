import { Logo } from "@plick/ui/Logo";
import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";

/**
 * 전역 404 화면. 라우트에 매칭되지 않는 모든 주소가 온다.
 * Next 기본 404 대신 브랜드(로고·토큰) 있는 화면을 보여 준다. 라이트 톤은 KAN-567.
 * 기사 딥링크 404는 `articles/[postId]/not-found.tsx`가 따로 맡는다.
 */
export default function NotFound() {
  return (
    <AppShell>
      <main className="px-edge flex h-full flex-col items-center justify-center gap-7">
        <Logo size={27} />
        <div className="flex flex-col items-center gap-2">
          <p className="text-micro tracking-label text-accent font-black">
            404
          </p>
          <p className="text-profile tracking-title text-text-strong font-black">
            페이지를 찾을 수 없어요
          </p>
          <p className="text-body text-text-3">
            주소가 잘못됐거나 사라진 페이지예요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/">홈으로</PrimaryButton>
        </div>
      </main>
    </AppShell>
  );
}
