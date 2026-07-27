/**
 * @file 당겨서 새로고침 제스처의 순수 계산 (KAN-314).
 */
import { PULL_MAX_DISTANCE } from "@/_constants/pull-refresh";

/**
 * 손가락이 내려온 거리를 콘텐츠가 실제로 내려올 거리로 감쇠한다.
 *
 * 처음에는 손가락을 거의 그대로 따라오다가(기울기 1에서 시작) 점점 뻑뻑해지고
 * {@link PULL_MAX_DISTANCE}에 수렴한다. 지수 감쇠라 중간에 꺾이는 지점 없이
 * 매끄럽게 무거워져서, 고무줄을 늘리는 느낌이 난다.
 *
 * @param raw 터치 시작점 대비 손가락이 아래로 이동한 거리(px). 음수면 0이다.
 * @returns 콘텐츠를 밀어 내릴 거리(px)
 */
export function dampPull(raw: number): number {
  if (raw <= 0) return 0;
  return PULL_MAX_DISTANCE * (1 - Math.exp(-raw / PULL_MAX_DISTANCE));
}
