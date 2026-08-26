"use client";

import { useEffect, useRef, useState } from "react";
import { COPY_FEEDBACK_MS } from "@/_constants/share";
import type { CopyStatus } from "@/_types/share";
import { copyText } from "@/_utils/share";

/**
 * 링크 복사 버튼의 상태 (KAN-312, web 이식 KAN-349) — 눌러서 복사하고, 잠깐
 * 결과를 보여준 뒤 되돌린다. 모바일 `_hooks/useCopyLink.ts`와 동일 구현이다.
 *
 * 성공은 {@link COPY_FEEDBACK_MS} 뒤에 `idle`로 돌아간다. 팝업을 닫지 않고 그대로
 * 두는 화면이라(복사한 주소를 눈으로 확인하는 게 이 팝업의 목적) 라벨만 되돌린다.
 * 실패는 되돌리지 않는다 — 안내 문구를 읽고 직접 복사해야 하는데 문구가 사라지면
 * 왜 안 됐는지 알 길이 없다. 다시 누르면 그때 다시 판정한다.
 *
 * 타이머는 언마운트와 재시도 때 정리한다. 안 그러면 닫힌 팝업의 상태를 늦게 건드린다.
 *
 * @param text 복사할 문자열(공유 주소)
 */
export function useCopyLink(text: string) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function copy() {
    clearTimeout(timerRef.current);
    const copied = await copyText(text);
    setStatus(copied ? "copied" : "failed");
    if (copied) {
      timerRef.current = setTimeout(() => setStatus("idle"), COPY_FEEDBACK_MS);
    }
  }

  return { status, copy };
}
