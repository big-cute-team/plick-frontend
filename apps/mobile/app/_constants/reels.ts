/**
 * @file 릴스 피드(세로 캐러셀)와 릴 세부 바텀시트의 기하·애니메이션 상수.
 *
 * 시트(ReelDetailSheet)와 릴의 칩·제목(ReelItem)이 같은 값을 공유해야
 * 한 몸으로 오르내리므로, 두 컴포넌트가 함께 참조하는 단일 출처로 둔다.
 */
import type { EmblaOptionsType } from "embla-carousel";

/**
 * 릴스 세로 캐러셀(Embla) 옵션 — 딥링크용 `startIndex`만 호출부에서 덧붙인다.
 *
 * - `axis: "y"` 세로 넘김. `align`은 릴이 뷰포트를 꽉 채우므로 사실상 무의미하지만 명시한다.
 * - `skipSnaps: false` 아무리 세게 튕겨도 한 번에 한 장만 넘어간다. 릴스의 기본 감각이다.
 * - `dragThreshold` 이 거리(px)를 넘겨야 드래그로 인정한다. 기본 10보다 낮춰 짧은 플릭도 받는다.
 * - `duration` 스냅 애니메이션 길이(Embla 내부 단위, 기본 25). 낮출수록 빠르게 붙는다.
 * - `watchSlides: false` 슬라이드가 늘어나도 Embla가 스스로 다시 초기화하지 않게 끈다.
 *   기본값(true)이면 컨테이너에 걸린 MutationObserver가 자식이 바뀌는 즉시 `reInit()`을
 *   부르는데, 그 안의 `deActivate()`가 진행 중인 스냅 애니메이션과 드래그 핸들러를
 *   파괴한다. 다음 페이지가 도착하는 시점이 하필 넘기는 도중이라 넘김이 툭 끊긴다.
 *   대신 {@link useReelsCarousel}이 멈춘 뒤에 직접 다시 잰다 (KAN-276).
 */
export const REELS_CAROUSEL_OPTIONS: EmblaOptionsType = {
  axis: "y",
  align: "start",
  loop: false,
  skipSnaps: false,
  dragThreshold: 8,
  duration: 22,
  watchSlides: false,
};

/**
 * 남은 릴이 이 개수 이하로 줄면 다음 페이지를 미리 당긴다 (KAN-276).
 *
 * 한 페이지가 10장이라 세 장 남았을 때 시작하면 사용자가 끝에 닿기 전에 도착한다.
 * 리스트의 무한스크롤과 달리 감시 요소를 둘 자리가 없어(릴 한 장이 화면 전체다)
 * 지금 보고 있는 릴의 인덱스로 판단한다.
 */
export const REELS_PREFETCH_AHEAD = 3;

/**
 * 재측정(reInit) 때 "스냅이 아직 달리는 중"으로 보는 남은 거리(px) (KAN-276).
 *
 * 이보다 많이 남았으면 reInit 후 운동 상태를 복원해 애니메이션을 이어 붙이고,
 * 미만이면 사실상 멈춘 것이라 그냥 잰다({@link useReelsCarousel}).
 *
 * Embla 스스로의 판정(`scrollBody.settled()`)을 쓰지 않는 이유: 허용치가 0.001px인데
 * 관성 수렴의 수치 오차 때문에 스냅이 다 끝나 화면이 멈춘 뒤에도 `offsetLocation`이
 * 목표에서 0.004px쯤 어긋난 채 정지할 수 있다(실측). Embla는 그 판정을 정지하는
 * 프레임에 한 번 쓰고 지나갈 뿐이라 문제가 없지만, 정지 "상태"를 묻는 질의로 쓰면
 * 영영 false에 머무는 복불복이 된다. 1px 미만은 재도 눈에 보이지 않는 거리다.
 */
export const REELS_REMEASURE_EPSILON = 1;

/** 시트 상단을 이 거리(px) 이상 끌어내리면 닫는다 */
export const DRAG_CLOSE_THRESHOLD = 100;

/** 릴 섹션 대비 시트 높이 비율 — 피그마 352/480.7 */
export const SHEET_HEIGHT_RATIO = 0.73;

/** 칩·제목 블록 하단과 시트 상단 라인 사이 간격(px) — 피그마 9.9(0.55배율) */
export const SHEET_TITLE_GAP = 18;

/** 시트와 칩·제목이 공유하는 슬라이드 타이밍 — 두 요소가 한 몸처럼 움직이는 전제 */
export const SHEET_TRANSITION =
  "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * 시트가 열릴 때 미디어(트윗 임베드) 층이 시트 위 남은 영역으로 줄어드는 높이
 * 트랜지션 (KAN-284). 시트 슬라이드와 같은 타이밍이라 함께 움직여 보인다.
 */
export const SHEET_MEDIA_TRANSITION =
  "height 320ms cubic-bezier(0.32, 0.72, 0, 1)";
