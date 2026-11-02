"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getMatchDetail } from "@plick/core/live";
import { liveKeys } from "@plick/core/liveKeys";
import { classifyPredictionError } from "@plick/core/prediction-errors";
import {
  predictionReplyMention,
  predictionReplyPlaceholder,
  type PredictionOpinionDetail,
} from "@plick/domain/prediction";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { SubTopBar } from "@/_components/SubTopBar";
import { LIVE_POLL_MS } from "@/_constants/live";
import {
  PREDICTION_COMPOSE_LABEL,
  PREDICTION_LOCK_NOTICE,
  PREDICTION_OPINION_GONE,
  PREDICTION_REPLIES_EMPTY,
} from "@/_constants/predictions";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { usePredictionOpinion } from "@/_hooks/usePredictionOpinion";
import { usePredictionReplies } from "@plick/core/prediction-queries";
import { usePredictionSummary } from "@plick/core/prediction-queries";
import { PredictionOpinionRow } from "./PredictionOpinionRow";
import { PredictionReplyComposer } from "./PredictionReplyComposer";
import { PredictionReplyRow } from "./PredictionReplyRow";

/* 로그인·연동 시트는 보내야 뜨는 조건부 UI라 초기 번들에서 뺀다 */
const PredictionAuthSheet = dynamic(
  () => import("./PredictionAuthSheet").then((m) => m.PredictionAuthSheet),
  { ssr: false },
);

/**
 * 의견 상세 화면 (KAN-698, 시안 가이드 §5.6 "앱: 의견을 누르면 의견 상세 화면"). 상단바 제목은
 * `맨유 vs 맨시티`, 그 아래 원 의견 전문, `답글 [n]` 머리글, 답글 목록(오래된 순), 하단 고정
 * 입력바다. 의견 행에서 들어오고 예측 탭에서 의견 목록 캐시와 경기 캐시가 이미 있어 보통 바로
 * 선다. 딥링크로 열면 셋을 처음부터 받는다.
 *
 * 세 가지를 받는다. 원 의견(`GET /predictions/{id}`, 경기 id가 실려 온다), 경기 상세(팀명. 픽 라벨
 * `맨시티 승`과 제목에 쓴다), 예측 요약(내 픽. 입력창 안내가 내 픽과 원 의견 픽이 같은지로
 * 갈린다). 경기 id는 행이 쿼리(`?match=`)로 넘겨 줘서 원 의견보다 먼저 알 수 있고, 403으로 원
 * 의견을 못 받아도 돌아갈 경기를 안다. 답글 목록은 원 의견을 받은 뒤 켠다. 원 의견이 403이면
 * 답글도 403이라 두 번 실패할 이유가 없다.
 *
 * 티켓 완료 조건의 두 실패는 여기서 가른다. OPEN에서 예측하지 않은 사람이 직접 열면 403
 * `PREDICTION_LOCKED`라 잠금 문구와 `의견 남기기` 버튼(경기 예측 탭으로)이고, 없거나 가려진
 * 의견은 404라 안내 문구만이다. 그 밖은 다시 시도다.
 *
 * 입력바는 `ScrollArea` 밖 셸 바닥에 둔다(채팅 탭과 같은 구조). 스크롤 안에 두면 목록과 함께
 * 흘러가 버린다. 답장은 입력값을 `@닉네임 `으로 채우고 포커스한다. 등록 성공 뒤에는 목록이
 * 다시 와 끝에 붙으니 바닥으로 내려 방금 단 답글이 보이게 한다.
 *
 * @param predictionId 의견 id
 * @param matchIdHint 행이 쿼리로 넘긴 경기 id. 딥링크면 null이고 원 의견이 준 값을 쓴다
 */
export function PredictionOpinionScreen({
  predictionId,
  matchIdHint,
}: {
  predictionId: number;
  matchIdHint: number | null;
}) {
  const opinionQuery = usePredictionOpinion(predictionId);
  const opinion = opinionQuery.data;
  const matchId = opinion?.matchId ?? matchIdHint;
  const backHref = matchId === null ? "/live" : `/live/matches/${matchId}`;

  /* 팀명은 경기 상세에서 온다. 예측 탭을 거쳐 왔으면 캐시가 있어 요청이 없다. 라이브 폴링 주기만큼 신선하면 된다 */
  const { data: match, isError: matchFailed } = useQuery({
    queryKey: liveKeys.match(matchId ?? 0),
    queryFn: () => getMatchDetail(matchId ?? 0),
    enabled: matchId !== null,
    staleTime: LIVE_POLL_MS,
    throwOnError: false,
  });
  const header = match?.header;
  /* 경기 상세를 못 받아도 의견과 답글은 보여야 한다. 그때 픽 라벨은 홈 승, 원정 승으로 간다 */
  const teams = header
    ? { home: header.home.name, away: header.away.name }
    : matchFailed
      ? { home: "홈", away: "원정" }
      : null;
  const title = header ? `${teams?.home} vs ${teams?.away}` : "의견";

  return (
    <AppShell>
      <SubTopBar title={title} backHref={backHref} backBehavior="back" />
      {opinion && teams && matchId !== null ? (
        <OpinionBody
          opinion={opinion}
          matchId={matchId}
          teams={teams}
          backHref={backHref}
        />
      ) : opinionQuery.isError ? (
        <OpinionError
          error={opinionQuery.error}
          backHref={backHref}
          onRetry={() => opinionQuery.refetch()}
        />
      ) : null}
    </AppShell>
  );
}

/**
 * 원 의견과 답글, 입력바. 내 픽은 요약에서 읽는다(예측 탭 캐시가 있으면 요청 없이). 요약은 OPEN·
 * LOCKED에서 30초 폴링인데 이 화면에 머무는 동안도 같은 주기면 충분하다.
 */
function OpinionBody({
  opinion,
  matchId,
  teams,
  backHref,
}: {
  opinion: PredictionOpinionDetail;
  matchId: number;
  teams: { home: string; away: string };
  backHref: string;
}) {
  const router = useRouter();
  const { data: summary } = usePredictionSummary(matchId, undefined);
  const myPick = summary?.myPrediction?.pick ?? null;
  const [draft, setDraft] = useState("");
  const [auth, setAuth] = useState<"login" | "link" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = usePredictionReplies(opinion.id, true);
  const replies = data?.pages.flatMap((page) => page.items) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError,
  );

  function replyTo(nickname: string) {
    setDraft(predictionReplyMention(nickname));
    inputRef.current?.focus();
  }

  /* 답글은 오래된 순이라 방금 단 답글이 끝에 온다. 목록이 다시 온 뒤 바닥으로 */
  function scrollToEnd() {
    requestAnimationFrame(() => {
      listRef.current?.lastElementChild?.scrollIntoView({ block: "end" });
    });
  }

  const locked = isError && classifyPredictionError(error).kind === "locked";

  return (
    <>
      <ScrollArea restoreLanding={false}>
        <div className="px-edge pb-4">
          <PredictionOpinionRow
            opinion={opinion}
            matchId={matchId}
            teams={teams}
            detail
          />
          <div className="flex items-baseline gap-1 pt-4 pb-0.5">
            <span className="text-body text-text-strong font-bold">답글</span>
            <span className="text-body text-danger-strong font-bold tabular-nums">
              [{opinion.replyCount}]
            </span>
          </div>

          {isPending ? null : isError && replies.length === 0 ? (
            locked ? (
              <LockedNotice onCompose={() => router.push(backHref)} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-body text-text-4">
                  답글을 불러오지 못했어요
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="border-border-strong text-label-lg text-text-2 rounded-control h-10 border px-4 font-bold active:opacity-60 disabled:opacity-40"
                >
                  다시 시도
                </button>
              </div>
            )
          ) : replies.length === 0 ? (
            <p className="text-body text-text-3 py-9 text-center">
              {PREDICTION_REPLIES_EMPTY}
            </p>
          ) : (
            <div ref={listRef} className="flex flex-col">
              {replies.map((reply) => (
                <PredictionReplyRow
                  key={reply.id}
                  reply={reply}
                  matchId={matchId}
                  predictionId={opinion.id}
                  teams={teams}
                  onReplyTo={replyTo}
                />
              ))}
              {isFetchNextPageError ? (
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="border-border-strong text-label-lg text-text-2 rounded-control mt-3.5 flex h-11 items-center justify-center border font-bold active:opacity-60 disabled:opacity-40"
                >
                  더 불러오지 못했어요, 다시 시도
                </button>
              ) : (
                <div ref={sentinelRef} aria-hidden className="h-px" />
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <PredictionReplyComposer
        matchId={matchId}
        predictionId={opinion.id}
        value={draft}
        onChange={setDraft}
        placeholder={predictionReplyPlaceholder(myPick, opinion.pick)}
        inputRef={inputRef}
        onAuthRequired={setAuth}
        onPosted={scrollToEnd}
      />

      {auth && (
        <PredictionAuthSheet mode={auth} onClose={() => setAuth(null)} />
      )}
    </>
  );
}

/**
 * 원 의견을 못 받았을 때의 지면. 403 잠금은 작성 유도, 404는 안내만, 그 밖은 다시 시도다.
 */
function OpinionError({
  error,
  backHref,
  onRetry,
}: {
  error: unknown;
  backHref: string;
  onRetry: () => void;
}) {
  const router = useRouter();
  const failure = classifyPredictionError(error);

  if (failure.kind === "locked") {
    return <LockedNotice onCompose={() => router.push(backHref)} />;
  }
  if (failure.kind === "not-found") {
    return (
      <p className="text-body text-text-4 px-edge py-16 text-center">
        {PREDICTION_OPINION_GONE}
      </p>
    );
  }
  return (
    <div className="px-edge flex flex-col items-center gap-3 py-16">
      <p className="text-body text-text-4">의견을 불러오지 못했어요</p>
      <button
        type="button"
        onClick={onRetry}
        className="border-border-strong text-label-lg text-text-2 rounded-control h-10 border px-4 font-bold active:opacity-60"
      >
        다시 시도
      </button>
    </div>
  );
}

/** OPEN에서 예측하지 않은 사람이 의견을 직접 열었을 때. 잠금 지면과 같은 문구와 버튼이다. */
function LockedNotice({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="px-edge flex flex-col items-center gap-3 py-14">
      <p className="text-body-lg text-text-strong text-center font-bold">
        {PREDICTION_LOCK_NOTICE}
      </p>
      <button
        type="button"
        onClick={onCompose}
        className="bg-accent text-on-accent rounded-control text-body-md inline-flex h-10.5 items-center px-4.5 font-bold active:opacity-80"
      >
        {PREDICTION_COMPOSE_LABEL}
      </button>
    </div>
  );
}
