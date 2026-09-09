"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * `router.refresh()`를 기다릴 수 있는 프로미스로 감싼다 (KAN-462) — 서버
 * 컴포넌트가 그린 지면(순위표)의 당겨서 새로고침에 쓴다.
 *
 * `router.refresh()`는 리로드가 아니라 현재 라우트의 RSC 페이로드를 서버에 다시
 * 요청해 화면을 갈아 끼우는 소프트 갱신인데, 프로미스를 돌려주지 않아 언제
 * 끝났는지 알 수 없다. 대신 React 트랜지션 안에서 부르면 새 페이로드가 커밋될
 * 때까지 `isPending`이 참으로 남으므로, 그 값이 내려가는 순간을 기다렸다가
 * 대기 중인 프로미스를 풀어 준다. 스피너는 이 프로미스에 맞춰 멈춘다.
 *
 * 같은 갱신이 도는 동안 다시 부르면 트랜지션만 한 번 더 걸리고 두 프로미스가
 * 같은 커밋에서 함께 풀린다.
 */
export function useServerRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const waiters = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (isPending) return;
    const done = waiters.current;
    waiters.current = [];
    done.forEach((resolve) => resolve());
  }, [isPending]);

  return useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiters.current.push(resolve);
        startTransition(() => router.refresh());
      }),
    [router],
  );
}
