"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CHAT_ENABLED, chatMessageKey } from "@plick/core/chat";
import type { ChatMessage } from "@plick/domain/chat";
import { useAuth } from "@/_components/AuthProvider";
import { HOME_CHAT_ROWS, HOME_CHAT_WATCH_MARGIN } from "@/_constants/live";
import { useLiveChat } from "@/_hooks/useLiveChat";
import { useOnScreen } from "@/_hooks/useOnScreen";
import { nextTickerRows, settleTickerRows } from "@/_utils/chat-ticker";

/**
 * 홈 핫이슈 바로 위의 채팅방 띠 (KAN-684). 통합 채팅방(KAN-572)의 마지막 세 줄을 보여주고 누르면
 * `/live/chat`으로 간다. 높이는 세 줄로 고정이고, 새 글이 오면 아래에서 한 줄 떠오르며 맨 윗줄이
 * 밀려나 사라진다. LIVE 목록의 `ChatRoomBanner`와 같은 자리 구실인데 글이 흐르는 것을 보여줘
 * 들어오게 하는 게 다르다. 채팅이 꺼져 있으면(`CHAT_ENABLED`) 그리지 않는다.
 *
 * 방에는 경기 상세 채팅 탭과 같은 `useLiveChat`으로 붙는다. 입장 지급분(최근 50개)과 실시간
 * 프레임을 그대로 받되 띠는 끝 세 줄만 들고 나머지는 버린다(`nextTickerRows`).
 *
 * 붙어 있는 조건은 셋이다. 세션과 닉네임이 있고(없으면 서버가 403으로 거절해 헛돈다), 띠가 뷰포트
 * 근처에 있고, 탭이 앞에 있다(`useOnScreen`). 홈은 가장 많이 열리는 화면이라 방문마다 소켓을 열어
 * 두면 소식을 읽느라 내려간 사람과 뒤로 보낸 탭에까지 방송이 나간다. 보지 않는 동안은 끊고 돌아오면
 * 다시 붙어 지급분으로 갈아 끼운다. 숨길 때 끊으니 열린 소켓이 홈의 bfcache 진입을 막지도 않는다.
 *
 * 로그인·닉네임 안내와 연결 실패는 여기서 말하지 않는다. 띠는 방을 들여다보는 창이지 방이 아니라서,
 * 그럴 땐 참여 문구만 두고 들어가서 안내를 받게 한다.
 */
export function HomeChatRoom() {
  if (!CHAT_ENABLED) return null;
  return <ChatRoomCard />;
}

function ChatRoomCard() {
  const { isLoggedIn, isSessionPending, isProfilePending, nickname, userId } =
    useAuth();
  const ref = useRef<HTMLAnchorElement>(null);
  const onScreen = useOnScreen(ref, HOME_CHAT_WATCH_MARGIN);
  const ready = isLoggedIn && nickname !== null;
  const { messages, status } = useLiveChat(ready && onScreen);

  /* 훅 목록이 바뀐 그 렌더에서 줄을 맞춘다. 새 글만 고르려면 지난 목록이 필요해 state로 들고,
     effect로 미루면 한 번 더 그리게 돼 렌더 중 비교로 처리한다(`Composer`의 되돌리기와 같은 패턴) */
  const [seen, setSeen] = useState(messages);
  const [rows, setRows] = useState<ChatMessage[]>([]);
  if (messages !== seen) {
    setSeen(messages);
    const next = nextTickerRows(rows, seen, messages, HOME_CHAT_ROWS);
    if (next !== rows) setRows(next);
  }

  function handleSettle(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    setRows((prev) => settleTickerRows(prev, HOME_CHAT_ROWS));
  }

  /* 들어가도 방이 안 열리는 상태. 띠는 기다리지 않고 참여 문구로 끝낸다 */
  const blocked =
    (!isLoggedIn && !isSessionPending) ||
    (isLoggedIn && nickname === null && !isProfilePending) ||
    status === "failed";

  return (
    <div className="px-edge pt-3">
      <Link
        ref={ref}
        href="/live/chat"
        className="bg-elevate rounded-card flex flex-col gap-2 p-3 active:opacity-80"
      >
        <span className="flex items-center gap-2">
          <span className="text-body text-text-strong font-bold">채팅방</span>
          <span className="text-caption-lg text-text-3 min-w-0 truncate">
            해축 팬들과 실시간 이야기
          </span>
          <span className="flex-1" />
          <span className="text-label text-accent shrink-0 font-bold">
            들어가기
          </span>
        </span>

        <div className="flex h-18 flex-col justify-end overflow-hidden">
          {rows.length > 0 ? (
            rows.map((message, i) => (
              <TickerRow
                key={chatMessageKey(message)}
                message={message}
                mine={message.userId === userId}
                leaving={i < rows.length - HOME_CHAT_ROWS}
                onSettle={i === rows.length - 1 ? handleSettle : undefined}
              />
            ))
          ) : blocked ? (
            <Notice>실시간 채팅에 참여해 보세요</Notice>
          ) : status === "open" ? (
            <Notice>아직 메시지가 없어요. 첫 마디를 남겨 보세요</Notice>
          ) : (
            <TickerSkeleton />
          )}
        </div>
      </Link>
    </div>
  );
}

/**
 * 띠의 한 줄. 닉네임과 본문을 한 줄에 두고 넘치면 자른다. 닉네임 색은 패널의 `MessageRow`와 같다.
 *
 * 들어올 때는 `animate-ticker`로 높이 0에서 펴진다. 안쪽을 바닥에 붙여 두어 바깥이 펴지는 동안 글이
 * 아래에서 올라오는 것처럼 보인다. 바닥에 붙은 열에서 아래 줄이 자라면 윗줄은 그만큼 위로 밀려
 * 상자 밖으로 잘려 나가고, 밀려나는 줄(`leaving`)은 `animate-fade-out`으로 흐려진다. 맨 마지막 줄의
 * 전환이 끝나면 `onSettle`이 밀려난 줄을 버린다. 한 묶음으로 들어온 줄들은 같은 순간 끝나므로 마지막
 * 하나만 들으면 된다.
 *
 * @param message 그릴 글
 * @param mine 내 글이면 닉네임을 진한 글자로
 * @param leaving 새 줄에 밀려 나가는 중인가
 * @param onSettle 들어오는 전환이 끝났을 때(마지막 줄만 받는다)
 */
function TickerRow({
  message,
  mine,
  leaving,
  onSettle,
}: {
  message: ChatMessage;
  mine: boolean;
  leaving: boolean;
  onSettle?: (e: React.AnimationEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onAnimationEnd={onSettle}
      className={`relative h-6 shrink-0 overflow-hidden motion-reduce:animate-none ${leaving ? "animate-fade-out" : "animate-ticker"}`}
    >
      <span className="absolute inset-x-0 bottom-0 flex h-6 items-center gap-1.5">
        <span
          className={`text-caption-lg shrink-0 font-bold ${mine ? "text-text-strong" : "text-accent"}`}
        >
          {message.nickname}
        </span>
        <span className="text-body text-text min-w-0 truncate">
          {message.content}
        </span>
      </span>
    </div>
  );
}

/** 줄 대신 띄우는 한 줄 문구. 세 줄 높이 가운데에 선다. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-body text-text-4 my-auto text-center">{children}</p>
  );
}

/** 붙는 동안의 줄 실루엣. 닉네임 칸과 본문 칸을 세 줄 높이에 맞춰 깐다. */
function TickerSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col">
      {Array.from({ length: HOME_CHAT_ROWS }, (_, i) => (
        <div key={i} className="flex h-6 shrink-0 items-center gap-1.5">
          <div className="bg-avatar rounded-pill h-3 w-12" />
          <div
            className={`bg-avatar rounded-pill h-3.5 ${i % 2 ? "w-1/2" : "w-3/4"}`}
          />
        </div>
      ))}
    </div>
  );
}
