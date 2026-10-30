import type { ReactNode } from "react";

/**
 * 프로필 탭 본문 한 칸 (KAN-683). 팀·선수 프로필이 탭마다 하나씩 둔다.
 *
 * 비활성 탭도 DOM에 그리고 `hidden` 속성으로만 감춘다. 전에는 `tab === key && …`로 활성
 * 탭만 그려서, 선수단 명단(선수 페이지 링크 20여 개)과 기록이 서버 HTML에 없었다. 탭은 클라
 * state라 크롤러는 개요 탭만 봤고, 애드센스 심사가 "콘텐츠가 없다"고 본 이유 중 하나였다.
 * 구글은 모바일 우선 색인에서 탭·아코디언 안의 숨은 본문도 읽는다. `hidden` 속성은 Tailwind
 * preflight가 `display: none !important`로 못 박아 `flex` 같은 레이아웃 유틸을 이긴다.
 *
 * @param on 지금 보는 탭인지
 * @param id 패널 id. 탭 버튼의 `aria-controls`가 가리킨다
 * @param labelledBy 이 패널을 여는 탭 버튼의 id. 패널이 탭 수만큼 생겨 스크린리더가 짝을 알아야 한다
 * @param className 보일 때의 레이아웃 유틸
 * @param children 탭 본문
 */
export function TabPanel({
  on,
  id,
  labelledBy,
  className,
  children,
}: {
  on: boolean;
  id?: string;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={labelledBy}
      hidden={!on}
      className={className}
    >
      {children}
    </div>
  );
}
