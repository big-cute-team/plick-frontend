/**
 * @file 애드센스 전역 (KAN-652). 로더가 `window.adsbygoogle` 배열에 push된 요청을
 * 꺼내 광고 상자를 채운다.
 */

/** 애드센스 로더가 쓰는 전역 배열을 단 window. */
export type AdsWindow = Window & { adsbygoogle?: unknown[] };

/**
 * 카카오 애드핏 로더가 다는 전역 (KAN-652). `destroy`는 상자를 내릴 때 단위 ID로 광고를
 * 정리하는 함수인데 로더 버전에 따라 없을 수 있어 선택이다.
 */
export type AdfitWindow = Window & {
  adfit?: { destroy?: (unitId: string) => void };
};
