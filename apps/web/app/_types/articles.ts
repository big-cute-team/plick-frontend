/**
 * @file 기사 목록 화면 타입 (KAN-523).
 */

/**
 * 기사 무한 목록을 무엇으로 거를지. 인물 프로필은 인물 태그로, 이슈 상세는
 * 이슈 묶음으로 거른다. 둘 다 `GET /api/v1/articles`에 필터 하나를 더한 같은
 * 피드라 목록과 훅을 하나로 쓴다.
 */
export interface ArticleScope {
  kind: "figure" | "story";
  id: string;
}
