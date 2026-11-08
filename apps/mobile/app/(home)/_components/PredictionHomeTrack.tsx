"use client";

import Link from "next/link";
import { useRef } from "react";
import { useOnScreen } from "@plick/core/useOnScreen";
import {
  matchPredictionPath,
  predictionRankLabel,
  type PredictionHomeCard as PredictionHomeCardData,
} from "@plick/domain/prediction";
import { PredictionHomeCard } from "@plick/ui/PredictionHomeCard";
import { ChevronRightIcon } from "@plick/ui/icons";
import { useAuth } from "@/_components/AuthProvider";
import {
  PREDICTION_HOME_EMPTY,
  PREDICTION_HOME_ERROR,
  PREDICTION_RANKING_LINK_LABEL,
} from "@/_constants/predictions";
import { useMyPredictionStats } from "@plick/core/prediction-queries";
import { usePredictionHome } from "@plick/core/prediction-queries";
import { debateTabPath } from "@/_utils/debates";
import { PredictionCardsSkeleton } from "./PredictionSectionSkeleton";

/**
 * 홈 승부예측 제목 줄과 카드 슬라이드 (KAN-700, 시안 가이드 §5.2). 카드 폭은 84%고 가로 스냅이라
 * 다음 카드가 걸쳐 보인다. 좌우 패딩은 `px-edge`를 트랙 안쪽으로 옮겨 카드가 화면 끝까지 흐른다.
 * 순서는 킥오프 순이다. BE는 마이팀 경기를 앞으로 당기는데 그러면 내일 경기가 오늘 경기 앞에 서서 뒤죽박죽으로
 * 보여 fetcher가 다시 세운다(KAN-714). 카드는 시안의 딥 그린 면과 스포트라이트(`tone="accent"`)다.
 *
 * 카드 어디를 눌러도 그 경기 예측 탭(`?tab=prediction`)으로 간다. 홈에서 바로 작성하지 않는다(가이드
 * §5.2). 티켓은 "픽 버튼을 누르면 작성 시트가 그 픽을 고른 상태로 열림"이라 했지만 시안이 카드에
 * 픽 버튼을 두지 않아 시안을 따랐다.
 *
 * 제목 오른쪽은 투표 화면 랭킹 탭(`/debates?tab=rank`, KAN-701)으로 가는 링크다. 소셜 계정이고 순위가
 * 있으면 `128위 >`, 그 밖(비로그인, 게스트, 자격 미달, 못 받음)은 `랭킹 >`이다(시안 가이드 §2). 글자가
 * 작아 세로 패딩으로 터치 목표를 44px로 넓히고 음수 마진으로 제목 줄 높이는 그대로 둔다(시안 그대로).
 *
 * 제목 줄은 KAN-709에서 낮췄다. 섹션 위 여백 20에 제목 15, 아래 11이던 것을 위 13, 제목 14, 아래 7로
 * 줄여 투표 섹션과 함께 첫 화면에서 30px 남짓을 돌려받는다. 제목을 카드 안에 넣는 안은 랭킹 링크가
 * 카드 링크 안에 중첩되어 접었다.
 *
 * @param initial 서버가 받아 둔 카드 목록. 못 받았으면 undefined
 */
export function PredictionHomeTrack({
  initial,
}: {
  initial: PredictionHomeCardData[] | undefined;
}) {
  const ref = useRef<HTMLElement>(null);
  const visible = useOnScreen(ref);
  const { data: cards, isError } = usePredictionHome(initial, visible);
  const { isLoggedIn, isGuest } = useAuth();
  const { data: stats } = useMyPredictionStats(isLoggedIn && !isGuest);
  const rank =
    isLoggedIn && !isGuest && stats
      ? predictionRankLabel(stats)
      : PREDICTION_RANKING_LINK_LABEL;

  return (
    <section ref={ref} aria-label="승부예측" className="px-edge pt-3">
      <div className="flex items-baseline gap-2 pb-1.5">
        <h2 className="text-body-md text-text-strong tracking-section font-black">
          <span aria-hidden>🔥</span> 승부예측
        </h2>
        <div className="flex-1" />
        <Link
          href={debateTabPath("rank")}
          className="text-body text-accent -my-3 flex items-center gap-px py-3 font-bold tabular-nums active:opacity-60"
        >
          {rank}
          <ChevronRightIcon size={14} />
        </Link>
      </div>
      {cards === undefined ? (
        isError ? (
          <p className="text-body text-text-4 py-8 text-center">
            {PREDICTION_HOME_ERROR}
          </p>
        ) : (
          /* 서버가 못 받아 씨앗이 없고 브라우저가 받는 중. 섹션 스켈레톤의 카드 실루엣을 그대로 둔다 */
          <PredictionCardsSkeleton />
        )
      ) : cards.length === 0 ? (
        <p className="text-body text-text-4 py-8 text-center">
          {PREDICTION_HOME_EMPTY}
        </p>
      ) : (
        <ul className="no-scrollbar -mx-edge px-edge scroll-px-edge flex snap-x snap-mandatory gap-2.5 overflow-x-auto">
          {cards.map((card) => (
            <li key={card.matchId} className="flex w-[84%] shrink-0 snap-start">
              <Link
                href={matchPredictionPath(card.matchId)}
                className="focus-visible:outline-accent flex min-w-0 flex-1 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 active:scale-[0.99] motion-reduce:transform-none"
              >
                <PredictionHomeCard card={card} tone="accent" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
