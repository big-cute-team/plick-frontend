/**
 * @file 웹 앱 전용 타입. 도메인 타입(FeedPost·Comment 등)은 `@plick/domain/types`.
 */

/**
 * 리스트 행 변형 — 마크업은 같고 밀도/썸네일 형태만 다르다.
 * - `news`: 홈 "지금 올라온 소식" — 가로형 썸네일·제목 17px, 넉넉한 간격.
 * - `article`: 기사 페이지 — 정사각 썸네일(86px)·제목 15px, 더 촘촘.
 */
export type PostListVariant = "news" | "article";
