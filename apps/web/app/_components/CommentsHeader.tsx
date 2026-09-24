import { formatCount } from "@plick/domain/format";

/**
 * 댓글 섹션 헤더 (시안 KAN-567) — "댓글" 15/900과 빨간 수 15/900. 기사 세부·릴 세부
 * 패널 공용. 시안의 "추천순/최신순" 정렬은 API가 없어 뺐다(API 공백).
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
    <div className={`flex items-baseline gap-2.25 ${className}`}>
      <h2 className="text-body-lg text-text-strong font-black tracking-tight">
        댓글
      </h2>
      <span className="text-body-lg text-danger font-black">
        {formatCount(count)}
      </span>
    </div>
  );
}
