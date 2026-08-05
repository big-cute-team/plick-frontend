"use client";

import { useEffect, useRef, useState } from "react";
import { ReporterTierBadge } from "./ReporterTierBadge";

/**
 * 기자 전원 펼침 버튼 (KAN-365) — 대표 기자 이름 오른쪽 위에 대표를 뺀 추가
 * 인원을 `+N`으로 붙이고(두 명이면 +1, 세 명이면 +2), 누르면 전체 기자 목록이
 * 팝오버로 펼쳐진다. 기사 세부·릴 세부 공용. 기자가 두 명 이상일 때만 쓴다
 * ({@link ReporterLine}이 가른다) — 한 명이면 표기 없이 이름만 서는 게 스펙이다.
 *
 * 목록의 각 기자는 자기 원문 트윗으로 나가는 링크다(티어가 있으면 배지 함께).
 * 링크가 없는 기자는 눌리지 않는 행으로만 남는다. 바깥 탭·Escape로 닫힌다.
 * 팝오버 바탕은 반투명 elevate가 아니라 불투명 `bg-bg`다 — 본문 위에 뜨는
 * 층이라 밑 글자가 비치면 안 된다(기존 다이얼로그들과 같은 선택).
 *
 * 팝오버 안에서 시작한 pointerdown은 밖으로 올리지 않는다 — 릴 세부 시트의
 * 그랩 존(기자 줄) 안에 서는데, 전파되면 목록을 누르는 손짓이 시트 드래그로
 * 이어진다. 이름 버튼 자체는 전파를 막지 않는다 — 기자 줄을 잡고 끌어내리는
 * 닫기 제스처가 이름 위에서도 계속 돼야 한다.
 *
 * @param reporters - 기사에 실린 기자 전원(대표 순서, `[0]`이 대표). 빈 배열이면
 *   아무것도 그리지 않는다.
 */
export function ReporterListButton({
  reporters,
}: {
  reporters: { name: string; tier: number | null; sourceUrl: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const lead = reporters[0];

  /* 열려 있는 동안만 바깥 탭·Escape 감지를 단다 */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!lead) return null;

  const row =
    "flex items-center gap-2 px-3.5 py-2 hover:bg-elevate-2 active:bg-elevate-2";

  return (
    <span ref={rootRef} className="relative flex min-w-0 items-center gap-2">
      <ReporterTierBadge reporter={lead} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`기자 ${reporters.length}명 목록 ${open ? "닫기" : "열기"}`}
        className="focus-visible:outline-accent flex min-w-0 items-start gap-0.5 rounded text-left hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
      >
        <span className="text-body text-text min-w-0 truncate font-semibold">
          {lead.name}
        </span>
        <span className="text-micro text-accent font-bold">
          +{reporters.length - 1}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="기자 목록"
          onPointerDown={(e) => e.stopPropagation()}
          className="bg-bg border-border rounded-control absolute top-full left-0 z-50 mt-2 flex max-h-64 min-w-44 flex-col overflow-y-auto border py-1.5"
        >
          {reporters.map((reporter, i) =>
            reporter.sourceUrl ? (
              <a
                key={i}
                role="menuitem"
                href={reporter.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={row}
              >
                <ReporterTierBadge reporter={reporter} />
                <span className="text-body text-text truncate font-semibold">
                  {reporter.name}
                </span>
              </a>
            ) : (
              <span key={i} role="menuitem" className={row}>
                <ReporterTierBadge reporter={reporter} />
                <span className="text-body text-text-3 truncate font-semibold">
                  {reporter.name}
                </span>
              </span>
            ),
          )}
        </div>
      )}
    </span>
  );
}
