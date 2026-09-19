import type { PostListVariant } from "@/_types/app";

/**
 * 피드 리스트 한 줄의 로딩 자리. 실제 줄(PostListItem)과 같은 3줄 구성
 * (팀·시각 / 제목 / 기자·조회·댓글)과 간격을 써서 데이터가 도착할 때 리스트가
 * 튀지 않게 한다. 사진 자리는 뺐다 — 실데이터 이미지가 전부 비어 실제 줄도
 * 텍스트만 그린다(모바일 KAN-297과 동일).
 *
 * @param variant - 행 변형(news=홈, article=기사). 실제 줄과 같은 세로 밀도만 맞춘다.
 */
export function PostListItemSkeleton({
  variant,
}: {
  variant: PostListVariant;
}) {
  return (
    <div
      className={`border-border flex items-start border-b ${
        variant === "news" ? "py-5" : "py-4"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="bg-elevate rounded-pill h-3 w-14" />
        <div className="bg-elevate rounded-pill mt-2.5 h-5 w-1/2" />
        <div className="bg-elevate rounded-pill mt-2.5 h-3 w-1/3" />
      </div>
    </div>
  );
}
