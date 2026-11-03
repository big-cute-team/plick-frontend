/**
 * @file 팀 필터 탭의 표시 순서 (KAN-388).
 */
import { TEAM_ORDER } from "@plick/domain/constants";
import type { Filter } from "@plick/domain/types";

/**
 * 전체 + 빅6의 필터 순서. 탭바(`TeamFilterTabs`)의 나열 순서이자 좌우 스와이프
 * (`neighborFilter`)의 이웃 판정 기준이다 — 두 곳이 각자 배열을 만들면
 * 스와이프 방향과 탭 나열이 조용히 어긋날 수 있어 한 곳에 둔다.
 */
export const FILTER_ORDER: Filter[] = ["ALL", ...TEAM_ORDER];

/**
 * 팀 탭 줄이 선택 탭을 보이는 데까지 끌어올 때 남기는 좌우 여백(px) (KAN-709). `px-edge`와 같은
 * 16이라 탭이 화면 가장자리 패딩 안쪽에 선다. 날짜 줄의 `DATE_STRIP_KEEP_PAD`와 같은 역할이다.
 */
export const TEAM_TAB_KEEP_PAD = 16;

/**
 * 필터의 이웃 — 좌우 스와이프(`SwipePager`)의 `neighborOf`. `dir`이 1이면
 * 순서상 다음 팀, -1이면 이전 팀이고 끝이면 null이다.
 */
export function neighborFilter(filter: Filter, dir: 1 | -1): Filter | null {
  return FILTER_ORDER[FILTER_ORDER.indexOf(filter) + dir] ?? null;
}
