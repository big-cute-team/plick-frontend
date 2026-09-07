import Link from "next/link";
import { addDaysToDateKey, dateKeyParts } from "@plick/domain/live";
import { MOCK_TODAY } from "@plick/domain/live-mock";

/**
 * 경기 목록의 날짜 스트립(피그마 LW1) — 기준일 좌우 3일씩 7칸 링크.
 * 날짜는 `/live?date=` 쿼리 승격 규약(모바일과 동일)이고, 기준일은 쿼리 없는
 * `/live`다. 껍데기 단계 기준일은 `MOCK_TODAY` — 실배선 때 KST 오늘로 바꾼다.
 */
export function DateStrip({ selected }: { selected: string }) {
  const days = Array.from({ length: 7 }, (_, i) =>
    addDaysToDateKey(MOCK_TODAY, i - 3),
  );

  return (
    <div className="flex gap-1.5 pb-1">
      {days.map((dateKey) => {
        const on = dateKey === selected;
        const { weekday, day } = dateKeyParts(dateKey);
        return (
          <Link
            key={dateKey}
            href={dateKey === MOCK_TODAY ? "/live" : `/live?date=${dateKey}`}
            aria-current={on ? "date" : undefined}
            className={`rounded-control focus-visible:outline-accent flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors focus-visible:outline-2 ${
              on ? "bg-accent-tint" : "hover:bg-elevate"
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
