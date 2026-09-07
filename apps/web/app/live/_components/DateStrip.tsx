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
 * 경기 목록의 날짜 내비게이션(데스크톱) — 연·월 셀렉터 드롭다운 + 그 달
 * 1일~말일 전체 슬라이드 스트립 + 좌우 화살표. 선택한 날(기본 오늘)이
 * 가운데로 스크롤되고, 화살표는 스트립을 한 화면 폭만큼 밀어 준다.
 * 모바일 `live/_components/DateStrip`과 같은 URL 규약(`/live?date=`)이다.
 * 오늘은 페이지가 KST로 계산해 넘긴다(하이드레이션 어긋남 방지).
 *
 * @param selected - 현재 보고 있는 날짜 키. 이 값이 스트립의 달을 정한다
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

  /* scrollIntoView는 조상 스크롤까지 건드려 페이지가 튄다 — 직접 계산한다.
     하이드레이션 직후엔 스트립 폭이 0으로 측정되는 프레임이 있어(그리드
     레이아웃 전) 폭이 잡힐 때까지 rAF로 미룬다 */
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

  const slide = (direction: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollBy({
      left: direction * strip.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center pb-2">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-body-lg text-text hover:text-accent focus-visible:outline-accent flex items-center gap-1.5 font-bold transition-colors focus-visible:outline-2"
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
            className="bg-nav border-border rounded-card drop-shadow-media absolute top-9 left-0 z-30 w-60 border p-3"
          >
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                aria-label="이전 해"
                onClick={() => setPickerYear((y) => y - 1)}
                className="text-icon hover:bg-elevate rounded-control grid size-8 rotate-180 place-items-center transition-colors"
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
                className="text-icon hover:bg-elevate rounded-control grid size-8 place-items-center transition-colors"
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
                    className={`rounded-control text-body py-2 font-semibold transition-colors ${
                      on
                        ? "bg-accent-tint text-accent font-extrabold"
                        : "text-text-2 hover:bg-elevate"
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
      <div className="flex items-center gap-1 pb-1">
        <button
          type="button"
          aria-label="이전 날짜 보기"
          onClick={() => slide(-1)}
          className="text-icon hover:bg-elevate rounded-control grid size-8 shrink-0 rotate-180 place-items-center transition-colors"
        >
          <ChevronMiniIcon size={14} />
        </button>
        <div
          ref={stripRef}
          className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto"
        >
          {days.map((dateKey) => {
            const on = dateKey === selected;
            const { weekday, day } = dateKeyParts(dateKey);
            return (
              <Link
                key={dateKey}
                href={hrefFor(dateKey)}
                aria-current={on ? "date" : undefined}
                className={`rounded-control focus-visible:outline-accent flex w-12 shrink-0 flex-col items-center gap-0.5 py-2 transition-colors focus-visible:outline-2 ${
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
        <button
          type="button"
          aria-label="다음 날짜 보기"
          onClick={() => slide(1)}
          className="text-icon hover:bg-elevate rounded-control grid size-8 shrink-0 place-items-center transition-colors"
        >
          <ChevronMiniIcon size={14} />
        </button>
      </div>
    </div>
  );
}
