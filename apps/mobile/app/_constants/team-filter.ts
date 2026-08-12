/**
 * @file 팀 필터 탭의 표시 순서 (KAN-388).
 */
import { TEAM_ORDER } from "@plick/domain/constants";
import type { Filter } from "@plick/domain/types";

/**
 * 전체 + 빅6의 필터 순서. 탭바(`TeamFilterTabs`)의 나열 순서이자 좌우 스와이프
 * (`useTeamSwipePager`)의 이웃 판정 기준이다 — 두 곳이 각자 배열을 만들면
 * 스와이프 방향과 탭 나열이 조용히 어긋날 수 있어 한 곳에 둔다.
 */
export const FILTER_ORDER: Filter[] = ["ALL", ...TEAM_ORDER];
