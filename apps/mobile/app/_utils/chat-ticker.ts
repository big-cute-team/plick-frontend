/**
 * @file 홈 채팅방 띠의 줄 계산 (KAN-684). 띠는 방 전체 목록이 아니라 끝 몇 줄만 들고, 새 글이 오면
 * 뒤에 붙였다가 전환이 끝나면 앞을 버린다. React와 무관한 순수 함수라 단위 테스트가 직접 부른다.
 */

import { chatMessageKey } from "@plick/core/chat";
import type { ChatMessage } from "@plick/domain/chat";

/**
 * 훅 목록이 바뀌었을 때 띠의 다음 줄을 정한다.
 *
 * `useLiveChat`의 목록은 실시간 글이 뒤에 이어 붙거나(병합) 입장 지급분으로 통째로 갈리거나(교체)
 * 둘 중 하나다. 어느 쪽인지는 전에 본 목록의 마지막 글이 새 목록에 있는지로 가른다. 있으면 그 뒤가
 * 새 글이라 지금 줄 뒤에 붙이고, 없으면 이어 붙일 근거가 없으니 새 목록의 끝 줄들로 바꿔 끼운다.
 *
 * 새 글이 띠 줄 수보다 많으면 끝 줄들만 붙인다. 어차피 전환이 끝나면 그 줄들만 남고, 스쳐 지나갈
 * 줄을 다 그릴 이유가 없다. 전체는 줄 수의 두 배를 넘지 않게 앞을 자른다. 전환 끝 통보가 오지
 * 않는 환경(움직임 줄이기 설정)에서 줄이 끝없이 쌓이지 않게 하는 안전장치다.
 *
 * @param rows 지금 띠의 줄(전환 중이면 밀려나는 줄까지)
 * @param prev 전에 본 훅 목록
 * @param messages 지금 훅 목록
 * @param cap 띠 줄 수
 * @returns 다음 줄. 바뀐 게 없으면 `rows` 그대로라 setState가 건너뛴다
 */
export function nextTickerRows(
  rows: ChatMessage[],
  prev: ChatMessage[],
  messages: ChatMessage[],
  cap: number,
): ChatMessage[] {
  if (messages.length === 0) return rows;
  const anchor = lastIndexOfMessage(messages, prev.at(-1));
  if (anchor === -1) return messages.slice(-cap);
  const fresh = messages.slice(anchor + 1);
  if (fresh.length === 0) return rows;
  return rows.concat(fresh.slice(-cap)).slice(-cap * 2);
}

/**
 * 전환이 끝난 뒤 밀려난 앞줄을 버린다. 줄 수 안이면 같은 배열을 돌려준다.
 *
 * @param rows 지금 띠의 줄
 * @param cap 띠 줄 수
 */
export function settleTickerRows(
  rows: ChatMessage[],
  cap: number,
): ChatMessage[] {
  return rows.length > cap ? rows.slice(-cap) : rows;
}

/**
 * 목록에서 그 글의 자리. 새 글은 뒤에 붙으니 끝에서부터 찾는다. 없거나 글이 없으면 -1.
 *
 * @param messages 찾을 목록
 * @param target 찾을 글
 */
function lastIndexOfMessage(
  messages: ChatMessage[],
  target: ChatMessage | undefined,
): number {
  if (target === undefined) return -1;
  const key = chatMessageKey(target);
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message !== undefined && chatMessageKey(message) === key) return i;
  }
  return -1;
}
