import Link from "next/link";
import { getMatches } from "@plick/core/live";
import {
  activeMatches,
  matchStatusLabel,
  todayDateKeyKst,
  type MatchSummary,
} from "@plick/domain/live";
import { LiveCrest } from "@plick/ui/LiveCrest";

/**
 * 오늘 경기 목록을 받는다. 띠는 부가 정보라 실패를 빈 배열로 접는다 — 자리를
 * 비워 두면 경기가 없는 날과 똑같이 보이고 그게 맞는 처리다.
 */
async function loadToday(): Promise<MatchSummary[]> {
  try {
    return await getMatches(todayDateKeyKst());
  } catch (error) {
    console.error("[live-strip] 오늘 경기 로드 실패:", error);
    return [];
  }
}

/**
 * 상단 바 아래 LIVE 띠 (KAN-567, 시안 "라이브 띠"). 왼쪽에 빨간 막대와 `LIVE`,
 * 이어서 오늘(KST) 경기 칸이 경기 수만큼 선다 — 홈 엠블럼 22, 스코어 14/900, 원정
 * 엠블럼, 진행 중이면 빨간 분, 끝났으면 "종료", 아직이면 킥오프 시각. 칸을 누르면
 * 그 경기 상세다. 홈, 기사, 투표, 프로필 페이지가 `SiteHeader` 바로 밑에 둔다.
 * 모바일 홈의 `TodayMatchBanner`가 한 경기만 대표로 세우는 것과 달리 폭이 넓어
 * 전부 늘어놓고, 넘치면 가로 스크롤이다.
 *
 * 시안 오른쪽 끝의 "채팅방 N명 / 들어가기"는 통합 채팅방 API가 없어 뺐다(API 공백).
 *
 * 경기가 없는 날과 취소·연기만 있는 날에는 아무것도 그리지 않는다 — 빈 띠는 소음이다.
 * 목록은 여기서 직접 받는다(`getMatches`, 서버 캐시 20초). 페이지가 이미 같은
 * 목록을 받아 뒀으면 `matches`로 넘겨 이중 호출과 레이아웃 시프트를 피한다(홈).
 *
 * @param matches 오늘 경기 목록. 생략하면 여기서 받는다
 * @param currentMatchId 지금 보고 있는 경기 id. 그 칸에 강조색 밑줄을 긋는다(경기 상세)
 */
export async function LiveStrip({
  matches,
  currentMatchId,
}: {
  matches?: MatchSummary[];
  currentMatchId?: number;
}) {
  const today = activeMatches(matches ?? (await loadToday()));
  if (today.length === 0) return null;

  return (
    <nav aria-label="오늘 경기" className="border-border border-b">
      <div className="max-w-page no-scrollbar mx-auto flex h-14 w-full items-stretch overflow-x-auto">
        <div className="pl-gutter flex shrink-0 items-center gap-2 pr-5">
          <span aria-hidden className="bg-danger h-4 w-0.75" />
          <span className="text-caption tracking-live text-danger font-black">
            LIVE
          </span>
        </div>
        {today.map((match) => (
          <MatchCell
            key={match.id}
            match={match}
            current={match.id === currentMatchId}
          />
        ))}
        <div aria-hidden className="border-border-soft flex-1 border-l" />
      </div>
    </nav>
  );
}

/**
 * 띠의 경기 칸 하나 — 왼쪽 선으로 이웃과 나뉜다. 스코어는 킥오프 전이면 둘 다
 * null이라 "vs"로 그린다. 상태 글자는 도메인 {@link matchStatusLabel}의 첫 줄이다
 * (진행 중 분, 종료 코드는 "종료"로 접는다, 예정은 킥오프 시각).
 */
function MatchCell({
  match,
  current,
}: {
  match: MatchSummary;
  current: boolean;
}) {
  const live = match.status === "LIVE";
  const status = matchStatusLabel(match);
  const scored = match.score.home !== null && match.score.away !== null;

  return (
    <Link
      href={`/live/matches/${match.id}`}
      aria-current={current ? "page" : undefined}
      className={`border-border-soft hover:bg-elevate-2 focus-visible:outline-accent flex shrink-0 items-center gap-2.75 border-b-2 border-l px-5 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
        current ? "border-b-accent bg-elevate-2" : "border-b-transparent"
      }`}
    >
      <LiveCrest team={match.home} size={22} />
      <span
        className={`text-body-md font-black ${
          live ? "text-text-strong" : "text-text-3"
        }`}
      >
        {scored ? `${match.score.home} : ${match.score.away}` : "vs"}
      </span>
      <LiveCrest team={match.away} size={22} />
      {live ? (
        <span className="text-caption-lg text-danger font-bold">
          {status.primary}
        </span>
      ) : match.status === "FINISHED" ? (
        <span className="text-caption-lg text-text-4 font-bold">종료</span>
      ) : (
        <span className="text-caption-lg text-text-3 font-bold">
          {status.primary}
        </span>
      )}
    </Link>
  );
}
