/**
 * 기사 세부 우측 사이드바 — 관련 기사 + 실시간 인기 랭킹. 스크롤 시 상단 고정.
 *
 * `lg` 미만에선 숨긴다(홈 HomeSidebar와 동일). 하단 "함께 보면 좋은 기사" 행이
 * 모바일에서 관련 콘텐츠를 대신 제공한다.
 *
 * 둘 다 대응 BE 엔드포인트가 없는 계약 공백이라 카드 자리만 두고 준비 중 문구를
 * 그린다(KAN-322). 목데이터나 피드 슬라이싱으로 채우지 않는 건 모바일 KAN-283과
 * 같은 원칙이다 — 관련·인기 API가 생기면 여기서 받아 목록을 되살린다.
 *
 * @param className - 래퍼에 덧붙일 클래스(모바일 `hidden lg:flex` 제어)
 */
export function ArticleSidebar({ className = "" }: { className?: string }) {
  return (
    <aside className={`sticky top-22 flex-col gap-4 self-start ${className}`}>
      <section className="bg-elevate-2 border-border rounded-card border p-3.5">
        <h3 className="text-gnb text-text px-1 pb-1 font-extrabold">
          관련 기사
        </h3>
        <p className="text-body text-text-4 py-6 text-center">
          아직 준비 중이에요!
        </p>
      </section>

      <section className="bg-elevate-2 border-border rounded-card border p-3.5">
        <h3 className="text-gnb text-text pb-1 font-extrabold">실시간 인기</h3>
        <p className="text-body text-text-4 py-6 text-center">
          아직 준비 중이에요!
        </p>
      </section>
    </aside>
  );
}
