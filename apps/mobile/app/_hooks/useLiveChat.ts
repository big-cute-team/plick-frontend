"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_REJECT_NOTICE_MS,
  ChatSocket,
  fetchChatSessionUrl,
  mergeChatMessages,
  replaceChatMessages,
} from "@plick/core/chat";
import type {
  ChatConnectionStatus,
  ChatFailure,
  ChatMessage,
} from "@plick/domain/chat";
import type { BouncedMessage } from "@/_types/live";

/** 마지막 거절 통보. `at`은 같은 사유가 또 왔을 때 타이머를 다시 돌리기 위한 값이다. */
interface RejectNotice {
  reason: string;
  at: number;
}

/**
 * 통합 채팅방 접속 훅 (KAN-458, KAN-572에서 경기별 방에서 통합 방으로). `@plick/core/chat`의
 * `ChatSocket`을 감싸 메시지 목록과 연결 상태를 React 상태로 옮긴다. 재접속 정책(4000의
 * retry, 백오프, 핸드셰이크 연속 실패 멈춤)은 전부 소켓 클래스가 갖고, 여기는 프레임을
 * 메시지와 거절 통보로 갈라 담기만 한다.
 *
 * 붙은 뒤 첫 프레임은 입장 지급분(최근 50개)이라 목록을 통째로 갈아 끼운다. 다시 붙을
 * 때 옛 목록 뒤에 이어 붙이면 끊긴 사이와 겹치는 줄이 두 번 보일 수 있어서다.
 *
 * 거절 안내(`rejected`)는 서버 통보로만 뜨고 {@link CHAT_REJECT_NOTICE_MS} 뒤에
 * 스스로 사라진다(KAN-465). 보내기나 타이핑이 지우지 않는 이유: `RATE_LIMITED`는
 * 계속 던지는 동안 한 번만 오는 통보라, 다음 전송이 안내를 지우면 그 전송이
 * 조용히 버려진 것을 사용자가 알 수 없다. 슬롯은 하나라 겹쳐 쌓이지 않고, 같은
 * 사유가 또 오면 타이머만 다시 돈다.
 *
 * `ROOM_BUSY`(KAN-572)는 방 전체 상한에 걸려 글이 방에 나가지 않은 것이다. 입력창은
 * 보낼 때 이미 비웠으므로 마지막으로 보낸 글을 `bounced`로 돌려줘 다시 채우게 한다.
 * 서버가 메시지 id를 주지 않아 어느 글이 튕겼는지는 "마지막 글"로 짐작한다.
 * web `useLiveChat`과 같은 코드의 수동 복제다.
 *
 * TanStack Query를 쓰지 않는 이유: 요청·응답이 아니라 열려 있는 연결이라 캐시할
 * 값이 없고, 화면을 떠나면 버려도 된다(다시 붙으면 최근 50개를 받는다).
 *
 * @param enabled false면 붙지 않는다(비로그인·게스트·닉네임 없음은 화면이 먼저 거른다)
 */
export function useLiveChat(enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatConnectionStatus>("idle");
  const [failure, setFailure] = useState<ChatFailure | null>(null);
  const [rejected, setRejected] = useState<RejectNotice | null>(null);
  const [bounced, setBounced] = useState<BouncedMessage | null>(null);
  const socketRef = useRef<ChatSocket | null>(null);
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const socket = new ChatSocket({
      getSessionUrl: fetchChatSessionUrl,
      onFrames: (frames, snapshot) => {
        const incoming: ChatMessage[] = [];
        for (const frame of frames) {
          if (frame.type === "MESSAGE") {
            incoming.push(frame);
            continue;
          }
          const at = Date.now();
          setRejected({ reason: frame.content, at });
          const last = lastSentRef.current;
          if (frame.content === "ROOM_BUSY" && last !== null) {
            setBounced({ content: last, at });
          }
        }
        if (snapshot) setMessages(replaceChatMessages(incoming));
        else if (incoming.length > 0) {
          setMessages((prev) => mergeChatMessages(prev, incoming));
        }
      },
      onStatus: (next, why) => {
        setStatus(next);
        setFailure(why ?? null);
      },
    });
    socketRef.current = socket;
    socket.start();
    return () => {
      socket.dispose();
      socketRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!rejected) return;
    const timer = setTimeout(() => setRejected(null), CHAT_REJECT_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [rejected]);

  const send = useCallback((content: string): boolean => {
    const sent = socketRef.current?.send(content) ?? false;
    if (sent) lastSentRef.current = content;
    return sent;
  }, []);

  const retry = useCallback(() => {
    setFailure(null);
    socketRef.current?.retry();
  }, []);

  return {
    messages,
    status,
    failure,
    rejected: rejected?.reason ?? null,
    bounced,
    send,
    retry,
  };
}
