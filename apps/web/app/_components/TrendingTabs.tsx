"use client";

import { useState } from "react";
import { formatRelativeTime } from "@plick/domain/format";
import type { TrendRanking, TrendType } from "@plick/domain/types";
import { TrendingRow } from "@/_components/TrendingRow";
import { TREND_TABS } from "@/_constants/trends";

/**
 * 급상승 랭킹의 구단·선수 탭과 목록 (KAN-501).
 *
 * 두 랭킹은 서버가 한 번에 받아 내려준다 — 탭을 바꿔도 요청이 나가지 않고
 * 자리만 바뀐다. 값이 10분마다 갱신되는 배치 결과라 탭 전환마다 부를 이유가
 * 없고, 사이드바에서 클릭 때마다 스피너가 도는 것보다 이 편이 조용하다.
 *
 * 탭마다 로드 결과가 따로라 빈 상태·실패 문구도 탭 안에 그린다. 한쪽이
 * 실패해도 다른 탭은 멀쩡히 보인다.
 *
 * 집계 시각을 목록 아래 한 줄로 단다. "지금 이 시각에만 유효한 정보"라는 게
 * 이 카드의 요점인데 화살표만으로는 그게 안 보인다 — 실사용 트래픽이 붙기
 * 전에는 순위가 잘 안 바뀌어 전 줄이 가로줄인 경우가 흔하다. 서버와 브라우저의
 * '지금'이 달라 상대 시각은 하이드레이션 경고를 억누른다(기사 목록과 같다).
 *
 * @param rankings 탭 타입별 랭킹. 그 탭의 로드가 실패했으면 null이다
 */
export function TrendingTabs({
  rankings,
}: {
  rankings: Record<TrendType, TrendRanking | null>;
}) {
  const [active, setActive] = useState<TrendType>("TEAM");
  const ranking = rankings[active];

  return (
    <>
      <div aria-label="급상승 랭킹 종류" className="flex gap-1.5" role="group">
        {TREND_TABS.map(({ type, label }) => {
          const on = type === active;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(type)}
              className={`rounded-pill text-label focus-visible:outline-accent px-3 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                on
                  ? "bg-accent text-on-accent font-extrabold"
                  : "bg-elevate text-text-3 hover:text-text font-bold"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {ranking === null ? (
        <p className="text-body text-text-4 py-4 text-center">
          급상승 랭킹을 불러오지 못했어요.
        </p>
      ) : ranking.items.length === 0 ? (
        <p className="text-body text-text-4 py-4 text-center">
          아직 집계된 순위가 없어요.
        </p>
      ) : (
        <>
          <ol className="pt-1">
            {ranking.items.map((item) => (
              <TrendingRow key={item.entityId} item={item} type={active} />
            ))}
          </ol>
          {ranking.collectedAt && (
            <p
              className="text-caption text-text-4 pt-2 text-right"
              suppressHydrationWarning
            >
              {formatRelativeTime(ranking.collectedAt)} 집계
            </p>
          )}
        </>
      )}
    </>
  );
}
