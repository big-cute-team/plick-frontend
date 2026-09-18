/**
 * @file 실시간 급상승 랭킹 화면 상수 (KAN-501, 이슈 전환 KAN-523).
 */

/**
 * 이슈 랭킹이 이보다 짧으면 구단 랭킹으로 대신 채운다 (KAN-523). 이슈는
 * 배치가 막 돌기 시작했거나 기사가 적은 시간대에 몇 건 안 잡히는데, 카드에
 * 한두 줄만 덩그러니 있으면 고장 난 것처럼 보인다.
 */
export const STORY_TREND_MIN = 3;

/** 이 순위까지는 번호를 accent로 세운다. 한눈에 상위권이 보이게 하는 장치다. */
export const TREND_HIGHLIGHT_RANK = 3;

/** 구단 줄 왼쪽 크레스트의 한 변 px. 320px 사이드바에서 이름 자리를 가장 덜 먹는 크기다. */
export const TREND_CREST_SIZE = 26;
