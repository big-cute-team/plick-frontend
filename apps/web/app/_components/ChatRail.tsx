import type { ReactNode } from "react";

/**
 * 우측 레일의 채팅방 상자 껍데기 (KAN-567, 시안 "우측 레일" 채팅방). 헤더 "채팅방"
 * 13/900과 접속 수, 본문(최소 330px), 맨 밑 입력 줄 자리다. 표시 전용 셸이라
 * 소켓도 상태도 모른다 — 메시지 줄은 `children`으로, 입력 줄은 `footer`로 받는다.
 * 실제 연결은 라이브 경기 상세의 `MatchChatPanel`이 맡고, 이 셸에 붙일 수 있게
 * `matchId`를 받아 둔다.
 *
 * 시안의 채팅방은 이슈를 구분하지 않는 통합 방 하나인데 그 API가 없다(API 공백).
 * 그래서 `CHAT_ENABLED`(`@plick/core/chat`)가 false인 동안 `SideRail`은 이 상자를
 * 그리지 않는다. 껍데기를 미리 두는 이유는 채팅이 열릴 때 레일 자리를 다시 짜지
 * 않기 위해서다.
 *
 * 메시지 한 줄의 모양은 {@link ChatRailMessage}가 정한다.
 *
 * @param matchId 이 방이 붙은 경기 id. 통합 방이면 생략
 * @param viewerCount 접속 수. BE에 없어 생략하면 헤더에 수를 그리지 않는다
 * @param children 메시지 줄들
 * @param footer 입력 줄. 생략하면 본문으로 끝난다
 */
export function ChatRail({
  matchId,
  viewerCount,
  children,
  footer,
}: {
  matchId?: number;
  viewerCount?: number;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section
      className="border-border-strong border"
      data-match-id={matchId}
      aria-label="채팅방"
    >
      <div className="border-border flex h-9.5 items-center gap-1.75 border-b px-3.25">
        <h3 className="text-body text-text-strong font-black">채팅방</h3>
        <div aria-hidden className="flex-1" />
        {viewerCount !== undefined && (
          <span className="text-caption text-text-3">{viewerCount}명 접속</span>
        )}
      </div>
      <div className="flex min-h-82.5 flex-col gap-1.75 px-3.25 py-2.75">
        {children}
      </div>
      {footer && (
        <div className="border-border flex items-center gap-1.75 border-t px-2.75 py-2.25">
          {footer}
        </div>
      )}
    </section>
  );
}

/**
 * 채팅방 상자의 메시지 한 줄 — 시각(10px 고정폭, 30px 칸), 닉네임 11/700 강조색,
 * 본문 12.5/1.45. 새 줄은 아래에서 떠오른다(`animate-rise`, 시안 hz-rise).
 *
 * @param time 표시 시각 (예: "14:35")
 * @param nickname 보낸 사람
 * @param text 본문
 */
export function ChatRailMessage({
  time,
  nickname,
  text,
}: {
  time: string;
  nickname: string;
  text: string;
}) {
  return (
    <div className="animate-rise flex items-baseline gap-2">
      <span className="text-micro text-text-3 w-7.5 shrink-0 font-mono">
        {time}
      </span>
      <div className="min-w-0">
        <span className="text-caption text-accent font-bold">{nickname}</span>
        <p className="text-label-lg text-text mt-px leading-[1.45]">{text}</p>
      </div>
    </div>
  );
}
