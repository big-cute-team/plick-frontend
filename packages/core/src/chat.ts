/**
 * @file 라이브 채팅 클라이언트 (KAN-458). 프레임 파싱, 재접속 정책, 웹소켓 수명
 * 관리까지 React와 무관한 부분을 여기 모은다. 두 앱의 `useLiveChat` 훅은 이
 * 클래스를 감싸 상태만 React로 옮긴다.
 *
 * KAN-572부터 경기별 방이 아니라 언제나 열린 통합 방 하나다(BE KAN-571). 접속
 * 주소에 경기 id가 없고, 방이 닫히지 않으니 킥오프 기준 수명 판정도 없다.
 *
 * 계약 정본은 Confluence [API 명세] 라이브 경기 채팅(59146245). 프레임은 언제나
 * 배열이고, 서버가 끊을 때 종료 코드 4000에 사유 `retry={밀리초}`를 실어 준다.
 */

import type {
  ChatConnectionStatus,
  ChatFailure,
  ChatFrame,
  ChatMessage,
} from "@plick/domain/chat";

/**
 * 라이브 채팅 노출 스위치 (KAN-486). 모바일은 경기 상세 채팅 탭과 라이브 목록
 * 배너를, 웹은 경기 상세와 홈 우측 채팅 패널을 이 값으로 가린다. 두 앱이 같은
 * 값을 봐야 해서 앱 상수가 아니라 여기 둔다. KAN-572에서 통합 방과 함께 켰다.
 */
export const CHAT_ENABLED: boolean = true;

/** 메시지 한 건의 최대 길이(글자). BE `chat.max-message-length`와 같은 값이다. */
export const CHAT_MAX_MESSAGE_LENGTH = 200;

/**
 * 전송 한도의 흐르는 창(ms). BE `chat.rate-limit-window`와 같은 값이다(KAN-464).
 * 한 접속이 이 창 안에 `chat.rate-limit-messages`(5건)까지 보낼 수 있다.
 */
export const CHAT_RATE_LIMIT_WINDOW_MS = 5_000;

/**
 * 거절 안내가 떠 있는 시간(ms). FE 정책이다(KAN-465). 창 길이와 같게 둔 이유는
 * `RATE_LIMITED` 통보가 한 번만 오기 때문이다 — 안내가 창보다 먼저 사라지면 그
 * 뒤에 보낸 메시지가 통보 없이 버려지는 구간이 생긴다.
 */
export const CHAT_REJECT_NOTICE_MS = CHAT_RATE_LIMIT_WINDOW_MS;

/** 서버가 정리하며 끊을 때의 종료 코드. 사유에 `retry={밀리초}`가 실린다. */
export const CHAT_RETRY_CLOSE_CODE = 4000;

/** 재접속 대기 시작값과 상한(ms). 4000이 아닌 끊김에만 쓰는 FE 정책이다. */
export const CHAT_BACKOFF_BASE_MS = 1_000;
export const CHAT_BACKOFF_MAX_MS = 30_000;

/** 한 번도 못 붙고 연속으로 거절되면 이만큼 뒤에 멈추고 수동 재시도로 넘긴다. */
export const CHAT_MAX_HANDSHAKE_FAILURES = 3;

/** 화면에 들고 있을 메시지 상한. 방이 길어져도 메모리가 무한히 늘지 않게 한다. */
export const CHAT_MESSAGE_CAP = 300;

/** 세션 발급 라우트(같은 오리진). 접속 주소와 토큰을 서버가 조립해 준다. */
export const CHAT_SESSION_PATH = "/live/chat/session";

/**
 * 종료 사유 `retry=17320`에서 대기 시간(ms)을 꺼낸다. 형식이 다르면 null.
 *
 * @param reason CloseEvent.reason
 */
export function parseRetryDelay(reason: string): number | null {
  const match = /^retry=(\d+)$/.exec(reason.trim());
  if (!match || match[1] === undefined) return null;
  return Number(match[1]);
}

/**
 * 수신 프레임을 메시지 배열로 푼다. 배열이 아니거나 JSON이 깨졌으면 빈 배열 —
 * 한 프레임이 이상해도 접속은 유지한다.
 *
 * @param raw MessageEvent.data
 */
export function parseChatFrames(raw: unknown): ChatFrame[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChatFrame);
  } catch {
    return [];
  }
}

function isChatFrame(value: unknown): value is ChatFrame {
  if (typeof value !== "object" || value === null) return false;
  const frame = value as Record<string, unknown>;
  if (frame.type === "MESSAGE") {
    return (
      typeof frame.userId === "number" &&
      typeof frame.nickname === "string" &&
      typeof frame.content === "string" &&
      typeof frame.sentAt === "string"
    );
  }
  if (frame.type === "ERROR") {
    return typeof frame.content === "string";
  }
  return false;
}

/**
 * 메시지 식별 키. 서버가 id를 주지 않아 보낸 사람·시각·본문으로 같은 건을 알아본다.
 * 실시간 프레임끼리 겹친 것을 한 번만 그리려는 용도다.
 */
export function chatMessageKey(message: ChatMessage): string {
  return `${message.userId}|${message.sentAt}|${message.content}`;
}

/**
 * 새 프레임의 메시지를 기존 목록 뒤에 붙인다. 이미 있는 건은 건너뛰고 상한을 넘긴
 * 앞부분은 버린다.
 *
 * @param prev 지금 화면의 목록
 * @param incoming 이번 프레임의 메시지들(도착 순서)
 * @param cap 상한. 기본 {@link CHAT_MESSAGE_CAP}
 */
export function mergeChatMessages(
  prev: ChatMessage[],
  incoming: ChatMessage[],
  cap: number = CHAT_MESSAGE_CAP,
): ChatMessage[] {
  const seen = new Set(prev.map(chatMessageKey));
  const fresh = incoming.filter((message) => {
    const key = chatMessageKey(message);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (fresh.length === 0) return prev;
  const merged = prev.concat(fresh);
  return merged.length > cap ? merged.slice(merged.length - cap) : merged;
}

/**
 * 입장 지급분(최근 50개)으로 목록을 통째로 갈아 끼운다 (KAN-572). 다시 붙었을 때
 * 기존 목록 뒤에 붙이지 않는 이유: 끊긴 사이의 대화가 지급분에만 있고, 화면에
 * 남은 옛 줄과 지급분이 겹치는 경계를 키로 맞추면 같은 시각·본문을 가진 서로
 * 다른 메시지를 하나로 뭉갤 수 있다. 지급분 안의 중복만 걸러 낸다.
 *
 * @param snapshot 입장 직후 첫 프레임의 메시지들(오래된 순)
 */
export function replaceChatMessages(snapshot: ChatMessage[]): ChatMessage[] {
  return mergeChatMessages([], snapshot);
}

/**
 * n번째 재시도 대기(ms) — 1초에서 두 배씩 늘어 30초에서 멈추고, 전원이 같은
 * 순간에 돌아오지 않게 절반까지 무작위로 흩는다.
 *
 * @param attempt 0부터 세는 연속 재시도 횟수
 */
export function chatBackoffDelay(attempt: number): number {
  const base = Math.min(
    CHAT_BACKOFF_BASE_MS * 2 ** attempt,
    CHAT_BACKOFF_MAX_MS,
  );
  return Math.round(base * (0.5 + Math.random() * 0.5));
}

/**
 * 서버(라우트 핸들러)가 접속 주소를 조립한다. 브라우저는 BE 오리진을 모르고
 * 토큰도 HttpOnly 쿠키라 못 읽으므로, 둘 다 서버가 채워 완성된 URL을 내려준다.
 *
 * 경기 id는 싣지 않는다(KAN-572). 서버는 붙어 와도 무시하고 통합 방에 넣는다.
 *
 * 기본은 `API_BASE_URL`의 스킴을 ws로 바꾼 것이다(로컬 `http://localhost:8080` →
 * `ws://localhost:8080/ws/chat`). 배포 환경은 `API_BASE_URL`이 내부 ALB라 브라우저가
 * 못 닿으므로 공개 경로를 `CHAT_WS_URL`로 따로 준다(런타임 env, 재빌드 불필요).
 *
 * @param token 액세스 토큰
 */
export function chatSocketUrl(token: string): string {
  const base =
    process.env.CHAT_WS_URL ??
    `${(process.env.API_BASE_URL ?? "http://localhost:8080").replace(/^http/, "ws")}/ws/chat`;
  const url = new URL(base);
  url.searchParams.set("token", token);
  return url.toString();
}

/** 세션 발급 실패. `failure`로 화면이 무엇을 보여줄지 가른다. */
export class ChatSessionError extends Error {
  constructor(
    readonly failure: Exclude<ChatFailure, "handshake">,
    readonly status: number,
  ) {
    super(`채팅 세션 발급 실패 (${status})`);
    this.name = "ChatSessionError";
  }
}

/**
 * 브라우저가 같은 오리진의 세션 라우트에서 접속 주소를 받는다. 매 접속마다 새로
 * 부른다 — 끊긴 뒤 다시 붙을 때는 새 토큰이 필요하고(접속 중 만료는 안 끊지만
 * 재접속엔 유효 토큰이 있어야 한다), 라우트가 프록시를 지나며 만료된 access를
 * refresh로 갈아 끼우기 때문이다.
 */
export async function fetchChatSessionUrl(): Promise<string> {
  const response = await fetch(CHAT_SESSION_PATH, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (response.status === 401) throw new ChatSessionError("auth", 401);
  if (!response.ok) throw new ChatSessionError("session", response.status);
  const body = (await response.json()) as { url?: unknown };
  if (typeof body.url !== "string") throw new ChatSessionError("session", 500);
  return body.url;
}

export interface ChatSocketOptions {
  /** 접속 직전 매번 불러 완성된 wss URL을 받는다 */
  getSessionUrl: () => Promise<string>;
  /**
   * 프레임 하나(메시지 배열)를 받을 때. `snapshot`은 붙은 뒤 첫 프레임이라는 뜻이다.
   * 서버는 입장 직후 최근 메시지를 한 프레임으로 먼저 보내므로 화면은 이걸로
   * 목록을 갈아 끼운다. 방이 비어 지급분이 없으면 첫 실시간 묶음이 이 자리에 온다.
   */
  onFrames: (frames: ChatFrame[], snapshot: boolean) => void;
  /** 연결 상태가 바뀔 때. `failed`면 원인이 같이 온다 */
  onStatus: (status: ChatConnectionStatus, failure?: ChatFailure) => void;
  /** 한 번도 못 붙고 연속 거절될 때 멈추는 횟수. 기본 3 */
  maxHandshakeFailures?: number;
}

/**
 * 채팅 접속 하나의 수명. 붙이고, 끊기면 정책대로 다시 붙이고, 버리면 끝낸다.
 *
 * 재접속 정책:
 * - 서버가 4000으로 끊으면 사유의 `retry` 값만큼 정확히 기다린다. 접속마다 다른 값을
 *   주는 이유가 전원의 동시 복귀를 흩는 것이라, 이 값을 무시하면 배포 때마다 헛시도가
 *   네 배로 는다(BE 실측 7,000 대 1,843).
 * - 그 밖의 코드(1006 등)는 FE 정책이다. 붙었다가 끊긴 것이면 지수 백오프로 끝없이
 *   다시 붙고, 한 번도 못 붙은 채 연속 거절이면 `maxHandshakeFailures`에서 멈춘다.
 *   통합 방은 닫히지 않으니(KAN-572) 연속 거절은 서버 장애로 본다.
 *
 * @example
 * const socket = new ChatSocket({ getSessionUrl, onFrames, onStatus });
 * socket.start();
 * socket.send("골!!!");
 * socket.dispose();
 */
export class ChatSocket {
  private ws: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private opened = false;
  private awaitingSnapshot = false;
  private attempt = 0;
  private handshakeFailures = 0;
  private readonly maxHandshakeFailures: number;

  constructor(private readonly options: ChatSocketOptions) {
    this.maxHandshakeFailures =
      options.maxHandshakeFailures ?? CHAT_MAX_HANDSHAKE_FAILURES;
  }

  /** 첫 접속을 시작한다. */
  start(): void {
    void this.connect("connecting");
  }

  /**
   * 메시지를 보낸다. 열려 있지 않으면 보내지 않고 false를 돌려준다 — 끊긴 사이
   * 친 메시지를 몰래 버리지 않고 화면이 알게 한다.
   */
  send(content: string): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ content }));
    return true;
  }

  /** `failed`에서 사용자가 다시 시도할 때. 실패 횟수를 되돌리고 처음부터 붙는다. */
  retry(): void {
    if (this.disposed) return;
    this.clearTimer();
    this.attempt = 0;
    this.handshakeFailures = 0;
    this.closeSocket();
    void this.connect("connecting");
  }

  /** 접속을 끝낸다(화면을 떠날 때). 이후엔 아무 콜백도 부르지 않는다. */
  dispose(): void {
    this.disposed = true;
    this.clearTimer();
    this.closeSocket();
  }

  private async connect(status: ChatConnectionStatus): Promise<void> {
    if (this.disposed) return;
    this.options.onStatus(status);

    let url: string;
    try {
      url = await this.options.getSessionUrl();
    } catch (error) {
      if (this.disposed) return;
      const failure =
        error instanceof ChatSessionError ? error.failure : "session";
      this.options.onStatus("failed", failure);
      return;
    }
    if (this.disposed) return;

    const ws = new WebSocket(url);
    this.ws = ws;
    this.opened = false;

    ws.onopen = () => {
      if (ws !== this.ws) return;
      this.opened = true;
      this.awaitingSnapshot = true;
      this.attempt = 0;
      this.handshakeFailures = 0;
      this.options.onStatus("open");
    };
    ws.onmessage = (event: MessageEvent) => {
      if (ws !== this.ws) return;
      const frames = parseChatFrames(event.data);
      if (frames.length === 0) return;
      /* 거절 통보만 든 프레임은 지급분이 아니다. 메시지가 든 첫 프레임까지 기다린다 */
      const snapshot =
        this.awaitingSnapshot && frames.some((f) => f.type === "MESSAGE");
      if (snapshot) this.awaitingSnapshot = false;
      this.options.onFrames(frames, snapshot);
    };
    ws.onclose = (event: CloseEvent) => {
      if (ws !== this.ws || this.disposed) return;
      this.ws = null;
      this.scheduleReconnect(event);
    };
    // onerror 뒤에는 반드시 onclose가 따라오므로 거기서 한 번에 다룬다
    ws.onerror = () => {};
  }

  private scheduleReconnect(event: CloseEvent): void {
    if (event.code === CHAT_RETRY_CLOSE_CODE) {
      const delay =
        parseRetryDelay(event.reason) ?? chatBackoffDelay(this.attempt++);
      this.reconnectAfter(delay);
      return;
    }
    if (!this.opened) {
      this.handshakeFailures += 1;
      if (this.handshakeFailures >= this.maxHandshakeFailures) {
        this.options.onStatus("failed", "handshake");
        return;
      }
    }
    this.reconnectAfter(chatBackoffDelay(this.attempt++));
  }

  private reconnectAfter(delay: number): void {
    this.options.onStatus("reconnecting");
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.connect("reconnecting");
    }, delay);
  }

  private closeSocket(): void {
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close(1000);
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
