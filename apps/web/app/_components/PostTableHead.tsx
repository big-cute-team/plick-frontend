import { POST_TABLE_CELL_LG, POST_TABLE_GRID } from "@/_constants/app";

/**
 * 이슈 표의 머리 줄 (KAN-567, 시안 홈 표) — 팀, 제목, 출처 기자, 보도, 조회, 좋아요.
 * 높이 30, 11.5px 흐린 회색, 밑선은 표 머리 선(`border-soft`)이다. 열 템플릿은
 * 행(`PostListItem`)과 같은 {@link POST_TABLE_GRID}라 어긋나지 않는다.
 *
 * `lg` 아래에서는 기자·조회·좋아요 열이 행과 함께 접힌다.
 */
export function PostTableHead() {
  return (
    <div
      role="row"
      className={`${POST_TABLE_GRID} border-border-soft text-caption-lg text-text-4 h-7.5 border-b`}
    >
      <span className="text-center">팀</span>
      <span>제목</span>
      <span className={POST_TABLE_CELL_LG}>출처 기자</span>
      <span className="text-center">보도</span>
      <span className={`${POST_TABLE_CELL_LG} text-center`}>조회</span>
      <span className={`${POST_TABLE_CELL_LG} text-center`}>좋아요</span>
    </div>
  );
}
