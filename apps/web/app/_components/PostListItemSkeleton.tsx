import { POST_TABLE_CELL_LG, POST_TABLE_GRID } from "@/_constants/app";
import type { PostListVariant } from "@/_types/app";

/**
 * 이슈 표 한 행의 로딩 자리 (KAN-567). 실제 행(`PostListItem`)과 같은 열 템플릿과
 * 높이(38px)를 써서 데이터가 도착할 때 표가 튀지 않게 한다.
 *
 * 시안에서 두 변형(홈·기사)의 행이 같아져 모양도 하나다. `variant`는 호환용으로
 * 받아 data 속성에만 남긴다 — 행이 다시 갈릴 때 자리를 남겨 둔 것이다.
 *
 * @param variant - 행 변형(news=홈, article=기사). 지금은 모양에 영향이 없다
 */
export function PostListItemSkeleton({
  variant,
}: {
  variant?: PostListVariant;
}) {
  return (
    <div
      aria-hidden
      data-variant={variant}
      className={`${POST_TABLE_GRID} border-border-soft min-h-9.5 animate-pulse border-b py-1.75`}
    >
      <span className="flex justify-center">
        <span className="bg-elevate size-5 rounded-full" />
      </span>
      <span className="bg-elevate h-3.5 w-3/5" />
      <span className={`${POST_TABLE_CELL_LG} bg-elevate h-3 w-16`} />
      <span className="bg-elevate mx-auto h-3 w-9" />
      <span className={`${POST_TABLE_CELL_LG} bg-elevate mx-auto h-3 w-7`} />
      <span className={`${POST_TABLE_CELL_LG} bg-elevate mx-auto h-3 w-6`} />
    </div>
  );
}
