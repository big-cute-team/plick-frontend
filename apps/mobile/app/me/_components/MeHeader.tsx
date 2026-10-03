import type { Team } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import type { MyActivityCounts } from "@/_types/activity";
import { ActivityCountsLine } from "./ActivityCountsLine";

/**
 * MY 머리 (KAN-567, 시안 MY 메인 상단). 닉네임 22/900 옆에 응원팀 엠블럼을
 * 가로로 늘어놓고 아래에 "댓글 N, 좋아요 N"을 둔다. 아바타는 그리지 않는다
 * (시안 전역 규칙). 응원팀 수정과 계정 정보는 바로 아래 "계정" 행이 맡는다.
 *
 * @param nickname 표시 닉네임
 * @param teams 응원팀 레지스트리 항목 목록 (비어 있을 수 있음)
 * @param counts 서버가 미리 받은 활동 개수 씨앗. 없으면 클라가 받는다
 */
export function MeHeader({
  nickname,
  teams,
  counts,
}: {
  nickname: string;
  teams: Team[];
  counts?: { counts: MyActivityCounts; fetchedAt: number };
}) {
  return (
    <header className="px-edge pt-5 pb-4">
      <div className="flex items-center gap-2.5">
        <h1 className="text-section tracking-title text-text-strong truncate font-black">
          {nickname}
        </h1>
        {teams.length > 0 && (
          <ul className="flex shrink-0 gap-1">
            {teams.map((team) => (
              <li key={team.code}>
                <TeamCrest team={team} size={22} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <ActivityCountsLine initial={counts} />
    </header>
  );
}
