import type { Metadata } from "next";
import { LiveIcon } from "@plick/ui/icons";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 준비 중 페이지라 색인 신호를 보내지 않는다 — 콘텐츠가 생기면
 * 기사·토론 리스트처럼 description·canonical·모바일 alternate를 붙인다.
 */
export const metadata: Metadata = {
  title: "LIVE",
  robots: { index: false },
};

/**
 * 데스크톱 LIVE 페이지 (KAN-435) — 라이브 스코어가 들어올 예정이고 지금은
 * 준비 중 안내만 그린다. 뼈대는 토론 리스트와 같은 GNB + 중앙 단일 컬럼이다.
 */
export default function LivePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-read px-gutter mx-auto w-full pb-22">
          <header className="pt-7 pb-4.5">
            <h1 className="text-hero text-text tracking-heading font-extrabold">
              LIVE
            </h1>
            <p className="text-body text-text-3 mt-1.5 font-semibold">
              프리미어리그 경기 스코어를 실시간으로 보여드릴 거예요
            </p>
          </header>
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <span className="bg-elevate text-text-3 grid size-14 place-items-center rounded-full">
              <LiveIcon size={26} />
            </span>
            <p className="text-body text-text-4">
              라이브 스코어를 준비하고 있어요. 조금만 기다려 주세요.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
