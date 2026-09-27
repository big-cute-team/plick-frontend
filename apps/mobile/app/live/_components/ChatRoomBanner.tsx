import Link from "next/link";
import { CHAT_ENABLED } from "@plick/core/chat";

/**
 * LIVE 목록 맨 위의 채팅방 배너 (시안 KAN-567, KAN-572 통합 방). 채운 면(radius 16)
 * 한 줄에 "채팅방", 설명, 오른쪽 끝 "들어가기"다. 누르면 `/live/chat`으로 간다.
 *
 * 전에는 경기별 방이라 오늘 진행 중인 경기가 있을 때만 그 경기의 채팅 탭으로
 * 보냈다. 이제 방은 언제나 열린 하나라 경기 일정과 무관하게 늘 선다. 시안의
 * 접속 수는 API에 없어 설명 문구로 채운다. 채팅이 꺼져 있으면(`CHAT_ENABLED`)
 * 그리지 않는다.
 */
export function ChatRoomBanner() {
  if (!CHAT_ENABLED) return null;

  return (
    <div className="px-edge pt-3">
      <Link
        href="/live/chat"
        className="bg-elevate rounded-card flex items-center gap-2 p-3 active:opacity-80"
      >
        <span className="text-body text-text-strong font-bold">채팅방</span>
        <span className="text-caption-lg text-text-3 min-w-0 truncate">
          해축 팬들과 실시간 이야기
        </span>
        <span className="flex-1" />
        <span className="text-label text-accent shrink-0 font-bold">
          들어가기
        </span>
      </Link>
    </div>
  );
}
