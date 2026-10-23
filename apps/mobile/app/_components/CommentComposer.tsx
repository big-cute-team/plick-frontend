"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { COMMENT_MAX_LENGTH } from "@plick/core/comments";
import { useCreateComment } from "@/_hooks/useCreateComment";
import { useAuth } from "./AuthProvider";

/**
 * LoginPromptDialog는 탭해야 뜨는 조건부 UI라 초기 번들에서 뺀다 (KAN-428).
 */
const LoginPromptDialog = dynamic(
  () => import("./LoginPromptDialog").then((m) => m.LoginPromptDialog),
  { ssr: false },
);

/**
 * 댓글 입력줄 — 채운 면 인풋(h 42, bg-input, radius 14, placeholder "댓글 입력") +
 * 채운 "등록" 버튼(accent, 13/700). 기사 세부·릴 세부 시트 공용. 시안(KAN-567)이
 * 등록 같은 확정 행동만 채운 면으로 두는 규칙이라 전송 아이콘 원 대신 글자 버튼이다.
 *
 * 두 자리에서 쓰인다. 댓글 헤더 밑의 원 댓글 입력줄이 기본이고, `parentCommentId`가
 * 오면 답글 입력줄이다. 원 댓글의 "답글"을 누른 자리에 인라인으로 생기며
 * (`CommentThread`) 취소 버튼이 붙는다. 등록 성공도 `onCancel`로 입력줄을 접는다.
 * 열려도 포커스는 주지 않는다(KAN-676). "답글 N"은 답글 목록과 입력줄을 같이 펼쳐서,
 * 자동 포커스가 있으면 답글을 읽으려던 사람에게도 키보드가 올라와 화면을 가렸다.
 * 쓰려는 사람은 입력줄을 한 번 더 누른다.
 *
 * 세션 게이트(KAN-303, KAN-665): 세션이 없으면 인풋에 포커스가 오거나 제출할 때 게스트를
 * 받아 온다. 처음 온 사람은 화면이 뜬 뒤 브라우저가 게스트를 받아 오는데 그보다 먼저 입력창을
 * 누를 수 있어서다. 받아 오지 못했을 때만 로그인 유도 팝업을 띄우고 입력을 막는다.
 * 쿠키는 있는데 토큰이 만료된 경우는 제출 때 401 `AUTH_REQUIRED`로 드러나므로
 * 같은 팝업으로 받는다. 게스트는 막지 않는다 — BE KAN-656부터 게스트도 댓글을
 * 쓸 수 있어 `isGuest`를 보지 않는다(KAN-657). 옛 BE가 아직 403
 * `AUTH_GUEST_FORBIDDEN`을 주면 같은 팝업이 연동 안내로 받는다.
 *
 * 글자수는 BE 검증(1~500자)을 클라에서 미리 건다 — `maxLength`로 초과 입력을
 * 막고, 공백만 입력은 전송을 건너뛴다. 그 밖의 실패(BE 거절·순단)는 입력줄
 * 밑에 문구로 보여주고 입력값은 남겨 다시 보낼 수 있게 한다.
 *
 * @param articleId 댓글을 달 기사(릴) id
 * @param parentCommentId 답글이면 원 댓글 id. 없으면 원 댓글 작성 모드
 * @param onCancel 답글 입력바를 접을 때(취소 탭·등록 성공) 호출
 * @param onPosted 등록 성공 시 호출 — 호출부가 헤더 카운트를 올리는 데 쓴다
 * @param className 래퍼에 덧붙일 클래스(여백 등)
 */
export function CommentComposer({
  articleId,
  parentCommentId,
  onCancel,
  onPosted,
  className = "",
}: {
  articleId: string;
  parentCommentId?: number;
  onCancel?: () => void;
  onPosted?: () => void;
  className?: string;
}) {
  const { isLoggedIn, ensureSession } = useAuth();
  const [value, setValue] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useCreateComment(articleId, onPosted);

  const isReply = parentCommentId != null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = value.trim();
    if (!content || isPending) return;
    if (!isLoggedIn && !(await ensureSession())) {
      setShowLogin(true);
      return;
    }

    setError(null);
    mutate(
      { content, parentCommentId },
      {
        onSuccess: () => {
          setValue("");
          onCancel?.();
        },
        onError: (err) => {
          if (needsSocialAccount(err)) {
            setShowLogin(true);
            return;
          }
          // BE 메시지가 이미 사용자용 한국어다(예: "공백일 수 없습니다")
          setError(
            err instanceof ApiError
              ? err.message
              : "댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요",
          );
        },
      },
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => {
            if (isLoggedIn) return;
            const input = e.currentTarget;
            void ensureSession().then((ok) => {
              if (ok) return;
              input.blur();
              setShowLogin(true);
            });
          }}
          placeholder={isReply ? "답글 입력" : "댓글 입력"}
          className="bg-input text-label-lg text-text placeholder:text-text-4 rounded-control h-10.5 min-w-0 flex-1 px-3.25 focus-visible:outline-none"
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-label-lg text-text-3 shrink-0 font-bold active:opacity-60"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          aria-label={isReply ? "답글 등록" : "댓글 등록"}
          disabled={isPending}
          className="bg-accent text-on-accent text-body rounded-control flex h-10.5 shrink-0 items-center px-4.5 font-bold active:opacity-60 disabled:opacity-40"
        >
          등록
        </button>
      </form>

      {error && <p className="text-caption text-danger-strong px-1">{error}</p>}

      {showLogin && <LoginPromptDialog onClose={() => setShowLogin(false)} />}
    </div>
  );
}
