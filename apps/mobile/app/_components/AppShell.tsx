import type { ReactNode } from "react";

// 반응형 전략의 핵심.
// - h-[100dvh]: 모바일 브라우저 주소창 변화까지 반영하는 동적 뷰포트 높이 (100vh 버그 회피).
// - max-w-[480px] + mx-auto: 폴드 펼침/태블릿/데스크톱 같은 넓은 화면에선
//   폰 폭으로 가운데 정렬(양옆은 body의 bg-nav 여백) → 어디서도 레이아웃이 안 깨짐.
// - overflow-hidden + 내부 ScrollArea가 스크롤을 담당 → 상/하단 바 고정.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bg text-text relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden">
      {children}
    </div>
  );
}
