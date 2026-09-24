"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dateKeyParts, dateKeyYearMonth } from "@plick/domain/live";
import { ChevronDownIcon, ChevronRightIcon } from "@plick/ui/icons";
import { dateStripKeys, dateStripLabel } from "@/_utils/live";

/**
 * 경기 목록의 날짜 줄 (KAN-567 시안). 위에 지금 보는 날짜 라벨(12px 회색), 아래에
 * 선택일을 가운데 둔 7칸 날짜 줄이다. 칸은 요일 11/700 위에 일 15이고, 선택 칸은
 * 아래 2px 강조색 밑줄(시안의 inset box-shadow를 border-b로 옮겼다)에 일 900이다.
 * 일요일 요일은 빨강이고, 오늘 칸은 요일 대신 "오늘"을 적어 어디쯤인지 알린다.
 * 날짜는 `/live?date=` 쿼리 승격 규약이고 오늘은 쿼리 없는 `/live`다.
 *
 * 전에는 한 달 전체를 가로 스크롤 스트립에 담고 선택 칸을 가운데로 당기는 계산
 * (KAN-459)이 있었다. 칸이 늘 7개고 선택일이 늘 가운데라 그 계산은 지웠다. 좌우
 * 스와이프로 하루씩 옮기면 줄 전체가 한 칸씩 따라 흐른다.
 *
 * 달을 건너뛰는 길은 남겼다. 라벨을 누르면 연·월 목록이 열리고 고른 달의 1일
 * (오늘이 속한 달이면 오늘)로 간다. 시안에는 없는 동작이지만 하루씩만 넘기면
 * 지난 라운드를 찾기 어렵다. 그 드롭다운 상태 때문에 클라 컴포넌트다.
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
      <div className="border-border grid grid-cols-7 border-b">
        {dateStripKeys(selected).map((dateKey) => {
          const on = dateKey === selected;
          const { weekday, day } = dateKeyParts(dateKey);
          const sunday = weekday === "일";
          return (
            <Link
              key={dateKey}
              href={hrefFor(dateKey)}
              aria-current={on ? "date" : undefined}
              className={`-mb-px flex flex-col items-center gap-0.75 border-b-2 pt-2 pb-2.25 active:opacity-70 ${
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
