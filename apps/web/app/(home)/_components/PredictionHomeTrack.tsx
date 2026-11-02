"use client";

import Link from "next/link";
import {
  matchPredictionPath,
  predictionRankLabel,
  type PredictionHomeCard as PredictionHomeCardData,
} from "@plick/domain/prediction";
import { PredictionHomeCard } from "@plick/ui/PredictionHomeCard";
import { useAuth } from "@/_components/AuthProvider";
import {
  PREDICTION_HOME_EMPTY,
  PREDICTION_HOME_ERROR,
} from "@/_constants/predictions";
import { useMyPredictionStats } from "@/_hooks/useMyPredictionStats";
import { usePredictionHome } from "@/_hooks/usePredictionHome";
import { PredictionCardsSkeleton } from "./PredictionSectionSkeleton";

/**
 * 홈 승부예측 제목 줄과 카드 한 줄 (KAN-700, 시안 가이드 §5.2). `lg`부터 카드 세 장이 한 화면이고
 * 간격 20px, 넘치면 가로 스냅 스크롤이다. 핫이슈 캐러셀은 `sm`부터 세 장인데 이 카드는 팀 줄과 3분할
 * 바가 있어 좁으면 글자가 다 잘린다. `sm`까지는 두 장, 그 아래는 한 장 반이 보여 손으로 민다. 순서는
 * 서버가 준 그대로다(마이팀 먼저, 킥오프 순).
 *
 * 카드 어디를 눌러도 그 경기 예측 탭(`?tab=prediction`)으로 간다. 홈에서 바로 작성하지 않는다(가이드
 * §5.2). 티켓은 "픽 버튼을 누르면 작성 시트가 그 픽을 고른 상태로 열림"이라 했지만 시안이 카드에
 * 픽 버튼을 두지 않아 시안을 따랐다.
 *
 * 제목 오른쪽 내 순위는 소셜 계정일 때만 받아 `128위`로 적는다. 랭킹 화면(KAN-701)이 생기면 링크로
 * 바꾸고 비로그인에도 `랭킹`을 둔다.
 *
 * @param initial 서버가 받아 둔 카드 목록. 못 받았으면 undefined
 */
export function PredictionHomeTrack({
  initial,
}: {
  initial: PredictionHomeCardData[] | undefined;
}) {
  const { data: cards, isError } = usePredictionHome(initial);
  const { isLoggedIn, isGuest } = useAuth();
  const { data: stats } = useMyPredictionStats(isLoggedIn && !isGuest);
  const rank =
    isLoggedIn && !isGuest && stats ? predictionRankLabel(stats) : null;

  return (
    <section className="pb-8.5">
      <div className="flex items-baseline gap-2.5 pb-2.75">
        <h2 className="text-body-lg text-text-strong font-black tracking-tight">
          승부예측
        </h2>
        <div className="flex-1" />
        {rank && (
          <span className="text-body text-accent font-bold tabular-nums">
            {rank}
          </span>
        )}
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
              className="w-2/3 shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
            >
              <Link
                href={matchPredictionPath(card.matchId)}
                className="focus-visible:outline-accent block transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <PredictionHomeCard card={card} size="lg" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
