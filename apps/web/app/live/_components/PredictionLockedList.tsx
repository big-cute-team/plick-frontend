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
 * 의견 잠금 지면 (KAN-696, 시안 가이드 §5.4, 모바일 `PredictionLockedList`의 웹 판). OPEN에서
 * 아직 예측하지 않은 사람에게 보인다. 그 위에 안내 문구와 작성 버튼이 선다. 웹은 각진 막대고
 * 행 간격이 조금 넉넉하다.
 *
 * 행은 두 가지다(KAN-714). 서버가 잠금 응답에 의견 행(닉네임과 마이팀만 있고 본문은 빈 것)을 실어
 * 주면 그 닉네임을 그대로 보이고 본문 자리만 회색 막대에 블러를 건다. 아직 빈 목록이면(BE 후속 전)
 * 전처럼 가짜 행 네 개에 블러를 걸어 실루엣만 만든다. 어느 쪽이든 실제 의견 본문은 DOM에 없다.
 *
 * 잠금 영역은 어디를 눌러도 작성이 열린다. 블러 아래는 `aria-hidden`과 포인터 이벤트 꺼짐이라
 * 스크린리더와 클릭 모두 안내 문구와 버튼만 만난다.
 *
 * @param onCompose 작성 팝업을 열 때
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
                className="border-border-soft border-b py-4"
              >
                <div className="flex items-center gap-2">
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
                  <span className="bg-chip h-2.5 w-24 blur-[0.375rem]" />
                  <span className="bg-chip h-5.5 w-14 blur-[0.375rem]" />
                </div>
                <div className="blur-[0.375rem]">
                  <span className="bg-chip mt-2.5 block h-3 w-full" />
                  <span className="bg-chip mt-1.5 block h-3 w-3/4" />
                </div>
              </div>
            ))
          : Array.from({ length: PREDICTION_FAKE_ROWS }, (_, i) => (
              <div
                key={i}
                className="border-border-soft border-b py-4 blur-[0.375rem]"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-avatar size-4 rounded-full" />
                  <span className="bg-chip h-3 w-20" />
                  <span className="bg-chip h-2.5 w-24" />
                  <span className="bg-chip h-5.5 w-14" />
                </div>
                <span className="bg-chip mt-2.5 block h-3 w-full" />
                <span className="bg-chip mt-1.5 block h-3 w-3/4" />
              </div>
            ))}
      </div>
      <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-3 px-4 pt-16">
        <p className="text-body-lg text-text-strong text-center font-bold text-pretty">
          {PREDICTION_LOCK_NOTICE}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCompose();
          }}
          className="bg-accent text-on-accent text-body-md hover:bg-accent-hover focus-visible:outline-accent inline-flex h-9.5 items-center px-4.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {PREDICTION_COMPOSE_LABEL}
        </button>
      </div>
    </div>
  );
}
