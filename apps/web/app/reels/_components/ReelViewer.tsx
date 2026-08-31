"use client";

import type { ReactNode, Ref } from "react";
import type { ReelCard } from "@plick/domain/types";
import { ReelItem } from "./ReelItem";

/**
 * 릴 세로 스냅 뷰어 — 릴 한 장 = 뷰포트(헤더 제외) 높이, 위아래로 스냅 스크롤.
 *
 * 배경은 페이지 배경 토큰(`bg-bg`) — 바디·세부 패널과 같은 색이라 패널이 열려도 이음새가
 * 없다(라이트·다크 모두). 세부 패널이 열리면 옆에서 폭을 나눠 갖는다(`ReelsWorkspace`가
 * 뷰어·패널을 가로로 배치) — 릴 카드는 `w-auto`라 폭에 맞춰 줄어든다.
 *
 * 데이터·상태는 전부 `ReelsWorkspace`가 들고 있고 여기는 배치만 맡는다.
 *
 * @param reels - 표시할 릴 목록
 * @param onOpenDetail - 제목·댓글 클릭 시 세부 패널을 여는 콜백. 패널이 어떤 릴을
 *   그릴지는 지금 보고 있는 릴로 정해지므로(`useActiveReel`) 인자가 없다
 * @param registerReel - 각 릴 섹션에 달 ref 콜백(`useActiveReel`이 만든다).
 *   인덱스는 `data-reel-index`로 넘긴다
 * @param trailing - 마지막 릴 뒤에 붙는 자리(다음 페이지 로딩·재시도). 없으면 생략
 */
export function ReelViewer({
  reels,
  onOpenDetail,
  registerReel,
  trailing,
}: {
  reels: ReelCard[];
  onOpenDetail: () => void;
  registerReel: Ref<HTMLElement>;
  trailing?: ReactNode;
}) {
  return (
    <main className="bg-bg min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain">
      {reels.map((reel, i) => (
        <section
          key={reel.id}
          ref={registerReel}
          data-reel-index={i}
          className="lg:px-gutter flex h-full snap-start items-center justify-center px-4 py-8 lg:py-10"
        >
          <ReelItem reel={reel} onOpenDetail={onOpenDetail} eager={i === 0} />
        </section>
      ))}

      {trailing && <section className="h-full snap-start">{trailing}</section>}
    </main>
  );
}
