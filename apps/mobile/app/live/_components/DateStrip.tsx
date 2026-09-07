import Link from "next/link";
import { addDaysToDateKey, dateKeyParts } from "@plick/domain/live";
import { MOCK_TODAY } from "@plick/domain/live-mock";

/**
 * 경기 목록의 날짜 스트립 — 기준일 좌우 3일씩 7칸. 날짜는 `/live?date=` 쿼리로
 * 승격돼 있어(ADR 0126) 각 칸이 실제 링크다. 기준일은 쿼리 없이 `/live`로 둬
 * 캐노니컬 URL이 갈라지지 않게 한다.
 *
 * 껍데기 단계라 기준일이 목데이터의 오늘(`MOCK_TODAY`)이다 — 실배선 때 Intl
 * 기반 KST 오늘로 바꾼다(클라 타임존에 기대지 않기).
 *
 * @param selected - 현재 보고 있는 날짜 키(YYYY-MM-DD)
 */
export function DateStrip({ selected }: { selected: string }) {
  const days = Array.from({ length: 7 }, (_, i) =>
    addDaysToDateKey(MOCK_TODAY, i - 3),
  );

  return (
    <div className="px-edge flex gap-1.5 pt-3 pb-1">
      {days.map((dateKey) => {
        const on = dateKey === selected;
        const { weekday, day } = dateKeyParts(dateKey);
        return (
          <Link
            key={dateKey}
            href={dateKey === MOCK_TODAY ? "/live" : `/live?date=${dateKey}`}
            aria-current={on ? "date" : undefined}
            className={`rounded-control flex flex-1 flex-col items-center gap-0.5 py-2 active:opacity-80 ${
              on ? "bg-accent-tint" : ""
            }`}
          >
            <span
              className={`text-micro font-semibold ${on ? "text-accent" : "text-text-4"}`}
            >
              {weekday}
            </span>
            <span
              className={`text-body-lg font-bold ${on ? "text-accent" : "text-text-2"}`}
            >
              {day}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
