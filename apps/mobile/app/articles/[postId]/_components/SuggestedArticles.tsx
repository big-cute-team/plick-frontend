/**
 * 기사 세부 하단 "함께 보면 좋은 기사" 섹션 — 상단 구분선 + 준비 중 문구.
 *
 * 추천 기사 API가 아직 없다(KAN-283). 목데이터나 피드 슬라이싱으로 채우는
 * 대신 자리만 잡아두고, 추천 API가 생기면 리스트를 붙인다.
 */
export function SuggestedArticles() {
  return (
    <section className="px-edge border-border mt-3.5 border-t pt-4">
      <h2 className="text-title text-text tracking-heading font-extrabold">
        함께 보면 좋은 기사
      </h2>
      <p className="text-body text-text-4 py-8 text-center">
        지금은 준비 중이에요
      </p>
    </section>
  );
}
