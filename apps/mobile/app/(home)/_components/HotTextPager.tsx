"use client";

import { Children, useState, type ReactNode, type UIEvent } from "react";

/**
 * 사진 없는 핫이슈를 한 장씩 가로로 넘기는 페이저 (KAN-515).
 *
 * 전에는 세 장을 세로로 쌓았는데, 사진 캐러셀과 "지금 올라온 소식" 사이가 길어져
 * 소식 리스트가 첫 화면 밖으로 밀렸다. 한 장만 보이게 접고 스와이프로 넘긴다.
 *
 * `HotCarousel`을 쓰지 않은 이유는 그쪽이 사진 카드 전제라서다. 핸들이 카드 가운데에
 * 얹히는데 텍스트 카드에서는 글자를 가리고, 무한 루프 복제와 자동 넘김도 세 장짜리
 * 텍스트에는 필요 없다. 여기는 브라우저 기본 스크롤 스냅만 쓰고 JS는 점 표시용
 * 현재 칸만 계산한다.
 *
 * 카드 높이는 요약 유무로 달라질 수 있어 트랙을 `items-stretch`로 두고 카드가
 * `h-full`로 칸을 채운다. 넘기는 동안 카드 키가 들쭉날쭉하지 않다.
 *
 * `snap-x-carousel`·`no-scrollbar`는 앱 globals.css의 커스텀 클래스다.
 *
 * @param children - 카드 목록. 서버에서 그린 엘리먼트를 그대로 받는다.
 */
export function HotTextPager({ children }: { children: ReactNode }) {
  const cards = Children.toArray(children);
  const [active, setActive] = useState(0);

  /**
   * 칸 폭이 트랙 폭과 같아 scrollLeft를 폭으로 나눈 반올림이 곧 현재 칸이다.
   *
   * @param e - 트랙 scroll 이벤트
   */
  function onScroll(e: UIEvent<HTMLUListElement>) {
    const el = e.currentTarget;
    if (el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="pt-2">
      <ul
        onScroll={onScroll}
        className="snap-x-carousel no-scrollbar flex items-stretch overflow-x-auto"
      >
        {cards.map((card, i) => (
          <li key={i} className="px-edge w-full shrink-0 snap-center">
            {card}
          </li>
        ))}
      </ul>
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          {cards.map((_, i) => (
            <span
              key={i}
              className={
                i === active
                  ? "bg-accent rounded-pill h-1 w-3"
                  : "bg-text-4/40 rounded-pill size-1"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
