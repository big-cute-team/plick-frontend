/**
 * @file 기사 읽기 세션 (KAN-543) - 기사 화면을 연 시각과 끝까지 내렸는지를 들고 있다가
 * 화면을 닫을 때 `read_finished`를 보낸다.
 *
 * 시작과 끝은 각 앱의 `ArticleViewTracker`(마운트·언마운트)가, "끝까지 내렸다"는 본문 끝의
 * `ReadEndSentinel`이 알린다. 둘이 다른 컴포넌트라 React 트리 밖(모듈)에서 기사 id로 잇는다.
 *
 * 언마운트는 곧바로 종료로 치지 않고 한 틱 미룬다. React StrictMode(dev)는 마운트 직후
 * 이펙트를 한 번 떼었다 다시 붙이는데, 그 순간을 종료로 세면 체류 0ms짜리 이벤트가 나간다.
 * 미룬 종료를 다음 마운트가 취소하면 StrictMode의 되감기는 아무 이벤트도 안 남긴다.
 *
 * 탭을 닫거나 다른 사이트로 가면 언마운트가 안 온다. `pagehide`에서 열린 세션을 전부
 * 닫고 큐를 비운다.
 */

import { flushEvents, trackReadFinished } from "./events";

interface ReadingSession {
  startedAt: number;
  reachedEnd: boolean;
  /** 언마운트가 예약한 종료. 다음 마운트가 취소한다 */
  endTimer: ReturnType<typeof setTimeout> | null;
}

const sessions = new Map<string, ReadingSession>();
let pagehideBound = false;

function bindPagehide(): void {
  if (pagehideBound || typeof window === "undefined") return;
  pagehideBound = true;
  window.addEventListener("pagehide", () => {
    for (const articleId of Array.from(sessions.keys())) endReading(articleId);
    flushEvents();
  });
}

/**
 * 기사 화면을 열었다. 같은 기사의 종료가 예약돼 있으면 취소한다(StrictMode 되감기,
 * 빠른 재진입). 이미 열린 세션이면 시작 시각은 그대로 둔다.
 *
 * @param articleId 읽기 시작한 기사 id
 */
export function beginReading(articleId: string): void {
  if (typeof window === "undefined") return;
  bindPagehide();
  const existing = sessions.get(articleId);
  if (existing) {
    if (existing.endTimer !== null) {
      clearTimeout(existing.endTimer);
      existing.endTimer = null;
    }
    return;
  }
  sessions.set(articleId, {
    startedAt: Date.now(),
    reachedEnd: false,
    endTimer: null,
  });
}

/**
 * 본문 끝이 화면에 들어왔다. 세션이 없으면(스크롤이 먼저 닿은 드문 순서) 무시한다.
 *
 * @param articleId 읽고 있는 기사 id
 */
export function markReachedEnd(articleId: string): void {
  const session = sessions.get(articleId);
  if (session) session.reachedEnd = true;
}

/**
 * 기사 화면이 언마운트됐다. 한 틱 뒤에 종료로 친다.
 *
 * @param articleId 떠나는 기사 id
 */
export function scheduleEndReading(articleId: string): void {
  const session = sessions.get(articleId);
  if (!session || session.endTimer !== null) return;
  session.endTimer = setTimeout(() => endReading(articleId), 0);
}

/**
 * 세션을 닫고 `read_finished`를 보낸다. 큐도 바로 비운다 - 소프트 내비게이션이면 다음
 * 화면이 이어서 쓰지만, 언로드 직전이면 타이머가 안 돌기 때문이다.
 *
 * @param articleId 닫을 기사 id
 */
export function endReading(articleId: string): void {
  const session = sessions.get(articleId);
  if (!session) return;
  if (session.endTimer !== null) clearTimeout(session.endTimer);
  sessions.delete(articleId);
  trackReadFinished(
    articleId,
    Date.now() - session.startedAt,
    session.reachedEnd,
  );
  flushEvents();
}
