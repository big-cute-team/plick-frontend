"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SendMiniIcon } from "@plick/ui/icons";
import { CHAT_MAX_MESSAGE_LENGTH, chatRoomPhase } from "@plick/core/chat";
import type { ChatMessage, ChatRoomPhase } from "@plick/domain/chat";
import { formatChatTime } from "@plick/domain/format";
import type { MatchSummary } from "@plick/domain/live";
import { useAuth } from "@/_components/AuthProvider";
import { ONBOARDING_ENTRY } from "@/_constants/app";
import { CHAT_REJECT_MESSAGE } from "@/_constants/live";
import { useMatchChat } from "@/_hooks/useMatchChat";

/**
 * 경기 채팅 탭 (KAN-458). 접속 전에 화면이 먼저 거르는 세 가지 — 비로그인,
 * 닉네임 없음(온보딩 미완료, 서버 403), 방 닫힘(킥오프 3시간 뒤, 서버 404) —
 * 는 안내 지면으로 끝내고, 그 밖에는 붙어서 목록과 입력바를 그린다.
 *
 * 킥오프 30분 전(`before`)은 거르지 않고 붙어 본다. 서버는 404로 거절하지만
 * dev는 방 여는 구간을 넓혀 둘 수 있어서(`CHAT_OPEN_BEFORE=720h`) 화면이 먼저
 * 막으면 확인이 안 된다. 거절되면 그때 킥오프 시각으로 문구를 고른다.
 *
 * 비로그인 처리(티켓 확인 항목): 탭은 보이되 안에서 로그인을 권한다. 서버가
 * 읽기도 로그인을 요구하므로 미리보기 없이 안내만 있다.
 *
 * @param header 경기 헤더(id·킥오프)
 */
export function MatchChatPanel({ header }: { header: MatchSummary }) {
  const { isLoggedIn, nickname } = useAuth();

  if (!isLoggedIn) {
    return (
      <Gate
        title="로그인이 필요해요"
        body="같은 경기를 보는 사람들과 채팅하려면 로그인하세요."
        href="/login"
        cta="로그인 하러 가기"
      />
    );
  }
  if (!nickname) {
    return (
      <Gate
        title="닉네임을 정해 주세요"
        body="닉네임을 정하면 채팅에 참여할 수 있어요."
        href={ONBOARDING_ENTRY}
        cta="닉네임 정하러 가기"
      />
    );
  }
  if (chatRoomPhase(header.kickoffAt) === "after") {
    return (
      <Notice>
        채팅방이 닫혔어요
        <br />
        경기 채팅은 킥오프 3시간 뒤에 닫혀요
      </Notice>
    );
  }
  return <ChatRoom matchId={header.id} kickoffAt={header.kickoffAt} />;
}

/**
 * 붙어 있는 방. 목록은 안에서만 스크롤하고 입력바는 아래 고정이다.
 *
 * 자동 스크롤: 새 메시지가 오면 사용자가 바닥 근처를 보고 있을 때만 따라 내려간다.
 * 위로 올려 지난 대화를 읽는 중이면 끌어내리지 않고 "새 메시지" 버튼만 띄운다.
 */
function ChatRoom({
  matchId,
  kickoffAt,
}: {
  matchId: number;
  kickoffAt: string;
}) {
  const { userId } = useAuth();
  const { messages, status, failure, rejected, send, retry, clearRejected } =
    useMatchChat(matchId, true);
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
        <p className="bg-elevate text-caption text-text-3 shrink-0 py-1.5 text-center">
          다시 연결하는 중…
        </p>
      )}

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="px-edge flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain py-3"
        aria-live="polite"
      >
        {status === "failed" ? (
          <Failed phase={phase} failure={failure} onRetry={retry} />
        ) : messages.length === 0 ? (
          <p className="text-body text-text-4 my-auto text-center">
            {status === "open"
              ? "아직 메시지가 없어요. 첫 마디를 남겨 보세요"
              : "연결 중…"}
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
          className="bg-accent text-on-accent rounded-pill text-label absolute bottom-16 left-1/2 -translate-x-1/2 px-3.5 py-1.5 font-bold shadow-md active:opacity-80"
        >
          새 메시지 {unread}개 ↓
        </button>
      )}

      <Composer
        disabled={status !== "open"}
        rejected={rejected}
        onSend={send}
        onChange={clearRejected}
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
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-label font-bold ${mine ? "text-accent" : "text-text"}`}
        >
          {message.nickname}
        </span>
        <span className="text-micro text-text-4" suppressHydrationWarning>
          {formatChatTime(message.sentAt)}
        </span>
      </div>
      <p className="text-body text-text-2 leading-body break-words whitespace-pre-wrap">
        {message.content}
      </p>
    </div>
  );
}

/**
 * 입력바. 댓글 입력바(`CommentComposer`)와 같은 pill 인풋 + accent 원형 전송 버튼이다.
 * 글자수는 서버 검증(1~200자)을 미리 건다 — `maxLength`로 초과 입력을 막고 공백만
 * 입력은 보내지 않는다. 그래도 서버가 거절하면(`ERROR` 프레임) 입력바 밑에 사유를
 * 보여주고 입력값은 남긴다.
 *
 * 하단 여백은 홈 인디케이터를 피해 `--safe-bottom`을 더한다.
 */
function Composer({
  disabled,
  rejected,
  onSend,
  onChange,
}: {
  disabled: boolean;
  rejected: string | null;
  onSend: (content: string) => boolean;
  onChange: () => void;
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
    <div
      className="border-border px-edge flex shrink-0 flex-col gap-1.5 border-t pt-2"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)" }}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <input
          type="text"
          value={value}
          maxLength={CHAT_MAX_MESSAGE_LENGTH}
          disabled={disabled}
          enterKeyHint="send"
          onChange={(e) => {
            setValue(e.target.value);
            setDropped(false);
            onChange();
          }}
          placeholder={disabled ? "연결 중…" : "메시지 보내기"}
          aria-label="채팅 메시지"
          className="bg-elevate-2 border-border text-body text-text placeholder:text-text-4 rounded-pill h-11 min-w-0 flex-1 border px-4 focus-visible:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="보내기"
          disabled={disabled || value.trim().length === 0}
          className="bg-accent text-on-accent grid size-11 shrink-0 place-items-center rounded-full active:opacity-60 disabled:opacity-40"
        >
          <SendMiniIcon size={17} />
        </button>
      </form>
      {error && <p className="text-caption text-danger px-1">{error}</p>}
    </div>
  );
}

/**
 * 핸드셰이크가 연속으로 거절돼 멈춘 상태. 브라우저는 거절 코드를 안 알려주므로
 * 킥오프 시각으로 사유를 고른다 — 아직 30분 전이면 "안 열렸다", 열려 있어야 할
 * 시각이면 연결 실패로 본다.
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
    <div className="my-auto flex flex-col items-center gap-3">
      <p className="text-body text-text-4 text-center">{message}</p>
      {failure === "auth" ? (
        <Link
          href="/login"
          className="bg-accent text-on-accent rounded-control text-label px-4 py-2 font-bold active:opacity-60"
        >
          로그인 하러 가기
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className="bg-elevate text-text-2 rounded-control text-label px-4 py-2 font-bold active:opacity-60"
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
    <div className="px-edge flex flex-1 flex-col items-center justify-center gap-2 py-12">
      <p className="text-body-lg text-text font-extrabold">{title}</p>
      <p className="text-label text-text-3 text-center">{body}</p>
      <Link
        href={href}
        className="bg-accent text-on-accent rounded-control text-body mt-3 px-5 py-2.5 font-extrabold active:opacity-60"
      >
        {cta}
      </Link>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-body text-text-4 px-edge flex flex-1 items-center justify-center py-12 text-center">
      <span>{children}</span>
    </p>
  );
}
