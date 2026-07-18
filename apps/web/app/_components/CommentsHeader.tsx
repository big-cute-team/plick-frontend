import { formatCount } from "@plick/domain/format";

/**
 * 댓글 섹션 헤더 — "댓글" + 축약 카운트. 기사 세부·릴 세부 패널 공용.
 *
 * @param count - 댓글 수(축약 표기로 렌더)
 * @param className - 래퍼에 덧붙일 클래스(구분선·여백 등)
 */
export function CommentsHeader({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <h2 className="text-body-lg text-text font-extrabold">댓글</h2>
      <span className="text-label text-text-3 font-semibold">
        {formatCount(count)}
      </span>
    </div>
  );
}
