import { TEAMS } from "@plick/domain/constants";
import type { PredictionOpinion } from "@plick/domain/prediction";
import { TeamCrest } from "@plick/ui/TeamCrest";
import {
  PREDICTION_COMPOSE_LABEL,
  PREDICTION_FAKE_ROWS,
  PREDICTION_LOCK_NOTICE,
  PREDICTION_LOCKED_NAMED_ROWS,
} from "@/_constants/predictions";

/**
 * 의견 잠금 지면 (KAN-696, 시안 가이드 §5.4). OPEN에서 아직 예측하지 않은 사람에게 보인다.
 * 그 위 가운데에 안내 문구와 작성 버튼이 선다.
 *
 * 행은 두 가지다(KAN-714). 서버가 잠금 응답에 의견 행(닉네임과 마이팀만 있고 본문은 빈 것)을 실어
 * 주면 그 닉네임을 그대로 보이고 본문 자리만 회색 막대에 블러를 건다. 누가 썼는지는 보여야
 * 궁금해진다는 피드백이다. 아직 빈 목록이면(BE 후속 전) 전처럼 회색 막대 가짜 행 네 개에 블러를
 * 걸어 "여기 의견이 있다"는 실루엣만 만든다. 어느 쪽이든 실제 의견 본문은 DOM에 없다.
 *
 * 잠금 영역은 어디를 눌러도 작성이 열린다. 블러 아래는 `aria-hidden`과 포인터 이벤트 꺼짐이라
 * 스크린리더와 탭 모두 안내 문구와 버튼만 만난다. 바깥 상자의 클릭은 보너스 동선이고 접근성 이름과
 * 키보드 동선은 안쪽 진짜 버튼이 맡는다.
 *
 * @param onCompose 작성 시트를 열 때
 * @param opinions 잠금 응답에 실린 의견 행. 본문은 비어 있고 닉네임만 쓴다. 없거나 비면 가짜 행
 */
export function PredictionLockedList({
  onCompose,
  opinions = [],
}: {
  onCompose: () => void;
  opinions?: readonly PredictionOpinion[];
}) {
  const named = opinions.slice(0, PREDICTION_LOCKED_NAMED_ROWS);
  return (
    <div className="relative min-h-55 cursor-pointer" onClick={onCompose}>
      <div aria-hidden className="pointer-events-none select-none">
        {named.length > 0
          ? named.map((opinion) => (
              <div
                key={opinion.id}
                className="border-border-soft border-b py-3.5"
              >
                <div className="flex items-center gap-1.5">
                  {opinion.author.favoriteTeam ? (
                    <TeamCrest
                      team={TEAMS[opinion.author.favoriteTeam]}
                      size={16}
                      decorative
                    />
                  ) : (
                    <span className="bg-avatar size-4 rounded-full" />
                  )}
                  <span className="text-body text-text-strong truncate font-bold">
                    {opinion.author.nickname}
                  </span>
                  <span className="bg-chip rounded-badge h-2.5 w-20 blur-[0.375rem]" />
                </div>
                <div className="blur-[0.375rem]">
                  <span className="bg-chip rounded-badge mt-2 block h-5.5 w-14" />
                  <span className="bg-chip rounded-badge mt-2 block h-3 w-full" />
                  <span className="bg-chip rounded-badge mt-1.5 block h-3 w-4/5" />
                </div>
              </div>
            ))
          : Array.from({ length: PREDICTION_FAKE_ROWS }, (_, i) => (
              <div
                key={i}
                className="border-border-soft border-b py-3.5 blur-[0.375rem]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="bg-avatar size-4 rounded-full" />
                  <span className="bg-chip rounded-badge h-3 w-16" />
                  <span className="bg-chip rounded-badge h-2.5 w-20" />
                </div>
                <span className="bg-chip rounded-badge mt-2 block h-5.5 w-14" />
                <span className="bg-chip rounded-badge mt-2 block h-3 w-full" />
                <span className="bg-chip rounded-badge mt-1.5 block h-3 w-4/5" />
              </div>
            ))}
      </div>
      <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-3 px-4 pt-14">
        <p className="text-body-md text-text-strong text-center font-bold text-pretty">
          {PREDICTION_LOCK_NOTICE}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCompose();
          }}
          className="bg-accent text-on-accent rounded-control text-body-md inline-flex h-10 items-center px-4 font-bold active:opacity-80"
        >
          {PREDICTION_COMPOSE_LABEL}
        </button>
      </div>
    </div>
  );
}
