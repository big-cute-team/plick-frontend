/**
 * @file 당겨서 새로고침 제스처의 순수 계산 (KAN-314).
 */
import { PULL_MAX_DISTANCE } from "@/_constants/pull-refresh";
import { damp } from "@/_utils/damp";

/**
 * 손가락이 내려온 거리를 콘텐츠가 실제로 내려올 거리로 감쇠한다.
 *
 * 곡선 자체는 팀 스와이프와 공용인 {@link damp}다 — 처음에는 손가락을 거의
 * 그대로 따라오다 점점 뻑뻑해지고 {@link PULL_MAX_DISTANCE}에 수렴한다.
 *
 * @param raw 터치 시작점 대비 손가락이 아래로 이동한 거리(px). 음수면 0이다.
 * @returns 콘텐츠를 밀어 내릴 거리(px)
 */
export function dampPull(raw: number): number {
  return damp(raw, PULL_MAX_DISTANCE);
}
