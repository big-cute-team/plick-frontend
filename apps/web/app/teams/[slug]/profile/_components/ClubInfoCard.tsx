import { placeLabel, type TeamInfo } from "@plick/domain/team-profile";
import { RailCard } from "./RailCard";

/**
 * 레일 "구단 정보" (KAN-599, 시안 팀 프로필 1436-1447행). 감독, 홈구장, 수용 인원, 연고지,
 * 창단. 구장과 연고지는 BE가 영문 원본을 줘서 빅6 표기만 한글로 바꾼다(`placeLabel`).
 * 값이 null인 줄은 "-"로 둔다.
 *
 * @param info 구단 정보(호출부가 null이면 카드를 그리지 않는다)
 */
export function ClubInfoCard({ info }: { info: TeamInfo }) {
  const facts = [
    { label: "감독", value: info.coachName },
    { label: "홈구장", value: info.stadium && placeLabel(info.stadium) },
    {
      label: "수용 인원",
      value: info.capacity && `${info.capacity.toLocaleString("ko-KR")}석`,
    },
    { label: "연고지", value: info.city && placeLabel(info.city) },
    { label: "창단", value: info.founded && `${info.founded}년` },
  ];
  return (
    <RailCard title="구단 정보">
      <dl className="px-3.5 pt-1 pb-2">
        {facts.map(({ label, value }) => (
          <div
            key={label}
            className="border-border-soft flex items-baseline gap-2.5 border-b py-2"
          >
            <dt className="text-label text-text-3 w-15.5 shrink-0">{label}</dt>
            <dd className="text-body text-text-strong min-w-0 flex-1 font-medium tabular-nums">
              {value || "-"}
            </dd>
          </div>
        ))}
      </dl>
    </RailCard>
  );
}
