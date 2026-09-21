import type { PostListVariant } from "@/_types/app";

/**
 * 피드 리스트 한 줄의 로딩 자리. 실제 줄(PostListItem)과 같은 세 칸 구성
 * (로고 / 제목·요약 / 시각·기자명)과 간격을 써서 데이터가 도착할 때 리스트가
 * 튀지 않게 한다 (KAN-482에서 행 구조가 바뀌며 같이 맞췄다).
 *
 * @param variant - 행 변형(news=홈, article=기사). 실제 줄과 같은 세로 밀도와
 *   로고 크기를 맞춘다.
 */
export function PostListItemSkeleton({
  variant,
}: {
  variant: PostListVariant;
}) {
  const news = variant === "news";

  return (
    <div
      className={`border-border flex items-start border-b ${
        news ? "gap-5 py-5" : "gap-3.5 py-4"
      }`}
    >
      <div
        className={`bg-elevate shrink-0 self-center rounded-full ${
          news ? "size-10" : "size-9"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`bg-elevate rounded-pill w-3/5 ${news ? "h-5" : "h-4"}`}
        />
        <div className="bg-elevate rounded-pill mt-2.5 h-3 w-2/5" />
      </div>
      <div className="flex w-28 shrink-0 flex-col items-end gap-2">
        <div className="bg-elevate rounded-pill h-3 w-14" />
        <div className="bg-elevate rounded-pill h-3 w-10" />
      </div>
    </div>
  );
}
