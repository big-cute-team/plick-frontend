import type { DebateListItem, VoteOption } from "@plick/domain/types";
import { ParticipationStatus } from "./ParticipationStatus";
import { CheckIcon } from "./icons";
import { OpinionTeaser } from "./OpinionTeaser";

/** VS 목록의 표시 전용 카드. 링크는 앱이 감싸고 참여는 상세에서 한다. */
export function BalanceGameCard({
  debate,
  myVote,
  closed,
}: {
  debate: DebateListItem;
  myVote: VoteOption | null;
  closed: boolean;
}) {
  const revealed = closed || myVote !== null;
  const total = debate.voteCountA + debate.voteCountB;
  const a = total > 0 ? Math.round((debate.voteCountA / total) * 100) : 0;
  const percentages = [a, total > 0 ? 100 - a : 0];
  return (
    <article className="bg-elevate rounded-card flex h-full w-full min-w-0 flex-col p-4">
      <div className="text-label text-text-3 mb-2">
        {closed ? (
          <span className="flex min-h-6 items-center">마감</span>
        ) : (
          <ParticipationStatus label="투표 중" closesAt={debate.closesAt} />
        )}
      </div>
      <h3 className="text-title text-text-strong leading-snug font-black">
        {debate.topic}
      </h3>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-5">
        <p className="text-body-lg text-text-strong text-center font-bold break-words">
          {debate.optionA}
        </p>
        <span className="text-label text-text-4 font-bold">VS</span>
        <p className="text-body-lg text-text-strong text-center font-bold break-words">
          {debate.optionB}
        </p>
      </div>
      <div
        role="img"
        aria-label={
          revealed
            ? `${debate.optionA} ${percentages[0]}%, ${debate.optionB} ${percentages[1]}%`
            : "투표 분포, 비공개"
        }
        className="rounded-tile flex h-9 gap-0.5 overflow-hidden"
      >
        {(["OPTION_A", "OPTION_B"] as const).map((option, index) => (
          <div
            key={option}
            className={`text-label flex min-w-14 items-center justify-center gap-1 font-bold transition-[flex-grow] duration-600 motion-reduce:transition-none ${index === 0 ? "bg-accent text-on-accent" : "bg-accent-bright text-text-strong"}`}
            style={{
              flex: `${revealed && total > 0 ? percentages[index] : 1} 1 0px`,
            }}
          >
            {revealed ? `${percentages[index]}%` : "?%"}
            {myVote === option && <CheckIcon size={13} aria-label="내 선택" />}
          </div>
        ))}
      </div>
      <OpinionTeaser locked={!revealed} opinion={debate.topOpinion} />
      <p className="text-label text-text-3 mt-auto pt-2">
        <span
          key={total}
          className="animate-rise inline-block tabular-nums motion-reduce:animate-none"
        >
          {total.toLocaleString()}명 참여
        </span>
      </p>
    </article>
  );
}
