"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/_components/ConfirmDialog";
import { deleteAccount } from "@/_services/users";

/**
 * 회원 탈퇴 텍스트 버튼 + 확인 팝업 (KAN-391, 모바일과 같은 흐름) — MY 좌측 메뉴의
 * 로그아웃 밑 진입점. 시안(KAN-567 MY 588행)대로 12.5 보조색 글자이고 hover면 빨강이다.
 * 되돌릴 수 없는 동작이라 화면에서 소리치게 두지 않고, danger 톤은 확인 팝업의 탈퇴
 * 버튼에만 준다. 탈퇴는 복구가 불가능하므로 무엇이 남고 무엇이 지워지는지(댓글은
 * 탈퇴한사용자로 남음)와 같은 계정 재가입이 7일간 막힌다는 것(KAN-393)을 본문에 밝힌다.
 *
 * 확인하면 쿼리 캐시를 통째로 비우고(KAN-309, redirect가 소프트 내비게이션이라
 * 유저별 캐시가 살아남는다) 탈퇴 서버 액션을 부른다. 성공하면 액션이 쿠키를 지우고
 * 홈으로 redirect하므로 여기선 닫는 처리가 없다. 실패하면 에러 문구를 팝업에 남겨
 * 다시 시도할 수 있게 한다.
 */
export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const confirm = () => {
    setError(null);
    queryClient.clear();
    startTransition(async () => {
      const result = await deleteAccount();
      if (result) {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="text-label-lg text-text-3 hover:text-danger focus-visible:outline-accent py-1.75 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        회원 탈퇴
      </button>

      {open && (
        <ConfirmDialog
          title="정말 탈퇴할까요?"
          description="탈퇴하면 복구할 수 없어요. 작성한 댓글은 탈퇴한사용자로 남고, 같은 계정으로는 7일이 지나야 다시 가입할 수 있어요"
          confirmLabel="탈퇴하기"
          pending={isPending}
          error={error}
          onConfirm={confirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
