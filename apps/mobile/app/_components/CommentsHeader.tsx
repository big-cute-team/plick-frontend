import { formatCount } from "@plick/domain/format";

/**
 * 댓글 섹션 헤더, "댓글"(15/900) + 빨간 카운트(15/900). 기사 세부·릴 세부 시트 공용.
 * 시안(KAN-567)대로 댓글 수만 빨강이다.
 *
 * @param count - 댓글 수(축약 표기로 렌더)
 * @param className - 래퍼에 덧붙일 클래스(구분선 등)
 */
export function CommentsHeader({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-1.75 ${className}`}>
      <h2 className="text-body-lg text-text-strong tracking-section font-black">
        댓글
      </h2>
      <span className="text-body-lg text-danger font-black">
        {formatCount(count)}
      </span>
    </div>
  );
}
