/**
 * "지금 올라온 소식" 한 줄의 로딩 자리. 실제 줄(NewsItem)과 같은 3줄 구성
 * (팀·시각 / 제목 / 기자·조회·댓글)과 높이·간격을 써서 데이터가 도착할 때
 * 리스트가 튀지 않게 한다 (KAN-301에서 실제 레이아웃과 줄수를 맞췄다).
 *
 * 사진 자리(썸네일)는 뺐다 (KAN-297) — 실데이터 이미지가 전부 비어 실제 줄도
 * 텍스트만 그린다.
 */
export function NewsItemSkeleton() {
  return (
    <div className="border-border flex items-start border-b py-3">
      <div className="min-w-0 flex-1">
        <div className="bg-elevate rounded-pill h-3 w-12" />
        <div className="bg-elevate rounded-pill mt-2 h-5 w-1/2" />
        <div className="bg-elevate rounded-pill mt-2 h-3 w-1/2" />
      </div>
    </div>
  );
}
