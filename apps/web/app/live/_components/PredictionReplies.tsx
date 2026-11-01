"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { classifyPredictionError } from "@plick/core/prediction-errors";
import {
  predictionReplyMention,
  predictionReplyPlaceholder,
  type PredictionOpinion,
  type PredictionPick,
} from "@plick/domain/prediction";
import {
  PREDICTION_LOCK_NOTICE,
  PREDICTION_REPLIES_EMPTY,
} from "@/_constants/predictions";
import { useInfiniteScroll } from "@/_hooks/useInfiniteScroll";
import { usePredictionReplies } from "@/_hooks/usePredictionReplies";
import { PredictionReplyComposer } from "./PredictionReplyComposer";
import { PredictionReplyRow } from "./PredictionReplyRow";

/* 로그인·연동 팝업은 보내야 뜨는 조건부 UI라 초기 번들에서 뺀다 */
const PredictionAuthDialog = dynamic(
  () => import("./PredictionAuthDialog").then((m) => m.PredictionAuthDialog),
  { ssr: false },
);

/**
 * 의견 행 아래로 펼치는 답글 영역 (KAN-698, 시안 가이드 §5.6 "웹: 의견 행을 누르면 그 아래로
 * 펼친다. 면 #f8f9fa, 답글 목록, 입력창"). 답글 목록(오래된 순), 빈 상태, 그 아래 입력줄이다.
 * 앱의 의견 상세 화면(`PredictionOpinionScreen`)과 같은 내용을 행 안에 접은 것이다.
 *
 * 펼쳐질 때 마운트되므로 답글 쿼리는 그때 처음 받는다. 원 의견은 목록 항목을 그대로 쓰니 따로
 * 받지 않는다. 답장은 입력값을 `@닉네임 `으로 채우고 포커스한다. 등록 성공은 목록이 다시 와 끝에
 * 붙는다.
 *
 * 잠금 403은 의견 목록이 잠기면 행 자체가 없어 보통 닿지 않지만, 펼친 채로 예측을 취소하면 다음
 * 조회가 403이라 잠금 문구로 받는다. 그 밖 실패는 다시 시도다.
 *
 * @param opinion 원 의견
 * @param matchId 경기 id. 답글 쓰기 뒤 의견 목록 무효화에 쓴다
 * @param teams 홈·원정 팀명(픽 라벨용)
 * @param myPick 내 픽. 입력줄 안내 분기에 쓴다
 */
export function PredictionReplies({
  opinion,
  matchId,
  teams,
  myPick,
}: {
  opinion: PredictionOpinion;
  matchId: number;
  teams: { home: string; away: string };
  myPick: PredictionPick | null;
}) {
  const [draft, setDraft] = useState("");
  const [auth, setAuth] = useState<"login" | "link" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const locked = isError && classifyPredictionError(error).kind === "locked";

  return (
    <div className="bg-elevate mt-3 px-4 pt-1 pb-3">
      {isPending ? (
        <div className="h-12" aria-hidden />
      ) : isError && replies.length === 0 ? (
        <p className="text-body text-text-3 py-3.5">
          {locked ? PREDICTION_LOCK_NOTICE : "답글을 불러오지 못했어요"}
          {!locked && (
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-accent hover:text-accent-hover focus-visible:outline-accent ml-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
            >
              다시 시도
            </button>
          )}
        </p>
      ) : replies.length === 0 ? (
        <p className="text-body text-text-3 py-3.5">
          {PREDICTION_REPLIES_EMPTY}
        </p>
      ) : (
        <div className="flex flex-col">
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
              className="text-label-lg text-text-3 hover:text-accent focus-visible:outline-accent mt-2 h-9 text-center font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-40"
            >
              더 불러오지 못했어요, 다시 시도
            </button>
          ) : (
            <div ref={sentinelRef} aria-hidden className="h-px" />
          )}
        </div>
      )}

      {!locked && (
        <PredictionReplyComposer
          matchId={matchId}
          predictionId={opinion.id}
          value={draft}
          onChange={setDraft}
          placeholder={predictionReplyPlaceholder(myPick, opinion.pick)}
          inputRef={inputRef}
          onAuthRequired={setAuth}
        />
      )}

      {auth && (
        <PredictionAuthDialog mode={auth} onClose={() => setAuth(null)} />
      )}
    </div>
  );
}
