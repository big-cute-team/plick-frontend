import Link from "next/link";
import {
  dateKeyParts,
  dateKeyYearMonth,
  monthLabel,
  shiftDateKey,
} from "@plick/domain/live";

/** 선택한 날 앞뒤로 보여줄 날 수. 시안(KAN-567)의 7일 줄은 가운데가 선택한 날이다. */
const DAYS_AROUND = 3;

/**
 * 경기 목록의 날짜 줄 (KAN-459 → KAN-567 리디자인, 시안 LIVE 747-756행). 선택한 날을
 * 가운데 둔 7일 칸(요일 11/700 + 일 14)이고, 선택한 칸은 강조색 2px 밑줄에 900,
 * 일요일 요일은 빨강이다. 오른쪽 끝에 그 달 라벨을 둔다. 전에는 연월 셀렉터와 한 달
 * 전체 슬라이드 스트립이었는데, 시안대로 7일만 두니 클라 상태(센터링, 드롭다운)가
 * 필요 없어 서버 컴포넌트가 됐다. 다른 달로 가려면 끝 칸을 눌러 하루씩 옮긴다.
 *
 * 모바일 `live/_components/DateStrip`과 같은 URL 규약(`/live?date=`)이다. 오늘은
 * 페이지가 KST로 계산해 넘긴다(하이드레이션 어긋남 방지).
 *
 * @param selected 현재 보고 있는 날짜 키. 줄의 가운데다
 * @param today KST 오늘 날짜 키. 쿼리 없는 `/live`가 가리키는 날이다
 */
export function DateStrip({
  selected,
  today,
}: {
  selected: string;
  today: string;
}) {
  const { year, month } = dateKeyYearMonth(selected);
  const days = Array.from({ length: DAYS_AROUND * 2 + 1 }, (_, i) =>
    shiftDateKey(selected, i - DAYS_AROUND),
  );
  const hrefFor = (dateKey: string) =>
    dateKey === today ? "/live" : `/live?date=${dateKey}`;

  return (
    <div className="border-border mb-1.5 flex items-stretch border-b">
      <div className="no-scrollbar flex min-w-0 overflow-x-auto">
        {days.map((dateKey) => {
          const on = dateKey === selected;
          const { weekday, day } = dateKeyParts(dateKey);
          return (
            <Link
              key={dateKey}
              href={hrefFor(dateKey)}
              aria-current={on ? "date" : undefined}
              className={`hover:bg-elevate-2 focus-visible:outline-accent -mb-px flex shrink-0 flex-col items-center gap-0.75 border-b-2 px-3.75 py-2.25 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                on ? "border-accent" : "border-transparent"
              }`}
            >
              <span
                className={`text-caption font-bold ${
                  weekday === "일"
                    ? "text-danger"
                    : on
                      ? "text-accent"
                      : "text-text-4"
                }`}
              >
                {dateKey === today ? "오늘" : weekday}
              </span>
              <span
                className={`text-body-md ${on ? "text-text-strong font-black" : "text-text-3 font-medium"}`}
              >
                {day}
              </span>
            </Link>
          );
        })}
      </div>
      <span className="text-label text-text-3 ml-auto flex shrink-0 items-center pl-3">
        {monthLabel(year, month)}
      </span>
    </div>
  );
}
