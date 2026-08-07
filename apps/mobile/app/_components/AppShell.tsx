import type { ReactNode } from "react";
import { SwitchToWebBanner } from "./SwitchToWebBanner";

/**
 * 화면 뼈대 — 반응형 전략의 핵심 (ADR 0002 §2).
 *
 * - `h-[100dvh]` — 모바일 브라우저 주소창 변화까지 반영하는 동적 뷰포트 높이(100vh 버그 회피)
 * - `max-w-[480px] mx-auto` — 폴드 펼침·태블릿·데스크톱에선 폰 폭으로 중앙 정렬(양옆은 body의 bg-nav 여백)
 * - `overflow-hidden` — 스크롤은 내부 ScrollArea가 담당해 상/하단 바가 고정된다
 *
 * PC 전환 배너(KAN-379)를 맨 위에 둔다. 셸이 높이를 못박고 있어 `shrink-0`으로
 * 자리를 지키게 하고(안 그러면 눌린다), 그만큼 아래 스크롤 영역이 줄어든다.
 * 넓은 화면에서만 뜨는 배너라 폰에서는 아무 자리도 차지하지 않는다.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bg text-text relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden">
      <SwitchToWebBanner />
      {children}
    </div>
  );
}
