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
import { ChevronDownIcon, ChevronRightIcon } from "@plick/ui/icons";
import { useDateStripScroll } from "@/_hooks/useDateStripScroll";

/**
 * 경기 목록의 날짜 줄 (KAN-459, KAN-567 시안, KAN-569). 그 달 1일~말일을 담은 가로
 * 스크롤 줄이고 칸은 요일 11/700 + 일 14, 선택한 칸은 강조색 2px 밑줄에 900,
 * 일요일 요일은 빨강이다. 오른쪽 끝에 줄을 한 화면씩 미는 화살표와 그 달 라벨이 선다.
 *
 * KAN-567에서 선택한 날을 늘 가운데 둔 7일 줄로 바꿨더니 칸을 누를 때마다 줄이
 * 흐르고 다른 달로 가는 길이 끝 칸을 하루씩 누르는 것뿐이었다. KAN-569에서 한 달
 * 줄로 되돌려, 처음 들어올 때와 달이 바뀔 때만 가운데로 당기고 그 뒤로는 선택
 * 칸이 가려질 때만 보이는 데까지 민다({@link useDateStripScroll}). 달 라벨을 누르면
 * 연·월 목록이 열리고 고른 달의 1일(오늘이 속한 달이면 오늘)로 간다.
 *
 * 모바일 `live/_components/DateStrip`과 같은 URL 규약(`/live?date=`)이다. 오늘은
 * 페이지가 KST로 계산해 넘긴다(하이드레이션 어긋남 방지).
 *
 * @param selected 현재 보고 있는 날짜 키. 이 값이 줄의 달을 정한다
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
  const stripRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
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

  /** 줄을 한 화면 폭의 80%만큼 민다. 마우스 휠로는 가로 스크롤이 안 되는 데스크톱 몫이다 */
  const slide = (direction: -1 | 1) => {
    const strip = stripRef.current;
    strip?.scrollBy({
      left: direction * strip.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    /* 바닥 선은 border가 아니라 inset 그림자다. 가로 스크롤 상자는 세로도 잘라
       칸 밑줄을 -1px로 선에 겹칠 수 없는데, 그림자는 자손인 칸 밑줄이 덮어 그린다 */
    <div className="relative mb-1.5 flex items-stretch shadow-[inset_0_-1px_0_var(--color-border)]">
      <div
        ref={stripRef}
        className="no-scrollbar flex min-w-0 flex-1 overflow-x-auto"
      >
        {monthDateKeys(year, month).map((dateKey) => {
          const on = dateKey === selected;
          const { weekday, day } = dateKeyParts(dateKey);
          return (
            <Link
              key={dateKey}
              href={hrefFor(dateKey)}
              aria-current={on ? "date" : undefined}
              className={`hover:bg-elevate-2 focus-visible:outline-accent flex shrink-0 flex-col items-center gap-0.75 border-b-2 px-3.75 py-2.25 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 ${
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
      <div className="flex shrink-0 items-center pl-2">
        <button
          type="button"
          aria-label="이전 날짜"
          onClick={() => slide(-1)}
          className="text-text-3 hover:text-accent focus-visible:outline-accent grid size-7 rotate-180 place-items-center focus-visible:outline-2"
        >
          <ChevronRightIcon size={14} />
        </button>
        <button
          type="button"
          aria-label="다음 날짜"
          onClick={() => slide(1)}
          className="text-text-3 hover:text-accent focus-visible:outline-accent grid size-7 place-items-center focus-visible:outline-2"
        >
          <ChevronRightIcon size={14} />
        </button>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-label text-text-3 hover:text-accent focus-visible:outline-accent flex items-center gap-0.5 pl-2 focus-visible:outline-2"
        >
          {monthLabel(year, month)}
          <ChevronDownIcon size={12} className="text-text-4" />
        </button>
      </div>
      {open && (
        <>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div
            role="listbox"
            aria-label="연·월 선택"
            className="bg-bg border-border shadow-dialog absolute top-full right-0 z-30 mt-1 w-60 border p-3"
          >
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                aria-label="이전 해"
                onClick={() => setPickerYear((y) => y - 1)}
                className="text-icon hover:bg-elevate grid size-8 rotate-180 place-items-center transition-colors"
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
                className="text-icon hover:bg-elevate grid size-8 place-items-center transition-colors"
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
                    className={`text-body hover:bg-elevate py-2 transition-colors ${
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
    </div>
  );
}
