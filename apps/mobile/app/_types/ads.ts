/**
 * @file 애드센스 전역 (KAN-652). 로더가 `window.adsbygoogle` 배열에 push된 요청을
 * 꺼내 광고 상자를 채운다.
 */

/** 애드센스 로더가 쓰는 전역 배열을 단 window. */
export type AdsWindow = Window & { adsbygoogle?: unknown[] };
