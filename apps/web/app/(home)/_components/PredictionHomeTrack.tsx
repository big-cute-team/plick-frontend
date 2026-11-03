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
 * 홈 승부예측 제목 줄과 카드 한 줄 (KAN-700, 시안 가이드 §5.2). `lg`부터 카드 세 장이 한 화면이고
 * 간격 20px, 넘치면 가로 스냅 스크롤이다. 핫이슈 캐러셀은 `sm`부터 세 장인데 이 카드는 팀 줄과 3분할
 * 바가 있어 좁으면 글자가 다 잘린다. `sm`까지는 두 장, 그 아래는 한 장 반이 보여 손으로 민다. 순서는
 * 킥오프 순이다. BE는 마이팀 경기를 앞으로 당기는데 fetcher가 킥오프로 다시 세운다(KAN-714). 카드는
 * 시안의 딥 그린 면과 스포트라이트(`tone="accent"`)다.
 *
 * 카드 어디를 눌러도 그 경기 예측 탭(`?tab=prediction`)으로 간다. 홈에서 바로 작성하지 않는다(가이드
 * §5.2). 티켓은 "픽 버튼을 누르면 작성 시트가 그 픽을 고른 상태로 열림"이라 했지만 시안이 카드에
 * 픽 버튼을 두지 않아 시안을 따랐다.
 *
 * 제목 오른쪽은 랭킹 탭(`/debates?tab=rank`, KAN-701)으로 가는 링크다. 소셜 계정이고 순위가 있으면
 * `128위 >`, 그 밖(비로그인, 게스트, 자격 미달, 못 받음)은 `랭킹 >`이다(시안 가이드 §2).
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
    <section ref={ref} aria-label="승부예측" className="pb-8.5">
      <div className="flex items-baseline gap-2.5 pb-2.75">
        <h2 className="text-body-lg text-text-strong font-black tracking-tight">
          승부예측
        </h2>
        <div className="flex-1" />
        <Link
          href={debateTabPath("rank")}
          className="text-body text-accent hover:text-accent-hover focus-visible:outline-accent flex items-center gap-px font-bold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2"
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
        <ul className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1">
          {cards.map((card) => (
            <li
              key={card.matchId}
              className={`flex w-[88%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] ${cards.length === 2 ? "lg:w-[calc((100%-1.25rem)/2)]" : "lg:w-[calc((100%-2.5rem)/3)]"}`}
            >
              <Link
                href={matchPredictionPath(card.matchId)}
                className="focus-visible:outline-accent flex min-w-0 flex-1 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none"
              >
                <PredictionHomeCard card={card} size="lg" tone="accent" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
