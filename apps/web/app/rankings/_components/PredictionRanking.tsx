"use client";

import Link from "next/link";
import { Fragment } from "react";
import { TEAMS } from "@plick/domain/constants";
import {
  PREDICTION_RANKING_PROVISIONAL_LABEL,
  formatPredictionHits,
  isPredictionProvisionalStart,
  isPredictionTopRank,
  predictionMyRankCell,
  predictionRankingNotice,
  predictionRankingRateCell,
  predictionSeasonLabel,
  predictionStreakLabel,
  type MyPredictionRank,
  type PredictionRankRow,
} from "@plick/domain/prediction";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { useAuth } from "@/_components/AuthProvider";
import {
  PREDICTION_RANKING_COLUMNS,
  PREDICTION_RANKING_EMPTY,
  PREDICTION_RANKING_ERROR,
  PREDICTION_RANKING_LOCK_BODY,
  PREDICTION_RANKING_LOCK_LINK_LABEL,
  PREDICTION_RANKING_LOCK_LOGIN_LABEL,
  PREDICTION_RANKING_LOCK_TITLE,
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
 * 랭킹 페이지의 시즌 랭킹 (KAN-701, 시안 가이드 §5.7, 홈 v2 시안 1427-1458행. 투표 화면의 탭이었다가
 * KAN-724 PR에서 `/rankings` 페이지로 나왔다). 제목 `시즌 랭킹`과
 * 시즌 라벨, 머리글 행(순위, 닉네임, 적중률, 적중, 연속), 행 높이 44px의 순위 행들, 그 아래 14px 띄운 내
 * 순위 줄이다. 1~3위는 순위 숫자가 900 강조색이고 닉네임이 700이다. 행 크기는 같다. 숫자 칸은 전부 오른쪽
 * 정렬에 `tabular-nums`다.
 *
 * 다음 페이지는 끝 감시 요소가 보이면 받고(`useInfiniteScroll`), 더 받기 실패는 데이터가 있는 실패라
 * 버튼이 재시도 문구로 바뀐다. 첫 페이지 실패는 다시 시도 버튼이다. 정산된 사람이 아직 없으면 머리글 아래
 * 빈 문구만 둔다. 자격이 정산 1경기라(BE KAN-701 후속) 목록이 길어지는데 한 페이지 50행 무한 스크롤이라
 * 한 번에 그리지 않는다. 적중률 칸은 정산 5경기 전이면 `-`다(`predictionRankingRateCell`).
 *
 * 목록은 정산 5경기 이상 단이 위, 미만 단이 아래다(BE KAN-745, `provisional`). 미만 단이 시작하는 행 위에
 * 회색 면의 구분 줄(`정산 5경기 미만`)을 한 번 둔다(KAN-747). 위 단이 비면 머리글 바로 아래에 선다. 내가
 * 미만 단이면 내 순위 줄 아래에 위 단으로 올라가는 조건이 붙는다.
 *
 * 내 순위 줄은 첫 페이지의 `me`로 그린다. 비로그인은 `me: null`이라 줄이 없다. 자격 미달
 * (`qualified: false`)은 순위 칸이 `-`고 줄 아래 `첫 경기 결과가 나오면 랭킹에 올라요`가 붙는다. 자격은
 * 됐는데 정산 직후라 순위가 아직 없으면 `-`에 집계 중 안내다. `me`에는 마이팀이 없어 시안의 엠블럼은
 * 그리지 않는다.
 *
 * 소셜 계정이 아니면(비로그인, 게스트) 표를 블러로 가리고 위에 로그인(게스트는 연동) 안내를 덮는다
 * (KAN-724 PR, `RankingLock`). 적중률 높은 사람들의 기록이 로그인의 이유가 되게 하려는 것이다. 가린 표는
 * `aria-hidden`과 포인터 이벤트 꺼짐이라 보조기술과 클릭 모두 안내만 만난다. 내 순위 줄과 다음 페이지는
 * 그리지 않는다. 세션 판정이 끝나기 전(`isSessionPending`)에는 가리지 않아 소셜 계정이 첫 그림에서 블러를
 * 보지 않는다.
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
  const { isLoggedIn, isGuest, isSessionPending } = useAuth();
  const locked = !isSessionPending && (!isLoggedIn || isGuest);

  const first = data?.pages[0];
  const rows = data?.pages.flatMap((page) => page.items) ?? [];
  const me = first?.me ?? null;
  const notice = me ? predictionRankingNotice(me) : null;

  const sentinelRef = useInfiniteScroll(
    () => fetchNextPage(),
    !locked &&
      Boolean(hasNextPage) &&
      !isFetchingNextPage &&
      !isFetchNextPageError,
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
        <div className={locked ? "relative" : undefined}>
          <div
            aria-hidden={locked || undefined}
            className={
              locked ? "pointer-events-none blur-[0.375rem] select-none" : ""
            }
          >
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
                  {rows.map((row, i) => (
                    <Fragment key={`${row.rank}-${row.userId}`}>
                      {isPredictionProvisionalStart(rows, i) && (
                        <ProvisionalDivider />
                      )}
                      <RankRow row={row} />
                    </Fragment>
                  ))}
                </div>
              )}
              {me && !locked && (
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
            {notice && !locked && (
              <p className="text-label text-text-3 pt-2 text-right">{notice}</p>
            )}
            {locked ? null : isFetchNextPageError ? (
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
          </div>
          {locked && <RankingLock isGuest={isGuest} />}
        </div>
      )}
    </section>
  );
}

/**
 * 소셜 계정이 아닐 때 표 위에 덮는 안내. 제목, 한 줄 설명, 로그인(게스트는 연동) 버튼이다. 버튼은
 * `/login`으로 가고 게스트는 그 화면이 연동을 처리한다.
 *
 * @param isGuest 게스트 세션인가. 버튼 글자가 갈린다
 */
function RankingLock({ isGuest }: { isGuest: boolean }) {
  return (
    <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-2.5 px-4 pt-14">
      <p className="text-body-lg text-text-strong text-center font-bold text-pretty">
        {PREDICTION_RANKING_LOCK_TITLE}
      </p>
      <p className="text-body text-text-3 text-center text-pretty">
        {PREDICTION_RANKING_LOCK_BODY}
      </p>
      <Link
        href="/login"
        className="bg-accent text-on-accent text-body-md hover:bg-accent-hover focus-visible:outline-accent mt-1 inline-flex h-9.5 items-center px-4.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {isGuest
          ? PREDICTION_RANKING_LOCK_LINK_LABEL
          : PREDICTION_RANKING_LOCK_LOGIN_LABEL}
      </Link>
    </div>
  );
}

/**
 * 정산 5경기 미만 단이 시작하는 자리의 구분 줄. 표 안이라 한 칸짜리 행으로 두어 보조기술이 행 사이에서
 * 읽는다.
 */
function ProvisionalDivider() {
  return (
    <div role="row" className="bg-elevate flex h-8 items-center px-2 sm:px-3">
      <span
        role="cell"
        aria-colspan={PREDICTION_RANKING_COLUMNS.length}
        className="text-label text-text-3 font-bold"
      >
        {PREDICTION_RANKING_PROVISIONAL_LABEL}
      </span>
    </div>
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
        {predictionRankingRateCell(row.record)}
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
        {predictionRankingRateCell(me.record)}
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
