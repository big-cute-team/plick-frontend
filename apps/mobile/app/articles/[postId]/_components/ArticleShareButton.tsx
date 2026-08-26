"use client";

import { useState } from "react";
import { SendIcon } from "@plick/ui/icons";
import { ShareDialog } from "@/_components/ShareDialog";
import { articleSharePath } from "@/_utils/share";

/**
 * 기사 세부 공유 버튼 (KAN-312) — 본문 밑 액션 줄에서 좋아요 알약 옆에 선다.
 *
 * 서버 컴포넌트인 `ArticleBody`에서 이 버튼만 클라 경계로 떼어 냈다
 * (`ArticleLikeButton`과 같은 이유 — 본문 전체를 클라로 내리면 문단·추천 카드까지
 * 번들에 실린다). 여는 상태만 여기서 들고, 주소 조립과 복사는 팝업이 맡는다.
 *
 * 로그인 없이도 되는 동작이라 비로그인 팝업이 없다.
 *
 * @param articleId 공유할 기사 id
 */
export function ArticleShareButton({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-elevate-2 border-border text-text-2 text-body-lg rounded-pill flex h-10 items-center gap-1.5 border px-4 font-bold active:opacity-70"
      >
        <SendIcon size={17} />
        공유
      </button>

      {open && (
        <ShareDialog
          path={articleSharePath(articleId)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
