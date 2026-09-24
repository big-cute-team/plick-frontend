"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ApiError } from "@plick/core/client";
import { formatDateKo } from "@plick/domain/format";
import type { BlockedUser } from "@plick/domain/types";
import { useUnblockUser } from "@/_hooks/useUnblockUser";

/**
 * LoginPromptDialog는 탭해야 뜨는 조건부 UI라 초기 번들에서 뺀다 (KAN-428).
 */
const LoginPromptDialog = dynamic(
  () =>
    import("@/_components/LoginPromptDialog").then((m) => m.LoginPromptDialog),
  { ssr: false },
);

/**
 * 차단 목록 (KAN-411, KAN-567 리디자인, 시안 MY 차단 목록). 서버가 준 목록을
 * 초깃값으로 들고, 해제하면 그 줄을 로컬 state에서 뺀다. 이 화면 밖에서 목록이
 * 바뀔 일이 없고(차단은 댓글에서만 늘고, 이 화면은 서버 컴포넌트라 재진입마다
 * 새로 받는다) 해제는 완전 멱등이라 RQ 캐시 없이 로컬 상태로 충분하다.
 *
 * 행은 닉네임 14/700과 "차단일 차단" 11.5, 오른쪽 "차단 해제" 텍스트 버튼이다.
 * 아바타 원과 카드 섀시는 걷어냈다. 해제는 티켓대로 확인 시트 없이 바로 보낸다.
 * 멱등이라 오탭 비용이 낮고, 잘못 눌렀으면 그 유저 댓글에서 다시 차단하면 된다.
 * 댓글 캐시 정리(원문 복원을 위한 refetch 유도)는 `useUnblockUser`가 한다.
 *
 * 실패 문구는 목록 밑에 남기고, 토큰 만료(401)만 로그인 유도로 돌린다.
 *
 * @param initial 서버 컴포넌트가 받은 차단 목록 (최근 차단순)
 */
export function BlockedUserList({ initial }: { initial: BlockedUser[] }) {
  const [users, setUsers] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const { mutate, isPending, variables } = useUnblockUser();

  function handleUnblock(userId: number) {
    setError(null);
    mutate(userId, {
      onSuccess: () =>
        setUsers((prev) => prev.filter((user) => user.userId !== userId)),
      onError: (err) => {
        if (err instanceof ApiError && err.code === "AUTH_REQUIRED") {
          setNeedsLogin(true);
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "차단을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      },
    });
  }

  if (users.length === 0) {
    return (
      <p className="text-body text-text-4 py-12 text-center">
        차단한 사용자가 없어요
      </p>
    );
  }

  return (
    <>
      <ul>
        {users.map((user) => (
          <li
            key={user.userId}
            className="border-border-soft flex items-center gap-3 border-b py-3.25"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <span className="text-body-md text-text-strong truncate font-bold">
                {user.nickname}
              </span>
              <span className="text-caption-lg text-text-3">
                {formatDateKo(user.blockedAt)} 차단
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleUnblock(user.userId)}
              disabled={isPending}
              className="text-label-lg text-text-3 flex h-11 shrink-0 items-center font-bold active:opacity-60 disabled:opacity-40"
            >
              {isPending && variables === user.userId ? "해제 중" : "차단 해제"}
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p
          role="status"
          className="text-caption-lg text-danger mt-2.5 text-center"
        >
          {error}
        </p>
      )}

      {needsLogin && (
        <LoginPromptDialog
          onClose={() => setNeedsLogin(false)}
          description="차단 관리는 로그인한 사용자만 할 수 있어요."
        />
      )}
    </>
  );
}
