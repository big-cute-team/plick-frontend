"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatSocket,
  fetchChatSessionUrl,
  mergeChatMessages,
} from "@plick/core/chat";
import type {
  ChatConnectionStatus,
  ChatFailure,
  ChatMessage,
} from "@plick/domain/chat";

/**
 * 경기 채팅 접속 훅 (KAN-458). `@plick/core/chat`의 `ChatSocket`을 감싸 메시지
 * 목록과 연결 상태를 React 상태로 옮긴다. 재접속 정책(4000의 retry, 백오프,
 * 핸드셰이크 연속 실패 멈춤)은 전부 소켓 클래스가 갖고, 여기는 프레임을 메시지와
 * 거절 통보로 갈라 담기만 한다. web `useMatchChat`과 같은 코드의 수동 복제다.
 *
 * TanStack Query를 쓰지 않는 이유: 요청·응답이 아니라 열려 있는 연결이라 캐시할
 * 값이 없고, 메시지는 경기 중에만 살아 화면을 떠나면 버려도 된다(다시 붙으면
 * 최근 20개를 받는다).
 *
 * @param matchId 경기 id
 * @param enabled false면 붙지 않는다(비로그인·닉네임 없음·방 닫힘은 화면이 먼저 거른다)
 */
export function useMatchChat(matchId: number, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatConnectionStatus>("idle");
  const [failure, setFailure] = useState<ChatFailure | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const socketRef = useRef<ChatSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const socket = new ChatSocket({
      getSessionUrl: () => fetchChatSessionUrl(matchId),
      onFrames: (frames) => {
        const incoming: ChatMessage[] = [];
        for (const frame of frames) {
          if (frame.type === "MESSAGE") incoming.push(frame);
          else setRejected(frame.content);
        }
        if (incoming.length > 0) {
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
  }, [matchId, enabled]);

  const send = useCallback((content: string): boolean => {
    setRejected(null);
    return socketRef.current?.send(content) ?? false;
  }, []);

  const retry = useCallback(() => {
    setFailure(null);
    socketRef.current?.retry();
  }, []);

  const clearRejected = useCallback(() => setRejected(null), []);

  return { messages, status, failure, rejected, send, retry, clearRejected };
}
