"use client";

import Link from "next/link";
import {
  buildMyPredictionStatCells,
  myPredictionStatsCaption,
} from "@plick/domain/prediction";
import { useMyPredictionStats } from "@plick/core/prediction-queries";
import { RANKINGS_PATH } from "@/_constants/app";

/**
 * MY의 승부예측 기록 띠 (KAN-702, 시안 가이드 §5.8, 홈 v2 시안 650-657행). 적중률, 적중 `7/12`, 시즌 순위
 * `128위`(강조색), 예측 수 네 칸을 `elevate` 면 각진 띠에 나란히 두고(라벨 위, 값 아래 26px 900) 어디를
 * 눌러도 랭킹 페이지(`/rankings`)로 간다. 비로그인과 게스트는 페이지가 먼저 걸러 여기까지 오지 않는다.
 *
 * 값은 `GET /me/prediction-stats`를 브라우저에서 받아 적는다(홈 제목 줄과 같은 쿼리라 한 번만 간다).
 * 유저별 값이라 서버 씨앗이 없고, 받기 전이나 실패면 라벨만 두고 값은 `-`라 띠 높이가 흔들리지
 * 않는다. 티켓의 연속·최고 연속·통산 기록은 띠 아래 보조 한 줄이다. `sm` 아래에서는 네 칸을 2x2로
 * 접고 값 글자를 줄인다. 한 줄에 두면 330px에서 `128위`와 `14`가 붙는다(웹 최소 기준선).
 */
export function MePredictionStats() {
  const { data: stats } = useMyPredictionStats(true);
  const cells = buildMyPredictionStatCells(stats ?? null);

  return (
    <section className="pb-6">
      <Link
        href={RANKINGS_PATH}
        aria-label="예측 랭킹"
        className="bg-elevate hover:bg-elevate-2 focus-visible:outline-accent grid grid-cols-2 gap-y-4 py-4.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:grid-cols-4 sm:gap-y-0"
      >
        {cells.map((cell) => (
          <span
            key={cell.key}
            className="flex min-w-0 flex-col gap-1.75 px-3 sm:px-5.5"
          >
            <span className="text-label text-text-3 whitespace-nowrap">
              {cell.label}
            </span>
            <span
              className={`text-section sm:text-headline tracking-title leading-none font-black whitespace-nowrap tabular-nums ${
                cell.accent && cell.value !== "-"
                  ? "text-accent"
                  : "text-text-strong"
              }`}
            >
              {cell.value}
            </span>
          </span>
        ))}
      </Link>
      {stats && (
        <p className="text-label text-text-3 pt-2 tabular-nums">
          {myPredictionStatsCaption(stats)}
        </p>
      )}
    </section>
  );
}
