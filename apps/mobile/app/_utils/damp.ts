/**
 * @file 제스처 저항 감쇠의 순수 계산 (KAN-388에서 당겨서 새로고침 것을 일반화).
 */

/**
 * 손가락 이동 거리를 콘텐츠가 실제로 밀릴 거리로 감쇠한다.
 *
 * 처음에는 손가락을 거의 그대로 따라오다가(기울기 1에서 시작) 점점 뻑뻑해지고
 * `max`에 수렴한다. 지수 감쇠라 중간에 꺾이는 지점 없이 매끄럽게 무거워져서,
 * 고무줄을 늘리는 느낌이 난다. 당겨서 새로고침(`dampPull`)과 팀 스와이프의
 * 끝 탭 저항이 같은 곡선을 쓴다.
 *
 * @param raw 터치 시작점 대비 손가락이 이동한 거리(px). 음수면 0이다.
 * @param max 수렴할 최대 거리(px)
 * @returns 콘텐츠를 밀 거리(px)
 */
export function damp(raw: number, max: number): number {
  if (raw <= 0) return 0;
  return max * (1 - Math.exp(-raw / max));
}
