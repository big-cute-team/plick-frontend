import type { ReactNode } from "react";
import { ReporterTierBadge } from "./ReporterTierBadge";

/**
 * 기자 라인 — 티어 배지 + 기자명 + 메타(시각·조회수) 한 줄. 기사 세부·릴 세부 공용.
 *
 * 앱 중립성을 위해 메타는 앱에서 포맷한 문자열로 받는다(레지스트리·포맷 유틸을
 * 내부에서 조회하지 않는다 — ADR 0011 게이트 A). 트레일링 액션(원문 버튼·닫기
 * 버튼 등)은 children으로 이어 붙인다.
 *
 * @param reporter - 표시할 기자(name·tier)
 * @param meta - 이름 뒤 보조 텍스트 (예: `· 5분 전 · 조회 1.2K`)
 * @param className - 래퍼에 덧붙일 클래스(줄바꿈·구분선·여백 변형)
 * @param metaClassName - 메타 스팬에 덧붙일 클래스(말줄임 등)
 */
export function ReporterLine({
  reporter,
  meta,
  className = "",
  metaClassName = "",
  children,
}: {
  /** 티어가 없으면(BE 실데이터의 절반) 배지 없이 이름만 나온다. */
  reporter: { name: string; tier: number | null };
  meta: string;
  className?: string;
  metaClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ReporterTierBadge reporter={reporter} />
      <span className="text-body text-text font-semibold">{reporter.name}</span>
      <span className={`text-label text-text-3 ${metaClassName}`}>{meta}</span>
      {children}
    </div>
  );
}
