import Link from "next/link";
import { CHAT_ENABLED } from "@plick/core/chat";
import { liveTeamLabel, type MatchSummary } from "@plick/domain/live";
import { liveChatMatch } from "@/_utils/live";

/**
 * LIVE 목록 맨 위의 채팅방 배너 (시안 KAN-567). 채운 면(radius 16) 한 줄에
 * "채팅방", 경기 표기, 오른쪽 끝 "들어가기"다.
 *
 * 시안은 이슈를 구분하지 않는 통합 채팅방 하나와 접속 수를 두는데 둘 다 API에
 * 없다. 있는 것은 경기별 채팅(KAN-458)이라, 오늘 진행 중인 경기가 있을 때 그
 * 경기의 채팅 탭으로 보내는 배너로 만들었다. 채팅이 열려 있으면 상세의 첫 탭이
 * 채팅이라 경기 상세 URL이 곧 채팅 탭이다. 접속 수 자리는 경기 표기로 채운다.
 * 채팅이 닫혀 있거나(`CHAT_ENABLED`) 진행 중 경기가 없으면 그리지 않는다.
 *
 * @param matches 오늘(KST) 경기 목록
 */
export function ChatRoomBanner({ matches }: { matches: MatchSummary[] }) {
  if (!CHAT_ENABLED) return null;
  const match = liveChatMatch(matches);
  if (!match) return null;

  return (
    <div className="px-edge pt-3">
      <Link
        href={`/live/matches/${match.id}`}
        className="bg-elevate rounded-card flex items-center gap-2 p-3 active:opacity-80"
      >
        <span className="text-body text-text-strong font-bold">채팅방</span>
        <span className="text-caption-lg text-text-3 min-w-0 truncate">
          {liveTeamLabel(match.home)} vs {liveTeamLabel(match.away)}
        </span>
        <span className="flex-1" />
        <span className="text-label text-accent shrink-0 font-bold">
          들어가기
        </span>
      </Link>
    </div>
  );
}
