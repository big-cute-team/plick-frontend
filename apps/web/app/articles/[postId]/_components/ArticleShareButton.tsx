"use client";

import { useState } from "react";
import { ShareDialog } from "@/_components/ShareDialog";
import { articleSharePath } from "@/_utils/share";

/**
 * 기사 세부 공유 버튼 (KAN-485, 모바일 KAN-312 이식, 시안 KAN-567) — 액션 줄에서
 * 하트 옆에 서는 "공유" 13/700 텍스트 버튼. 보조색이고 hover에 제목색이다.
 * 아이콘 알약이었는데 시안이 글자만이라 걷었다.
 *
 * 서버 컴포넌트인 `ArticleMain`에서 이 버튼만 클라 경계로 떼어 냈다
 * (`ArticleLikeButton`과 같은 이유 — 본문 전체를 클라로 내리면 문단·관련 기사까지
 * 번들에 실린다). 여는 상태만 여기서 들고, 주소 조립과 복사는 `ShareDialog`가
 * 맡는다. 릴의 공유 버튼(`ReelItem`)과 같은 팝업이다.
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
        className="text-body text-text-3 hover:text-text-strong focus-visible:outline-accent font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        공유
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
