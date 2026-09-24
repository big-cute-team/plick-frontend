import { Suspense } from "react";
import { CHAT_ENABLED } from "@plick/core/chat";
import { ChatRail } from "@/_components/ChatRail";
import { TrendingRail } from "@/_components/TrendingRail";
import { TrendingRailSkeleton } from "@/_components/TrendingRailSkeleton";

/**
 * 우측 레일 (KAN-567, 시안 "우측 레일") — 실시간 급상승 상자와 채팅방 상자를
 * 세로로 쌓는다. 홈, 기사 목록, 기사 세부, 이슈가 같은 레일이라 한 조각으로
 * 묶었다(전에는 `HomeSidebar`와 `ArticleSidebar`가 각자 급상승 카드를 세웠다).
 * 투표와 프로필 페이지도 이걸 붙인다.
 *
 * 폭은 부모 grid의 둘째 열(288px)이 정하고, `lg` 아래에서는 숨긴다 — 1열로
 * 스택하면 본문 밑에 급상승이 붙는데 그 자리는 푸터가 맡는다. 스크롤하면 상단
 * 바 아래에 붙는다(sticky). `top` 값은 globals.css의 `--site-header-h`에 본문 위 여백
 * (22px)을 더한 것이라 바 높이를 바꾸면 같이 고친다.
 *
 * 급상승은 자기 데이터를 스스로 받는다(KAN-501). 본문보다 늦게 와도 되는 자리라
 * `Suspense`로 감싸 페이지 렌더를 붙잡지 않는다. 채팅방 상자는 통합 채팅방 API가
 * 없어 `CHAT_ENABLED`가 켜질 때까지 그리지 않는다.
 *
 * @param className - 래퍼에 덧붙일 클래스
 */
export function SideRail({ className = "" }: { className?: string }) {
  return (
    <aside
      className={`sticky top-[calc(var(--site-header-h)+22px)] hidden flex-col gap-3.5 self-start lg:flex ${className}`}
    >
      <Suspense fallback={<TrendingRailSkeleton />}>
        <TrendingRail />
      </Suspense>
      {CHAT_ENABLED && <ChatRail />}
    </aside>
  );
}
