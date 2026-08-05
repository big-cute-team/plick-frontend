"use client";

import { useEffect, useRef, useState } from "react";
import { LinkOutIcon } from "./icons";
import { ReporterTierBadge } from "./ReporterTierBadge";

/**
 * 원문 버튼 (KAN-365) — 기사 세부·릴 세부의 "원문"/"출처 원문 보기" 자리 공용.
 *
 * 원문 링크를 든 기자가 두 명 이상이면 바로 이동하지 않고 기자 목록 팝오버를
 * 연다 — 각 행이 그 기자의 원문 트윗으로 나가는 링크고(기자당 최신 한 건,
 * 중복 제거는 경계 변환 몫), 포인터가 있는 환경에선 행에 호버하면
 * "원문 보러가기"가 나타난다. 버튼에 숫자는 붙이지 않는다 — 인원수 표기는
 * 기자 줄(`ReporterListButton`) 몫이다.
 *
 * 그 외에는 지금까지처럼 대표 원문으로 바로 나가는 링크다 — 기자가 한 명이거나,
 * 릴 세부가 아직 상세(기자 배열)를 받기 전이거나. 링크도 기자도 없으면 아무것도
 * 그리지 않는다.
 *
 * 팝오버 바탕·닫힘 규칙(바깥 탭·Escape·pointerdown 전파 차단)은
 * `ReporterListButton`과 같다.
 *
 * @param label - 버튼 글자 (모바일 기사 세부 "원문", 나머지 "출처 원문 보기")
 * @param sourceUrl - 대표 원문 링크. 팝오버를 열 수 없을 때의 직행 링크.
 * @param reporters - 기사에 실린 기자 전원. 릴 세부는 상세를 받기 전 undefined.
 * @param className - 래퍼에 덧붙일 클래스(정렬용 `ml-auto` 등)
 */
export function SourceLinkButton({
  label,
  sourceUrl,
  reporters,
  className = "",
}: {
  label: string;
  sourceUrl: string | null;
  reporters?: { name: string; tier: number | null; sourceUrl: string | null }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

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

  const linkable = (reporters ?? []).filter((rep) => rep.sourceUrl);
  const trigger =
    "text-label text-accent flex items-center gap-1.25 rounded font-bold hover:opacity-80 active:opacity-60 focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2";

  if (linkable.length < 2) {
    const href = sourceUrl ?? linkable[0]?.sourceUrl ?? null;
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${trigger} ${className}`}
      >
        <LinkOutIcon size={13} />
        {label}
      </a>
    );
  }

  return (
    <span ref={rootRef} className={`relative flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${label} 목록 ${open ? "닫기" : "열기"}`}
        className={trigger}
      >
        <LinkOutIcon size={13} />
        {label}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="기자별 원문 링크"
          onPointerDown={(e) => e.stopPropagation()}
          className="bg-bg border-border rounded-control absolute top-full right-0 z-50 mt-2 flex max-h-64 min-w-44 flex-col overflow-y-auto border py-1.5"
        >
          {linkable.map((reporter, i) => (
            <a
              key={i}
              role="menuitem"
              href={reporter.sourceUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="group hover:bg-elevate-2 active:bg-elevate-2 flex items-center gap-2 px-3.5 py-2"
            >
              <ReporterTierBadge reporter={reporter} />
              <span className="text-body text-text truncate font-semibold">
                {reporter.name}
              </span>
              <span className="text-label text-accent ml-auto hidden shrink-0 pl-2 font-bold group-hover:inline">
                원문 보러가기
              </span>
            </a>
          ))}
        </div>
      )}
    </span>
  );
}
