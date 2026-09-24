"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CHAT_MAX_MESSAGE_LENGTH, chatRoomPhase } from "@plick/core/chat";
import type { ChatMessage, ChatRoomPhase } from "@plick/domain/chat";
import { formatChatTime } from "@plick/domain/format";
import type { MatchSummary } from "@plick/domain/live";
import { useAuth } from "@/_components/AuthProvider";
import { ONBOARDING_ENTRY } from "@/_constants/app";
import { CHAT_REJECT_MESSAGE } from "@/_constants/live";
import { useMatchChat } from "@/_hooks/useMatchChat";

/**
 * 경기 채팅 카드 (KAN-458, 모바일 `MatchChatPanel`의 데스크톱 판 → KAN-462 우측 상시
 * 패널 → KAN-567 시안 경기 상세 1035-1061행). 우측 aside 300px에 레일 테두리
 * (`border-border-strong`)를 두른 카드다. 머리 38px "채팅방" 13/900, 본문 최소 452px에
 * 채팅 줄(시각 10 mono, 닉 11/700 강조색, 본문 12.5/1.45, `animate-rise`), 아래 입력
 * 30px `bg-chip` + 채운 보내기 버튼. 시안의 "N명 접속"은 API에 없어 뺐다. 좌측 탭을
 * 바꿔도 이 카드는 같은 자리의 같은 컴포넌트라 리마운트되지 않는다. 소켓, 메시지
 * 목록, 입력 중인 글이 그대로 남는다.
 *
 * 접속 전에 화면이 먼저 거르는 것(연기, 취소(방이 열리지 않는다), 비로그인,
 * 닉네임 없음(온보딩 미완료, 서버 403), 방 닫힘(킥오프 3시간 뒤, 서버 404))은
 * 안내로 끝내고, 그 밖에는 붙어서 목록과 입력바를 그린다.
 *
 * 킥오프 30분 전(`before`)은 거르지 않고 붙어 본다. dev는 방 여는 구간을 넓혀
 * 둘 수 있어서(`CHAT_OPEN_BEFORE=720h`) 화면이 먼저 막으면 확인이 안 된다.
 *
 * @param header 경기 헤더(id, 킥오프, 상태)
 */
export function MatchChatPanel({ header }: { header: MatchSummary }) {
  const { isLoggedIn, nickname } = useAuth();
  const closed = header.status === "POSTPONED" || header.status === "CANCELLED";

  return (
    <section
      aria-label="경기 채팅"
      className="border-border-strong flex flex-col border"
    >
      <header className="border-border flex h-9.5 shrink-0 items-center border-b px-3.25">
        <h2 className="text-body text-text-strong font-black">채팅방</h2>
      </header>
      {closed ? (
        <Notice>
          {header.status === "POSTPONED"
            ? "연기된 경기라 채팅방이 열리지 않아요"
            : "취소된 경기라 채팅방이 열리지 않아요"}
        </Notice>
      ) : !isLoggedIn ? (
        <Gate
          title="로그인이 필요해요"
          body="같은 경기를 보는 사람들과 채팅하려면 로그인하세요"
          href="/login"
          cta="로그인"
        />
      ) : !nickname ? (
        <Gate
          title="닉네임을 정해 주세요"
          body="닉네임을 정하면 채팅에 참여할 수 있어요"
          href={ONBOARDING_ENTRY}
          cta="닉네임 정하기"
        />
      ) : chatRoomPhase(header.kickoffAt) === "after" ? (
        <Notice>채팅방이 닫혔어요. 경기 채팅은 킥오프 3시간 뒤에 닫혀요</Notice>
      ) : (
        <ChatRoom matchId={header.id} kickoffAt={header.kickoffAt} />
      )}
    </section>
  );
}

/**
 * 붙어 있는 방. 새 메시지는 사용자가 바닥 근처를 보고 있을 때만 따라 내려가고,
 * 지난 대화를 읽는 중이면 "새 메시지" 버튼만 띄운다.
 */
function ChatRoom({
  matchId,
  kickoffAt,
}: {
  matchId: number;
  kickoffAt: string;
}) {
  const { userId } = useAuth();
  const { messages, status, failure, rejected, send, retry } = useMatchChat(
    matchId,
    true,
  );
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (nearBottom.current) {
      list.scrollTop = list.scrollHeight;
      setUnread(0);
    } else if (messages.length > 0) {
      setUnread((n) => n + 1);
    }
  }, [messages]);

  function handleScroll() {
    const list = listRef.current;
    if (!list) return;
    nearBottom.current =
      list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (nearBottom.current) setUnread(0);
  }

  function jumpToBottom() {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    nearBottom.current = true;
    setUnread(0);
  }

  const phase = chatRoomPhase(kickoffAt);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {status === "reconnecting" && (
        <p className="bg-chip text-caption text-text-3 shrink-0 py-1 text-center">
          다시 연결하는 중
        </p>
      )}

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex max-h-[70dvh] min-h-113 flex-col gap-1.75 overflow-y-auto px-3.25 py-2.75"
        aria-live="polite"
      >
        {status === "failed" ? (
          <Failed phase={phase} failure={failure} onRetry={retry} />
        ) : messages.length === 0 ? (
          <p className="text-label-lg text-text-4 my-auto text-center">
            {status === "open"
              ? "아직 메시지가 없어요. 첫 마디를 남겨 보세요"
              : "연결 중"}
          </p>
        ) : (
          messages.map((message) => (
            <MessageRow
              key={`${message.userId}|${message.sentAt}|${message.content}`}
              message={message}
              mine={message.userId === userId}
            />
          ))
        )}
      </div>

      {unread > 0 && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="bg-accent text-on-accent text-caption-lg hover:bg-accent-hover absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 font-bold"
        >
          새 메시지 {unread}개
        </button>
      )}

      <Composer
        disabled={status !== "open"}
        rejected={rejected}
        onSend={send}
      />
    </div>
  );
}

function MessageRow({
  message,
  mine,
}: {
  message: ChatMessage;
  mine: boolean;
}) {
  return (
    <div className="animate-rise flex items-baseline gap-2">
      <span
        className="text-micro text-text-4 w-7.5 shrink-0 font-mono"
        suppressHydrationWarning
      >
        {formatChatTime(message.sentAt)}
      </span>
      <div className="min-w-0">
        <span
          className={`text-caption font-bold ${mine ? "text-accent-hover" : "text-accent"}`}
        >
          {message.nickname}
        </span>
        <p className="text-label-lg text-text mt-px leading-[1.45] break-words whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}

/**
 * 입력바. `bg-chip` 각진 인풋 30px + 채운 보내기 버튼. 글자수는 서버 검증(1~200자)을
 * 미리 걸고, 그래도 서버가 거절하면(`ERROR` 프레임) 입력바 밑에 사유를 보여준다.
 * 사유별 문구는 `CHAT_REJECT_MESSAGE`에 있고, 안내는 훅이 정한 시간 뒤에 스스로
 * 사라진다(KAN-465). 전송 한도(`RATE_LIMITED`)도 같은 자리에 뜨며 입력창은 잠그지
 * 않는다. 접속이 살아 있어 잠시 뒤 다시 보낼 수 있다.
 */
function Composer({
  disabled,
  rejected,
  onSend,
}: {
  disabled: boolean;
  rejected: string | null;
  onSend: (content: string) => boolean;
}) {
  const [value, setValue] = useState("");
  const [dropped, setDropped] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = value.trim();
    if (!content || disabled) return;
    const sent = onSend(content);
    setDropped(!sent);
    if (sent) setValue("");
  }

  const error = rejected
    ? (CHAT_REJECT_MESSAGE[rejected] ?? "메시지를 보내지 못했어요")
    : dropped
      ? "연결이 끊겨 보내지 못했어요. 다시 연결되면 보내 주세요"
      : null;

  return (
    <div className="border-border flex shrink-0 flex-col gap-1 border-t px-2.75 py-2.25">
      <form onSubmit={handleSubmit} className="flex items-center gap-1.75">
        <input
          type="text"
          value={value}
          maxLength={CHAT_MAX_MESSAGE_LENGTH}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
            setDropped(false);
          }}
          placeholder={disabled ? "연결 중" : "채팅 입력"}
          aria-label="채팅 메시지"
          className="bg-chip text-caption-lg text-text placeholder:text-text-4 h-7.5 min-w-0 flex-1 px-2.5 focus-visible:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="bg-accent text-on-accent text-caption-lg hover:bg-accent-hover h-7.5 shrink-0 px-3 font-bold transition-colors disabled:opacity-40"
        >
          보내기
        </button>
      </form>
      {error && <p className="text-caption text-danger px-0.5">{error}</p>}
    </div>
  );
}

/**
 * 핸드셰이크가 연속으로 거절돼 멈춘 상태. 브라우저는 거절 코드를 안 알려주므로
 * 킥오프 시각으로 사유를 고른다.
 */
function Failed({
  phase,
  failure,
  onRetry,
}: {
  phase: ChatRoomPhase;
  failure: string | null;
  onRetry: () => void;
}) {
  const message =
    failure === "auth"
      ? "로그인이 만료됐어요. 다시 로그인해 주세요"
      : phase === "before"
        ? "채팅방은 킥오프 30분 전에 열려요"
        : "채팅에 연결하지 못했어요";
  return (
    <div className="my-auto flex flex-col items-center gap-2.5">
      <p className="text-label-lg text-text-4 text-center">{message}</p>
      {failure === "auth" ? (
        <Link
          href="/login"
          className="text-label-lg text-accent hover:text-accent-hover font-bold"
        >
          로그인
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className="text-label-lg text-accent hover:text-accent-hover font-bold"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

function Gate({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex min-h-113 flex-col items-center justify-center gap-1.5 px-4 py-10 text-center">
      <p className="text-body-md text-text-strong font-black">{title}</p>
      <p className="text-label-lg text-text-3">{body}</p>
      <Link
        href={href}
        className="bg-accent text-on-accent text-label-lg hover:bg-accent-hover mt-3 h-8 px-4 leading-8 font-bold transition-colors"
      >
        {cta}
      </Link>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-label-lg text-text-4 flex min-h-113 items-center justify-center px-4 py-10 text-center">
      <span>{children}</span>
    </p>
  );
}
