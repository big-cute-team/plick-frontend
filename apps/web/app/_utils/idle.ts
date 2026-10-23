/**
 * @file 브라우저가 한가할 때 한 번 부르기. 사파리는 `requestIdleCallback`이 없어 짧은 타이머로 대신한다.
 * 모바일 `_utils/idle.ts`와 같다(KAN-667).
 */

/** 한가해지길 기다리는 상한(ms). 계속 바쁜 화면이어도 이 안에는 부른다 */
const IDLE_TIMEOUT_MS = 2_000;

/** `requestIdleCallback`이 없을 때 기다리는 시간(ms). 첫 페인트와 하이드레이션 뒤로 미루는 정도 */
const FALLBACK_DELAY_MS = 300;

/**
 * 브라우저가 한가할 때 `task`를 한 번 부른다.
 *
 * @param task 부를 함수
 * @returns 아직 안 불렸으면 취소하는 함수
 */
export function runWhenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, FALLBACK_DELAY_MS);
  return () => window.clearTimeout(id);
}
