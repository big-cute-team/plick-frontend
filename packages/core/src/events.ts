/**
 * @file 행동 이벤트 수집 (KAN-543, BE KAN-538, `POST /api/v1/events`).
 *
 * 서버가 스스로 모르는 사용자 행동(서비스 진입, 화면 전환, 원문 링크 클릭, 읽기 종료, 링크
 * 복사)을 브라우저에서 모아 보낸다. DAU 퍼널(진입, 화면, 열람, 반응, 댓글)과 이탈률의 재료다.
 * 서버가 아는 행동(조회, 좋아요, 댓글, 투표, 게스트 발급)은 그 API 호출에서 서버가 직접
 * 발행하므로 여기서 다시 보내지 않는다.
 *
 * 여러 건을 모아 한 번에 보낸다. 한 요청에 최대 20건이고 사용자당 분당 60회가 상한이라,
 * 이벤트가 생기면 잠깐 기다렸다가 묶어 보내고 20건이 차면 바로 보낸다. 화면을 떠날 때
 * (`pagehide`, 탭이 가려질 때)는 기다리지 않고 남은 것을 비운다. 전송은 `fetch`의
 * `keepalive`로 한다 - `navigator.sendBeacon`은 Content-Type을 JSON으로 못 정하고 BE가
 * JSON만 받는 데다(be-verify 확인), 두 방식 모두 페이지가 닫혀도 요청이 살아남는 점은 같다.
 *
 * 주소는 브라우저 same-origin 프록시(`/be`)다. 이 엔드포인트는 Bearer가 필수인데 토큰은
 * HttpOnly 쿠키라 브라우저가 못 읽고, 각 앱 `proxy.ts`가 `/be` 요청에 실어 준다(KAN-308).
 * 분석 헤더 넷도 같은 자리에서 붙는다(KAN-542).
 *
 * 실패해도 화면에 아무 영향이 없다. 응답은 202이고 값 규칙을 어긴 건은 서버가 그 건만
 * 조용히 버리므로 재시도하지 않는다. 서버 렌더에서는 아무것도 하지 않는다.
 */

import { BE_PROXY_PREFIX } from "./client";

/**
 * 클라이언트가 보내는 이벤트. 필드 이름은 BE `ClientEvent`(camelCase)와 같고 `articleId`는
 * 숫자(int64)다. 서버는 `read_finished`를 `article_read_finished`, `share`를
 * `reaction`(`reaction_type=share`)으로 기록한다.
 */
export type ClientEvent =
  /** 서비스 진입. 유휴 30분 뒤 다시 쓰기 시작하면 다시 한 번 */
  | { type: "app_entered" }
  /**
   * 라우트 전환과 화면 안 탭 전환. `screen`은 `screens.ts`의 목록이고 화면 안 탭은
   * `match_detail.lineups`처럼 점으로 잇는다. `ref`는 그 화면의 주인공 id
   */
  | { type: "screen_viewed"; screen: string; ref?: string }
  /** 원문 링크 클릭. `host`는 이동할 도메인 */
  | { type: "outbound_clicked"; articleId: number; host: string }
  /** 기사 화면을 닫을 때. `dwellMs`는 30분 이하, `reachedEnd`는 끝까지 내렸는지 */
  | {
      type: "read_finished";
      articleId: number;
      dwellMs: number;
      reachedEnd: boolean;
    }
  /** 링크 복사가 끝났을 때 */
  | { type: "share"; articleId: number };

/** 한 요청에 담는 최대 건수. 넘치는 뒤쪽 건은 서버가 버리므로 여기서 나눠 보낸다. */
export const EVENTS_MAX_BATCH = 20;

/**
 * 첫 이벤트가 생긴 뒤 묶음을 보내기까지 기다리는 시간(ms). 탭을 연달아 누르는 버스트를
 * 한 요청으로 접는다. 3초면 최대 분당 20회라 분당 60회 상한에 여유가 있다.
 */
const FLUSH_DELAY_MS = 3000;

/** `app_entered`를 다시 보내는 유휴 기준(ms). 계약의 30분. */
const IDLE_MS = 30 * 60 * 1000;

/**
 * 마지막 조작 시각을 보관하는 localStorage 키. 탭을 여럿 열어도 한 사람이므로 브라우저
 * 저장소로 공유하고, 새로고침으로는 방문이 새로 세어지지 않게 한다.
 */
const LAST_ACTIVE_KEY = "plick_last_active";

/** 마지막 조작 시각을 저장소에 다시 적기까지의 최소 간격(ms). 조작마다 쓰지 않는다. */
const ACTIVE_WRITE_GAP_MS = 10_000;

/** 읽기 종료의 체류 시간 상한(ms). 서버가 이보다 크면 그 건을 버린다. */
export const MAX_DWELL_MS = IDLE_MS;

const EVENTS_URL = `${BE_PROXY_PREFIX}/api/v1/events`;

const queue: ClientEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleBound = false;
/** 저장소를 못 쓸 때(시크릿 모드 등)의 메모리 폴백. 저장소가 되면 그 값을 따른다 */
let lastActiveMemory = 0;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * 화면을 떠날 때 남은 이벤트를 비우는 리스너. 첫 이벤트 때 한 번만 단다.
 *
 * `pagehide`는 탭을 닫거나 다른 사이트로 갈 때, `visibilitychange`(hidden)는 탭을 가리거나
 * 모바일에서 앱을 내릴 때다. 모바일 브라우저는 `pagehide` 없이 프로세스를 죽이기도 해서
 * 둘 다 듣는다.
 */
function bindLifecycle(): void {
  if (lifecycleBound || !isBrowser()) return;
  lifecycleBound = true;
  window.addEventListener("pagehide", flushEvents);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEvents();
  });
}

/**
 * 한 묶음을 보낸다. 응답은 기다리지 않고 실패는 삼킨다.
 *
 * `keepalive`는 페이지가 언로드돼도 요청을 끝까지 보내게 한다. 본문 상한(64KB)이 있지만
 * 20건짜리 JSON은 그 근처에도 못 간다.
 */
function send(events: ClientEvent[]): void {
  try {
    void fetch(EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    }).catch(() => {
      /* 분석 값 때문에 화면이 실패하는 일은 없다 */
    });
  } catch {
    /* fetch 자체가 던지는 환경(옛 웹뷰)도 같은 이유로 무시 */
  }
}

/**
 * 모아 둔 이벤트를 지금 전부 보낸다. 20건씩 나눠 보낸다.
 *
 * 화면을 떠나는 컴포넌트가 마지막 이벤트를 넣은 직후 직접 부를 수 있다 - 타이머는
 * 언로드 뒤에는 안 돌기 때문이다.
 */
export function flushEvents(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  while (queue.length > 0) {
    send(queue.splice(0, EVENTS_MAX_BATCH));
  }
}

/**
 * 이벤트 한 건을 큐에 넣는다. 20건이 차면 바로, 아니면 잠깐 뒤에 묶어 보낸다.
 *
 * 탭이 이미 가려진 상태(`hidden`)면 타이머를 믿을 수 없어 바로 보낸다 - 모바일에서 앱을
 * 내린 뒤 타이머는 멈추고 프로세스가 죽을 수 있다.
 *
 * @param event 보낼 이벤트
 */
export function trackEvent(event: ClientEvent): void {
  if (!isBrowser()) return;
  bindLifecycle();
  queue.push(event);
  if (
    queue.length >= EVENTS_MAX_BATCH ||
    document.visibilityState === "hidden"
  ) {
    flushEvents();
    return;
  }
  if (flushTimer === null) {
    flushTimer = setTimeout(flushEvents, FLUSH_DELAY_MS);
  }
}

function readLastActive(): number {
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVE_KEY);
    const parsed = raw ? Number(raw) : 0;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  } catch {
    /* 저장소 불가 - 메모리 값으로 */
  }
  return lastActiveMemory;
}

function writeLastActive(now: number): void {
  lastActiveMemory = now;
  try {
    window.localStorage.setItem(LAST_ACTIVE_KEY, String(now));
  } catch {
    /* 저장소 불가 - 메모리 값만 유지 */
  }
}

/**
 * 사용자가 지금 서비스를 쓰고 있다고 표시한다. 진입, 라우트 전환, 탭이 다시 보일 때,
 * 터치·키 입력마다 부른다.
 *
 * 마지막 조작이 30분보다 오래됐거나 기록이 없으면 `app_entered`를 보낸다. 새로고침이나
 * 탭을 하나 더 여는 건 방문이 아니다 - 저장소의 시각이 최근이라 안 보낸다. 저장소 쓰기는
 * 10초에 한 번으로 줄인다. 조작마다 쓰면 스크롤 중 프레임마다 디스크를 건드린다.
 */
export function touchSession(): void {
  if (!isBrowser()) return;
  const now = Date.now();
  const last = readLastActive();
  if (now - last > IDLE_MS) {
    trackEvent({ type: "app_entered" });
    writeLastActive(now);
    return;
  }
  if (now - last >= ACTIVE_WRITE_GAP_MS) writeLastActive(now);
}

/**
 * 도메인 id(문자열)를 BE가 기대하는 int64 숫자로 바꾼다. 정수가 아니면 null이고 그 이벤트는
 * 보내지 않는다 - 서버가 어차피 버리는 건을 실어 보낼 이유가 없다.
 *
 * @param articleId 기사(릴) id
 */
export function parseArticleId(articleId: string): number | null {
  return /^\d+$/.test(articleId) ? Number(articleId) : null;
}

/**
 * 화면 하나를 봤다. 라우트 전환은 각 앱의 `AnalyticsTracker`가, 화면 안 탭 전환은 그 탭
 * 컴포넌트가 부른다.
 *
 * @param screen `screens.ts`의 화면 값. 화면 안 탭은 `match_detail.lineups`처럼 잇는다
 * @param ref 그 화면의 주인공 id(기사, 팀 slug, 인물, 경기, 이슈). 없으면 생략
 */
export function trackScreenViewed(screen: string, ref?: string | number): void {
  const value = ref === undefined || ref === null ? undefined : String(ref);
  trackEvent(
    value
      ? { type: "screen_viewed", screen, ref: value }
      : { type: "screen_viewed", screen },
  );
}

/**
 * 원문 링크를 눌렀다. 이동할 주소에서 도메인만 뽑아 보낸다.
 *
 * @param articleId 원문이 속한 기사(릴) id
 * @param href 원문 링크. 주소가 아니면 보내지 않는다
 */
export function trackOutboundClicked(articleId: string, href: string): void {
  const id = parseArticleId(articleId);
  if (id === null) return;
  let host: string;
  try {
    host = new URL(href).hostname;
  } catch {
    return;
  }
  if (!host) return;
  trackEvent({ type: "outbound_clicked", articleId: id, host });
}

/**
 * 링크 복사가 끝났다. 서버는 `reaction`(`share`)으로 기록한다.
 *
 * @param articleId 공유한 기사(릴) id
 */
export function trackShare(articleId: string): void {
  const id = parseArticleId(articleId);
  if (id === null) return;
  trackEvent({ type: "share", articleId: id });
}

/**
 * 기사 화면을 닫았다. 체류 시간은 1ms 이상 30분 이하로 접는다(서버 규칙).
 *
 * @param articleId 읽던 기사 id
 * @param dwellMs 머문 시간(ms)
 * @param reachedEnd 본문 끝까지 내렸는지
 */
export function trackReadFinished(
  articleId: string,
  dwellMs: number,
  reachedEnd: boolean,
): void {
  const id = parseArticleId(articleId);
  if (id === null) return;
  trackEvent({
    type: "read_finished",
    articleId: id,
    dwellMs: Math.max(1, Math.min(Math.round(dwellMs), MAX_DWELL_MS)),
    reachedEnd,
  });
}
