import type { TeamInjury } from "@plick/domain/team-profile";
import { PlayerLink } from "@/_components/PlayerLink";
import { RailCard } from "@/_components/RailCard";

/**
 * 레일 "부상자" (KAN-599, 시안 팀 프로필 1466-1478행). 다음 경기 기준 결장자 이름과 사유다.
 * 복귀 예정은 API에 없어 그 줄은 만들지 않는다. 결장자가 없으면 호출부가 카드를 뺀다.
 *
 * @param injuries 결장자
 */
export function InjuriesCard({ injuries }: { injuries: TeamInjury[] }) {
  return (
    <RailCard title="부상자">
      <ul className="px-3.5 pt-1 pb-2">
        {injuries.map((injury) => (
          <li
            key={`${injury.playerId ?? injury.name}`}
            className="border-border-soft border-b last:border-b-0"
          >
            <PlayerLink
              playerId={injury.playerId}
              className="group focus-visible:outline-accent flex flex-col gap-0.75 py-2.25 focus-visible:outline-2"
            >
              <span
                className={`text-body text-text-strong font-bold ${injury.playerId !== null ? "group-hover:text-accent" : ""}`}
              >
                {injury.name}
              </span>
              {injury.reason && (
                <span className="text-label text-text-3">{injury.reason}</span>
              )}
            </PlayerLink>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}
