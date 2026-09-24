"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SendIcon } from "@plick/ui/icons";
import { articleSharePath } from "@/_utils/share";

/**
 * ShareDialog는 탭해야 뜨는 조건부 UI라 초기 번들에서 뺀다 (KAN-428).
 */
const ShareDialog = dynamic(
  () => import("@/_components/ShareDialog").then((m) => m.ShareDialog),
  { ssr: false },
);

/**
 * 기사 세부 공유 버튼 (KAN-312). 두 자리에 선다 (KAN-567). 상단바 오른쪽의
 * 아이콘 하나(20px, text-3)와 본문 밑 액션 줄의 아이콘 + "공유"(17px, 13.5/700)다.
 * 둘 다 같은 공유 시트를 연다.
 *
 * 서버 컴포넌트인 `ArticleBody`·`ArticleTopBar`에서 이 버튼만 클라 경계로 떼어 냈다
 * (`ArticleLikeButton`과 같은 이유 — 본문 전체를 클라로 내리면 문단·관련 기사까지
 * 번들에 실린다). 여는 상태만 여기서 들고, 주소 조립과 복사는 시트가 맡는다.
 *
 * 로그인 없이도 되는 동작이라 비로그인 시트가 없다.
 *
 * @param articleId 공유할 기사 id
 * @param variant `bar`는 상단바 아이콘, `row`(기본)는 액션 줄의 아이콘 + 글자
 */
export function ArticleShareButton({
  articleId,
  variant = "row",
}: {
  articleId: string;
  variant?: "bar" | "row";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={variant === "bar" ? "공유" : undefined}
        className={
          variant === "bar"
            ? "text-text-3 -mr-1 grid size-8 shrink-0 place-items-center active:opacity-60"
            : "text-text-2 text-body flex items-center gap-1.5 font-bold active:opacity-60"
        }
      >
        <SendIcon size={variant === "bar" ? 20 : 17} />
        {variant === "row" && "공유"}
      </button>

      {open && (
        <ShareDialog
          path={articleSharePath(articleId)}
          articleId={articleId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
