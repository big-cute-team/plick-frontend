import type { Metadata } from "next";
import { LiveIcon } from "@plick/ui/icons";
import { AppShell } from "@/_components/AppShell";
import { TabBar } from "@/_components/TabBar";
import { TopBar } from "@/_components/TopBar";

/**
 * 준비 중 페이지라 색인 신호를 보내지 않는다 — 콘텐츠가 생기면
 * 기사·토론 리스트처럼 description과 canonical을 붙인다.
 */
export const metadata: Metadata = {
  title: "LIVE",
  robots: { index: false },
};

/**
 * LIVE 탭 자리 (KAN-435) — 라이브 스코어가 들어올 예정이고 지금은 준비 중
 * 안내만 그린다. 데이터가 없어 스크롤 영역 없이 남은 높이 가운데에 띄운다.
 */
export default function LivePage() {
  return (
    <AppShell>
      <TopBar />
      <main className="px-edge grid flex-1 place-items-center">
        <div className="flex flex-col items-center gap-3 pb-14 text-center">
          <span className="bg-elevate text-text-3 grid size-14 place-items-center rounded-full">
            <LiveIcon size={26} />
          </span>
          <h1 className="text-title text-text font-extrabold">
            라이브 스코어를 준비하고 있어요
          </h1>
          <p className="text-body text-text-4">
            프리미어리그 경기 스코어를 실시간으로
            <br />
            보여드릴 예정이에요. 조금만 기다려 주세요.
          </p>
        </div>
      </main>
      <TabBar />
    </AppShell>
  );
}
