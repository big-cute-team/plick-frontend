"use client";

import { Suspense } from "react";
import type { ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * 쿼리 화면용 선언형 경계 (KAN-447) — 에러는 ErrorBoundary가, 로딩(suspense
 * 훅)은 Suspense가 받는다. 감싸인 컴포넌트는 성공 케이스만 그리면 된다.
 *
 * QueryErrorResetBoundary의 reset을 ErrorBoundary에 물려 두어, fallback의
 * "다시 시도"가 실패한 쿼리의 에러 상태를 지우고 refetch까지 걸리게 한다 —
 * 이 연결이 없으면 경계만 초기화되고 쿼리는 여전히 에러라 곧바로 다시 던진다.
 *
 * @param name 메트릭 라벨로 나갈 경계 이름 (KAN-457). 화면마다 다르게 준다
 * @param fallback Suspense 로딩 fallback. useSuspenseQuery류를 쓰는 자식일 때만
 *   넘긴다 — 없으면 Suspense를 씌우지 않는다(상태 분기로 로딩을 그리는 화면)
 * @param errorMessage 기본 에러 fallback의 문구 (예: "댓글을 불러오지 못했어요.")
 * @param errorFallback 기본 fallback 대신 쓸 커스텀 렌더러. retry를 부르면 재시도
 */
export function QueryBoundary({
  name = "QueryBoundary",
  fallback,
  errorMessage = "불러오지 못했어요.",
  errorFallback,
  children,
}: {
  name?: string;
  fallback?: ReactNode;
  errorMessage?: string;
  errorFallback?: (retry: () => void) => ReactNode;
  children: ReactNode;
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          name={name}
          onReset={reset}
          fallback={(_error, retry) =>
            errorFallback ? (
              errorFallback(retry)
            ) : (
              <SectionError message={errorMessage} onRetry={retry} />
            )
          }
        >
          {fallback !== undefined ? (
            <Suspense fallback={fallback}>{children}</Suspense>
          ) : (
            children
          )}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

/** 기본 에러 fallback — 피드류가 손으로 그리던 문구 + 다시 시도 관용을 그대로 옮겼다. */
function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="py-12 text-center">
      <p className="text-body text-text-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-elevate text-label text-text rounded-control mt-3 px-4 py-2 font-bold active:opacity-70"
      >
        다시 시도
      </button>
    </div>
  );
}
