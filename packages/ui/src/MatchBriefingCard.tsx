import {
  MATCH_BRIEFING_CAUTION_LABEL,
  MATCH_BRIEFING_DISCLAIMER,
  MATCH_BRIEFING_TITLE,
  matchBriefingAsOfLabel,
  type MatchBriefing,
} from "@plick/domain/match-briefing";

/**
 * AI 경기 브리핑 카드 (KAN-724). 예측 탭의 투표 아래, 여론 위에 선다. 위에서 아래로 제목과 자료
 * 기준 시각("11월 4일 12:00 기준"), 핵심 문장 1~3개, 주의사항 한 줄, 맨 아래 AI 요약이라 틀릴 수
 * 있다는 고정 안내 한 줄(KAN-729)이다.
 *
 * 경기가 시작하거나 끝난 뒤에도 같은 카드가 남는다 (KAN-735). "경기 전 요약"이라는 표기는 따로 두지
 * 않는다. 기준 시각이 킥오프 전이라는 것으로 읽힌다.
 *
 * 처음엔 "근거 보기" 토글과 출처 링크 목록이 있었는데 걷었다 (KAN-731). 링크가 404로 떨어지는
 * 경우가 있었고, 카드는 읽기만 하는 짧은 글로 둔다. 그래서 상태도 링크도 없고 누를 곳이 없다.
 *
 * 모델이 만든 문자열은 전부 JSX 텍스트 노드로만 그린다. HTML로 렌더하지 않는다. 고정 안내는 모델
 * 문구(`cautions`)와 달리 내용과 무관하게 늘 있고, 보조 글자 하한(`text-4`)에 캡션 크기다.
 *
 * 면은 `bg-elevate`에 `rounded-card`라 웹에서 각지고 테두리는 없다(홈 예측 카드와 같은 판단).
 *
 * @param briefing 검증을 거친 브리핑. 보일지 말지는 호출부(`useMatchBriefing`)가 정한다
 * @param size `sm`은 앱(패딩 14), `lg`는 웹(패딩 16)
 */
export function MatchBriefingCard({
  briefing,
  size = "sm",
  className = "",
}: {
  briefing: MatchBriefing;
  size?: "sm" | "lg";
  className?: string;
}) {
  const large = size === "lg";

  return (
    <section
      aria-label={MATCH_BRIEFING_TITLE}
      className={`rounded-card bg-elevate min-w-0 ${
        large ? "px-4 py-3.5" : "px-3.5 py-3"
      } ${className}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3
          className={`text-text-strong min-w-0 font-bold ${
            large ? "text-body-md" : "text-body"
          }`}
        >
          {MATCH_BRIEFING_TITLE}
        </h3>
        <span className="text-caption text-text-3 ml-auto shrink-0 tabular-nums">
          {matchBriefingAsOfLabel(briefing.dataAsOf)}
        </span>
      </div>
      <ul
        className={`text-text-2 mt-2 flex flex-col gap-1.5 ${
          large ? "text-body-md" : "text-body"
        }`}
      >
        {briefing.points.map((point, index) => (
          <li key={index} className="flex gap-2 leading-relaxed">
            <span
              aria-hidden
              className="bg-accent rounded-pill mt-[0.6em] size-1.5 shrink-0"
            />
            <span className="min-w-0 break-words">{point.text}</span>
          </li>
        ))}
      </ul>
      {briefing.cautions.length > 0 && (
        <p className="text-caption text-text-4 mt-2 leading-relaxed break-words">
          <span className="font-bold">{MATCH_BRIEFING_CAUTION_LABEL}</span>
          <span> · </span>
          {briefing.cautions[0]}
        </p>
      )}
      <p className="text-caption text-text-4 mt-1.5 leading-relaxed">
        {MATCH_BRIEFING_DISCLAIMER}
      </p>
    </section>
  );
}
