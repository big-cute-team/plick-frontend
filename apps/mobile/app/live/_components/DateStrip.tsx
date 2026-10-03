"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  dateKeyParts,
  dateKeyYearMonth,
  monthDateKeys,
} from "@plick/domain/live";
import { ChevronDownIcon, ChevronRightIcon } from "@plick/ui/icons";
import { useDateStripScroll } from "@/_hooks/useDateStripScroll";
import { dateStripLabel } from "@/_utils/live";

/**
 * 경기 목록의 날짜 줄 (KAN-567 시안, KAN-569). 위에 지금 보는 날짜 라벨(12px 회색),
 * 아래에 그 달 1일~말일을 담은 가로 스크롤 줄이다. 한 화면에 7칸이 들어가고, 칸은
 * 요일 11/700 위에 일 15이며 선택 칸은 아래 2px 강조색 밑줄에 일 900이다. 일요일
 * 요일은 빨강이고, 오늘 칸은 요일 대신 "오늘"을 적는다. 날짜는 `/live?date=` 쿼리
 * 승격 규약이고 오늘은 쿼리 없는 `/live`다.
 *
 * KAN-567에서 선택일을 늘 가운데 둔 7칸으로 바꿨더니 칸을 누를 때마다 줄 전체가
 * 흘렀다. KAN-569에서 한 달 줄로 되돌려, 처음 들어올 때와 달이 바뀔 때만 가운데로
 * 당기고 그 뒤로는 선택 칸이 가려질 때만 보이는 데까지 민다({@link useDateStripScroll}).
 *
 * 라벨을 누르면 연·월 목록이 열리고 고른 달의 1일(오늘이 속한 달이면 오늘)로 간다.
 * 스크롤 자리 잡기와 드롭다운 상태 때문에 클라 컴포넌트다.
 *
 * 오늘은 페이지가 KST로 계산해 넘긴다. 여기서 다시 계산하면 서버·기기 시각이
 * 자정을 사이에 두고 갈릴 때 하이드레이션이 어긋난다.
 *
 * @param selected 현재 보고 있는 날짜 키(YYYY-MM-DD)
 * @param today KST 오늘 날짜 키. 쿼리 없는 `/live`가 가리키는 날이다
 */
export function DateStrip({
  selected,
  today,
}: {
  selected: string;
  today: string;
}) {
  const router = useRouter();
  const { year, month } = dateKeyYearMonth(selected);
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const stripRef = useRef<HTMLDivElement>(null);
  useDateStripScroll(stripRef, selected, `${year}-${month}`);

  useEffect(() => {
    if (open) setPickerYear(year);
  }, [open, year]);

  const hrefFor = (dateKey: string) =>
    dateKey === today ? "/live" : `/live?date=${dateKey}`;

  /* 오늘이 속한 달을 고르면 오늘로, 다른 달은 1일로 이동한다 */
  const goMonth = (nextYear: number, nextMonth: number) => {
    setOpen(false);
    const todayYm = dateKeyYearMonth(today);
    const target =
      todayYm.year === nextYear && todayYm.month === nextMonth
        ? today
        : `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    router.push(hrefFor(target));
  };

  return (
    <div className="px-edge relative pt-4">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-label text-text-3 mb-1 flex items-center gap-0.5 active:opacity-70"
      >
        {dateStripLabel(selected)}
        <ChevronDownIcon size={12} className="text-text-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20"
          />
          <div
            role="listbox"
            aria-label="연월 선택"
            className="bg-bg border-border rounded-card shadow-dialog absolute top-10 left-4 z-30 w-60 border p-3"
          >
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                aria-label="이전 해"
                onClick={() => setPickerYear((y) => y - 1)}
                className="text-icon grid size-8 rotate-180 place-items-center active:opacity-60"
              >
                <ChevronRightIcon size={14} />
              </button>
              <span className="text-body text-text-strong font-bold">
                {pickerYear}년
              </span>
              <button
                type="button"
                aria-label="다음 해"
                onClick={() => setPickerYear((y) => y + 1)}
                className="text-icon grid size-8 place-items-center active:opacity-60"
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const on = pickerYear === year && m === month;
                return (
                  <button
                    key={m}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => goMonth(pickerYear, m)}
                    className={`rounded-tile text-body py-2 active:opacity-70 ${
                      on
                        ? "bg-chip text-accent font-black"
                        : "text-text-2 font-medium"
                    }`}
                  >
                    {m}월
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      {/* 바닥 선은 border가 아니라 inset 그림자다. 가로 스크롤 상자는 세로도 잘라
          칸 밑줄을 -1px로 선에 겹칠 수 없는데, 그림자는 자식 밑줄이 덮어 그린다 */}
      <div
        ref={stripRef}
        className="no-scrollbar flex overflow-x-auto shadow-[inset_0_-1px_0_var(--color-border)]"
      >
        {monthDateKeys(year, month).map((dateKey) => {
          const on = dateKey === selected;
          const { weekday, day } = dateKeyParts(dateKey);
          const sunday = weekday === "일";
          return (
            <Link
              key={dateKey}
              href={hrefFor(dateKey)}
              aria-current={on ? "date" : undefined}
              className={`flex w-[calc(100%/7)] shrink-0 flex-col items-center gap-0.75 border-b-2 pt-2 pb-2.25 active:opacity-70 ${
                on ? "border-accent" : "border-transparent"
              }`}
            >
              <span
                className={`text-caption font-bold ${
                  sunday ? "text-danger" : on ? "text-accent" : "text-text-4"
                }`}
              >
                {dateKey === today ? "오늘" : weekday}
              </span>
              <span
                className={`text-body-lg ${
                  on ? "text-text-strong font-black" : "text-text-3 font-medium"
                }`}
              >
                {day}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
