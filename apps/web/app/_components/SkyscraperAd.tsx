import { AdSlot } from "@/_components/AdSlot";
import { SKYSCRAPER_MEDIA_QUERY } from "@/_constants/ads";

/**
 * 좌측 여백 세로 배너 (KAN-652). 페이지 컨테이너 바깥 왼쪽 여백에 고정해 스크롤을
 * 따라오지 않는다(시안의 sticky 스카이스크래퍼). 자리는 컨테이너 왼쪽 가장자리에서
 * 광고 폭(10rem)과 거터만큼 더 왼쪽이고, 그 여백이 실제로 남는 넓은 화면
 * (`SKYSCRAPER_MEDIA_QUERY`)에서만 보인다. 좁으면 본문을 가리므로 CSS로 숨기고,
 * `AdSlot`은 같은 조건을 `media`로 받아 보일 때만 상자를 마운트한다.
 */
export function SkyscraperAd() {
  return (
    <div className="fixed top-[calc(var(--site-header-h)+1.375rem)] left-[calc((100vw-80rem)/2-10rem-var(--spacing-gutter))] hidden min-[112.5rem]:block">
      <AdSlot placement="skyscraper" media={SKYSCRAPER_MEDIA_QUERY} />
    </div>
  );
}
