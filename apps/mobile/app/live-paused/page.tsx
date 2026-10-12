import type { Metadata } from "next";
import { AppShell } from "@/_components/AppShell";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";

export const metadata: Metadata = {
  title: "LIVE 준비 중",
};

/**
 * 라이브 스코어 준비중 화면 (KAN-644). 축구 데이터 상류가 복구될 때까지 `proxy.ts`가
 * LIVE 목록, 경기 상세, 순위, 팀·선수 프로필을 이 화면으로 rewrite한다. 주소는 원래
 * 경로 그대로라 LIVE 탭이 켜진 채 보인다. 판정과 깃발은 `@plick/domain/live-pause`.
 * 톤은 전역 404와 같다.
 */
export default function LivePausedPage() {
  return (
    <AppShell>
      <TopBar />
      <main className="px-edge flex flex-1 flex-col items-center justify-center gap-7">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-micro tracking-label text-accent font-black">
            LIVE
          </p>
          <p className="text-profile tracking-title text-text-strong font-black">
            경기 정보를 준비 중이에요
          </p>
          <p className="text-body text-text-3">
            더 나은 모습으로 곧 다시 열게요
          </p>
        </div>
        <div className="w-full max-w-60">
          <PrimaryButton href="/">홈으로</PrimaryButton>
        </div>
      </main>
      <TabBar />
    </AppShell>
  );
}
