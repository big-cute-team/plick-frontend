"use client";

import { TEAMS } from "@plick/domain/constants";
import {
  formatPredictionHits,
  isPredictionTopRank,
  predictionMyRankCell,
  predictionRankingNotice,
  predictionSeasonLabel,
  predictionStreakLabel,
  type MyPredictionRank,
  type PredictionRankRow,
} from "@plick/domain/prediction";
import { TeamCrest } from "@plick/ui/TeamCrest";
import {
  PREDICTION_RANKING_COLUMNS,
  PREDICTION_RANKING_EMPTY,
  PREDICTION_RANKING_ERROR,
  PREDICTION_RANKING_ME_LABEL,
  PREDICTION_RANKING_NO_NICKNAME,
  PREDICTION_RANKING_TITLE,
} from "@/_constants/predictions";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { usePredictionRankings } from "@plick/core/prediction-queries";

/**
 * 표 한 줄의 칸 폭(시안 48, 1fr, 90, 90, 70에 간격 10). rem으로 써 전체 배율을 따른다. `sm` 아래는 숫자 칸을
 * 좁혀 330px에서도 닉네임 칸이 남게 한다(웹 최소 기준선). 칸을 빼지는 않는다.
 */
const GRID =
  "grid grid-cols-[2rem_minmax(0,1fr)_3rem_3rem_2rem] items-center gap-1.5 sm:grid-cols-[3rem_minmax(0,1fr)_5.625rem_5.625rem_4.375rem] sm:gap-2.5";

/** 첫 로딩에 그릴 행 자리 수. 한 화면에 들어오는 만큼만 둔다. */
const SKELETON_ROWS = 8;

/** 칸 정렬. 순위는 가운데, 닉네임은 왼쪽, 숫자 칸은 오른쪽이다(시안 가이드 §5.7). */
function alignClass(index: number): string {
  if (index === 0) return "text-center";
  return index === 1 ? "" : "text-right";
}

/**
 * 투표 화면 랭킹 탭의 시즌 랭킹 (KAN-701, 시안 가이드 §5.7, 홈 v2 시안 1427-1458행). 제목 `시즌 랭킹`과
 * 시즌 라벨, 머리글 행(순위, 닉네임, 적중률, 적중, 연속), 행 높이 44px의 순위 행들, 그 아래 14px 띄운 내
 * 순위 줄이다. 1~3위는 순위 숫자가 900 강조색이고 닉네임이 700이다. 행 크기는 같다. 숫자 칸은 전부 오른쪽
 * 정렬에 `tabular-nums`다.
 *
 * 다음 페이지는 끝 감시 요소가 보이면 받고(`useInfiniteScroll`), 더 받기 실패는 데이터가 있는 실패라
 * 버튼이 재시도 문구로 바뀐다. 첫 페이지 실패는 다시 시도 버튼이다. 정산 5경기가 쌓인 사람이 아직 없으면
 * 머리글 아래 빈 문구만 둔다.
 *
 * 내 순위 줄은 첫 페이지의 `me`로 그린다. 비로그인은 `me: null`이라 줄이 없다. 자격 미달
 * (`qualified: false`)은 순위 칸이 `3/5`고 줄 아래 `2경기 더 예측하면 랭킹에 올라요`가 붙는다. 자격은
 * 됐는데 정산 직후라 순위가 아직 없으면 `-`에 집계 중 안내다. `me`에는 마이팀이 없어 시안의 엠블럼은
 * 그리지 않는다.
 *
 * 표는 `role="table"` 그리드다. 시안이 고정 높이의 그리드 행이고 머리글과 내 순위 줄이 같은 칸 구성이라
 * `<table>`보다 그리드가 맞는다. 머리글, 행, 내 순위 줄은 모두 `role="row"`라 보조기술이 표로 읽는다.
 */
export function PredictionRanking() {
  const {
    data,
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = usePredictionRankings();

  const first = data?.pages[0];
  const rows = data?.pages.flatMap((page) => page.items) ?? [];
  const me = first?.me ?? null;
  const notice = me ? predictionRankingNotice(me) : null;

  const sentinelRef = useInfiniteScroll(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError,
  );

  return (
    <section className="pb-6">
      <div className="flex items-baseline pt-4.5 pb-2">
        <h2 className="text-body-lg text-text-strong font-bold">
          {PREDICTION_RANKING_TITLE}
        </h2>
        <div className="flex-1" />
        {first && (
          <span className="text-label text-text-3 tabular-nums">
            {predictionSeasonLabel(first.scope)}
          </span>
        )}
      </div>

      {isPending ? (
        <RankingSkeleton />
      ) : isError && rows.length === 0 ? (
        <div className="flex items-baseline gap-3 py-10">
          <p className="text-body-md text-text-4">{PREDICTION_RANKING_ERROR}</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-label-lg text-accent hover:text-accent-hover focus-visible:outline-accent font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <div role="table" aria-label={PREDICTION_RANKING_TITLE}>
            <div
              role="row"
              className={`${GRID} border-border-table text-label text-text-4 h-7.5 border-b`}
            >
              {PREDICTION_RANKING_COLUMNS.map((label, i) => (
                <span
                  key={label}
                  role="columnheader"
                  className={`whitespace-nowrap ${alignClass(i)}`}
                >
                  {label}
                </span>
              ))}
            </div>
            {rows.length > 0 && (
              <div role="rowgroup">
                {rows.map((row) => (
                  <RankRow key={`${row.rank}-${row.userId}`} row={row} />
                ))}
              </div>
            )}
            {me && (
              <div role="rowgroup" className="bg-accent-soft mt-3.5">
                <MyRankRow me={me} />
              </div>
            )}
          </div>
          {rows.length === 0 && (
            <p className="text-body-md text-text-3 py-11 text-center">
              {PREDICTION_RANKING_EMPTY}
            </p>
          )}
          {notice && (
            <p className="text-label text-text-3 pt-2 text-right">{notice}</p>
          )}
          {isFetchNextPageError ? (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-label-lg text-text-3 hover:text-accent focus-visible:outline-accent mt-3.5 h-9 w-full text-center font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-40"
            >
              더 불러오지 못했어요, 다시 시도
            </button>
          ) : (
            <div ref={sentinelRef} aria-hidden className="h-px" />
          )}
        </>
      )}
    </section>
  );
}

/**
 * 순위 한 행. 닉네임 뒤 16px 마이팀 엠블럼은 빅6일 때만이다.
 *
 * @param row 랭킹 행
 */
function RankRow({ row }: { row: PredictionRankRow }) {
  const top = isPredictionTopRank(row.rank);
  return (
    <div role="row" className={`${GRID} border-border-soft h-11 border-b`}>
      <span
        role="cell"
        className={`text-body-md text-center tabular-nums ${
          top ? "text-accent font-black" : "text-text-3 font-medium"
        }`}
      >
        {row.rank}
      </span>
      <span role="cell" className="flex min-w-0 items-center gap-1.75">
        <span
          className={`text-body-md text-text-strong truncate ${
            top ? "font-bold" : "font-medium"
          }`}
        >
          {row.nickname ?? PREDICTION_RANKING_NO_NICKNAME}
        </span>
        {row.favoriteTeam && (
          <TeamCrest
            team={TEAMS[row.favoriteTeam]}
            size={16}
            decorative
            className="shrink-0"
          />
        )}
      </span>
      <span
        role="cell"
        className="text-body-md text-text-strong text-right font-bold tabular-nums"
      >
        {row.record.rate}%
      </span>
      <span
        role="cell"
        className="text-body text-text-3 text-right tabular-nums"
      >
        {formatPredictionHits(row.record)}
      </span>
      <span
        role="cell"
        className="text-body text-text-3 text-right tabular-nums"
      >
        {predictionStreakLabel(row.record.streak)}
      </span>
    </div>
  );
}

/**
 * 표 아래 붙는 내 순위 줄(높이 48, 면 `accent-soft`). 칸 구성은 순위 행과 같고 순위 숫자만 900 강조색이다.
 *
 * @param me 첫 페이지의 `me`
 */
function MyRankRow({ me }: { me: MyPredictionRank }) {
  return (
    <div role="row" className={`${GRID} h-12`}>
      <span
        role="cell"
        className="text-body-md text-accent text-center font-black tabular-nums"
      >
        {predictionMyRankCell(me)}
      </span>
      <span role="cell" className="text-body-md text-text-strong font-bold">
        {PREDICTION_RANKING_ME_LABEL}
      </span>
      <span
        role="cell"
        className="text-body-md text-text-strong text-right font-bold tabular-nums"
      >
        {me.record.rate}%
      </span>
      <span
        role="cell"
        className="text-body text-text-3 text-right tabular-nums"
      >
        {formatPredictionHits(me.record)}
      </span>
      <span
        role="cell"
        className="text-body text-text-3 text-right tabular-nums"
      >
        {predictionStreakLabel(me.record.streak)}
      </span>
    </div>
  );
}

/** 첫 로딩의 행 자리. 머리글 선 아래 44px 행마다 순위, 닉네임, 숫자 막대 실루엣이다. */
function RankingSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="border-border-table h-7.5 border-b" />
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className={`${GRID} border-border-soft h-11 border-b`}>
          <span className="bg-elevate mx-auto h-3.5 w-4" />
          <span className="bg-elevate h-3.5 w-2/5" />
          <span className="bg-elevate ml-auto h-3.5 w-8" />
          <span className="bg-elevate ml-auto h-3.5 w-9" />
          <span className="bg-elevate ml-auto h-3.5 w-4" />
        </div>
      ))}
    </div>
  );
}
