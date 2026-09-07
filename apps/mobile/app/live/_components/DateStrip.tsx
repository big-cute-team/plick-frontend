"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  dateKeyParts,
  dateKeyYearMonth,
  monthDateKeys,
  monthLabel,
} from "@plick/domain/live";
import { ChevronMiniIcon } from "@plick/ui/icons";

/**
 * 경기 목록의 날짜 내비게이션 — 위에 연·월 셀렉터(드롭다운), 아래에 그 달
 * 1일~말일 전체를 담은 가로 슬라이드 스트립. 선택한 날(기본은 오늘)이
 * 가운데로 스크롤된다. 날짜는 `/live?date=` 쿼리 승격 규약이고 오늘은 쿼리
 * 없는 `/live`다.
 *
 * 스크롤 센터링·드롭다운 상태 때문에 클라 컴포넌트다. 오늘은 페이지가 KST로
 * 계산해 넘긴다 — 여기서 다시 계산하면 서버·기기 시각이 자정을 사이에 두고
 * 갈릴 때 하이드레이션이 어긋난다.
 *
 * @param selected - 현재 보고 있는 날짜 키(YYYY-MM-DD). 이 값이 스트립의 달을 정한다
 * @param today - KST 오늘 날짜 키. 쿼리 없는 `/live`가 가리키는 날이다
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
  const days = monthDateKeys(year, month);
  const stripRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  /* 선택 날짜를 스트립 가운데로. scrollIntoView는 조상 스크롤까지 건드려
     페이지가 튈 수 있어 직접 계산하고, 하이드레이션 직후 스트립 폭이 0으로
     측정되는 프레임은 rAF로 넘긴다 */
  useEffect(() => {
    let raf = 0;
    const center = () => {
      const strip = stripRef.current;
      const cell = strip?.querySelector<HTMLElement>('[aria-current="date"]');
      if (!strip || !cell) return;
      const stripRect = strip.getBoundingClientRect();
      if (stripRect.width === 0) {
        raf = requestAnimationFrame(center);
        return;
      }
      const cellRect = cell.getBoundingClientRect();
      strip.scrollLeft +=
        cellRect.left +
        cellRect.width / 2 -
        (stripRect.left + stripRect.width / 2);
    };
    raf = requestAnimationFrame(center);
    return () => cancelAnimationFrame(raf);
  }, [selected]);

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
    <div className="relative">
      <div className="px-edge flex items-center pt-3 pb-2">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-body-lg text-text flex items-center gap-1.5 font-bold active:opacity-70"
        >
          {monthLabel(year, month)}
          <span
            className={`text-text-3 transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
          >
            <ChevronMiniIcon size={13} />
          </span>
        </button>
      </div>
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
            aria-label="연·월 선택"
            className="bg-nav border-border rounded-card drop-shadow-media absolute top-12 left-5 z-30 w-60 border p-3"
          >
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                aria-label="이전 해"
                onClick={() => setPickerYear((y) => y - 1)}
                className="text-icon grid size-8 rotate-180 place-items-center active:opacity-60"
              >
                <ChevronMiniIcon size={14} />
              </button>
              <span className="text-body text-text font-bold">
                {pickerYear}년
              </span>
              <button
                type="button"
                aria-label="다음 해"
                onClick={() => setPickerYear((y) => y + 1)}
                className="text-icon grid size-8 place-items-center active:opacity-60"
              >
                <ChevronMiniIcon size={14} />
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
                    className={`rounded-control text-body py-2 font-semibold active:opacity-70 ${
                      on
                        ? "bg-accent-tint text-accent font-extrabold"
                        : "text-text-2"
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
      <div
        ref={stripRef}
        className="no-scrollbar px-edge flex gap-1.5 overflow-x-auto pb-1"
      >
        {days.map((dateKey) => {
          const on = dateKey === selected;
          const { weekday, day } = dateKeyParts(dateKey);
          return (
            <Link
              key={dateKey}
              href={hrefFor(dateKey)}
              aria-current={on ? "date" : undefined}
              className={`rounded-control flex w-11 shrink-0 flex-col items-center gap-0.5 py-2 active:opacity-80 ${
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
    </div>
  );
}
