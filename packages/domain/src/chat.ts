/**
 * @file 라이브 경기 채팅 도메인 타입 (KAN-458). web·mobile 공용이라 여기 둔다
 * (ADR 0011 게이트 C, 라이브 스코어 `live.ts`와 같은 판단).
 *
 * 계약 정본은 Confluence [API 명세] 라이브 경기 채팅(59146245)이다. REST가 아니라
 * 웹소켓이라 `{ code, message, data }` 래퍼를 타지 않고 프레임이 곧 배열이다.
 */

/**
 * 서버가 보낸 사람에게만 돌려주는 거절 사유. `RATE_LIMITED`(KAN-464)는 한 접속이
 * 창 안의 건수를 넘긴 것으로, 넘은 메시지는 방에 나가지 않고 접속도 끊기지 않는다.
 * 계속 던지는 동안 이 통보는 한 번만 온다 — 다음 메시지가 통과할 때까지 다시 오지
 * 않으므로, 화면이 이 안내를 서둘러 지우면 그 사이 버려진 메시지를 알 길이 없다.
 */
export type ChatRejectReason =
  | "EMPTY_MESSAGE"
  | "MESSAGE_TOO_LONG"
  | "RATE_LIMITED";

/** 방에 오간 메시지 한 건. 입장 지급분(최근 20개)과 실시간 메시지가 같은 모양이다. */
export interface ChatMessage {
  type: "MESSAGE";
  /** 보낸 사람. 차단 기능이 붙으면 이 값으로 거른다 */
  userId: number;
  /** 보낸 시점의 닉네임. 나중에 바뀌어도 지난 메시지는 그대로다 */
  nickname: string;
  content: string;
  /** 서버가 받은 시각(KST ISO-8601) */
  sentAt: string;
}

/** 거절 통보. 보낸 사람에게만, 묶지 않고 곧바로 온다. `content`가 사유다. */
export interface ChatErrorFrame {
  type: "ERROR";
  userId: null;
  nickname: null;
  content: ChatRejectReason | string;
  sentAt: string;
}

/** 서버 프레임 배열의 원소. */
export type ChatFrame = ChatMessage | ChatErrorFrame;

/**
 * 소켓 연결 상태. `reconnecting`은 한 번 붙었다가 끊겨 다시 붙는 중이고,
 * `failed`는 핸드셰이크가 연속으로 거절돼 스스로 멈춘 상태다(수동 재시도만 남는다).
 */
export type ChatConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "failed"
  | "closed";

/**
 * `failed`의 원인. 브라우저 웹소켓은 핸드셰이크 HTTP 코드(401·403·404)를
 * 알려주지 않고 1006으로만 끊기므로 `handshake`는 "무엇 때문인지 모른다"에 가깝다.
 * 로그인·닉네임은 접속 전에 화면이 먼저 거르고, 세션 발급이 401이면 `auth`다.
 */
export type ChatFailure = "auth" | "session" | "handshake";

/**
 * 킥오프 기준 방 수명 구간. 서버는 킥오프 30분 전에 열고 3시간 뒤에 닫는다.
 * 화면은 `after`만 접속 없이 거르고 `before`는 붙어 본다 — dev가 방 여는 구간을
 * 넓혀 두는 경우(`CHAT_OPEN_BEFORE=720h`)를 화면이 막지 않게 하려는 것이다.
 */
export type ChatRoomPhase = "before" | "open" | "after";
