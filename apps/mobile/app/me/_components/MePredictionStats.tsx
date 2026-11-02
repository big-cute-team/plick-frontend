"use client";

import Link from "next/link";
import {
  buildMyPredictionStatCells,
  myPredictionStatsCaption,
} from "@plick/domain/prediction";
import { useMyPredictionStats } from "@/_hooks/useMyPredictionStats";
import { debateTabPath } from "@/_utils/debates";

/**
 * MY의 승부예측 기록 상자 (KAN-702, 시안 가이드 §5.8, 앱 v2 시안 1423-1431행). 적중률, 적중 `7/12`,
 * 시즌 순위 `128위`(강조색), 예측 수 네 칸을 `elevate` 면 둥근 상자에 나란히 두고 어디를 눌러도 투표
 * 화면 랭킹 탭으로 간다. 소셜 계정일 때만 그리는 건 호출부(`page.tsx`)가 가른다. 게스트는 예측을 못
 * 하니(연동 안내) 상자가 뜻이 없다.
 *
 * 값은 `GET /me/prediction-stats`를 브라우저에서 받아 적는다(홈 제목 줄, 예측 랭킹 줄과 같은 쿼리라
 * 한 번만 간다). 유저별 값이라 서버 씨앗이 없고, 받기 전이나 실패면 라벨만 두고 값은 `-`라 상자
 * 높이가 흔들리지 않는다. 티켓의 연속·최고 연속·통산 기록은 상자 아래 보조 한 줄이다.
 */
export function MePredictionStats() {
  const { data: stats } = useMyPredictionStats(true);
  const cells = buildMyPredictionStatCells(stats ?? null);

  return (
    <section className="px-edge pb-4">
      <Link
        href={debateTabPath("rank")}
        aria-label="예측 랭킹"
        className="bg-elevate rounded-card grid grid-cols-4 px-1 py-3.5 active:opacity-70"
      >
        {cells.map((cell) => (
          <span
            key={cell.key}
            className="flex min-w-0 flex-col items-center gap-1"
          >
            <span
              className={`text-reel tracking-section font-black tabular-nums ${
                cell.accent && cell.value !== "-"
                  ? "text-accent"
                  : "text-text-strong"
              }`}
            >
              {cell.value}
            </span>
            <span className="text-caption text-text-3">{cell.label}</span>
          </span>
        ))}
      </Link>
      {stats && (
        <p className="text-caption-lg text-text-3 pt-2 text-center tabular-nums">
          {myPredictionStatsCaption(stats)}
        </p>
      )}
    </section>
  );
}
