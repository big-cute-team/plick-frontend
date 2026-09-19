"use client";

import { useEffect, useState } from "react";
import { guestLinkNotice } from "@plick/domain/format";
import { GUEST_NOTICE, GUEST_NOTICE_COOKIE } from "@/_constants/api";
import { GUEST_NOTICE_DURATION_MS } from "@/_constants/feedback";

/**
 * 게스트 안내 토스트 (KAN-514) — 게스트를 방금 발급했거나, 연동했더니 기존 계정이었을 때
 * 하단에 한 번 띄운다. 루트 레이아웃에 한 번만 마운트한다.
 *
 * 왜 쿠키를 신호로 쓰나: 안내는 "발급이 일어난 그 순간"에만 떠야 하는데, 발급은 edge에서
 * 도는 프록시가 하고 토스트는 브라우저에 있다. 그 사이를 이을 수 있는 게 응답 쿠키뿐이다
 * (프록시는 렌더 트리에 값을 넘길 수 없고, 서버 컴포넌트는 발급 여부를 모른다).
 * 그래서 프록시·연동 액션이 표식 쿠키를 심고 여기서 읽는다.
 *
 * 그리고 **읽은 즉시 지운다**. 안 지우면 표식이 살아 있는 동안 화면을 옮길 때마다 같은
 * 안내가 다시 뜬다. 쿠키를 JS로 지우려면 HttpOnly가 아니어야 해서, 이 표식만 예외로
 * HttpOnly를 뺐다(`GUEST_NOTICE_COOKIE` 주석 참고). 마감 시각은 표식이 아니라 서버가
 * 읽어 내려준 `guestExpiresAt`을 쓴다 — 쿠키 값은 브라우저에서 고칠 수 있기 때문이다.
 *
 * 마운트 뒤에만 읽는 이유는 `document`가 서버 렌더에 없어서다. 첫 페인트보다 한 박자
 * 늦게 뜨지만, 안내는 첫 프레임에 있어야 할 정보가 아니다.
 *
 * @param guestExpiresAt 서버가 쿠키에서 읽어 넘긴 게스트 마감 시각. 소셜이면 null
 */
export function GuestNoticeToast({
  guestExpiresAt,
}: {
  guestExpiresAt: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const kind = readNoticeCookie();
    if (!kind) return;
    clearNoticeCookie();

    setMessage(
      kind === GUEST_NOTICE.existing
        ? "이미 가입된 계정이라 게스트 때 기록은 이어지지 않았어요."
        : `지금부터 기록이 쌓여요. ${guestLinkNotice(guestExpiresAt)}`,
    );
    const timer = setTimeout(() => setMessage(null), GUEST_NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [guestExpiresAt]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-edge pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center"
    >
      <p className="bg-elevate border-border text-text rounded-card text-label border px-4 py-2.5 text-center font-semibold">
        {message}
      </p>
    </div>
  );
}

/** 표식 쿠키를 읽는다. 아는 값이 아니면 null — 브라우저에서 고친 값을 그대로 믿지 않는다. */
function readNoticeCookie(): string | null {
  const hit = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${GUEST_NOTICE_COOKIE}=`));
  const value = hit?.slice(GUEST_NOTICE_COOKIE.length + 1);
  return value === GUEST_NOTICE.issued || value === GUEST_NOTICE.existing
    ? value
    : null;
}

/** 표식을 소모한다 — 같은 안내가 화면을 옮길 때마다 다시 뜨지 않게 수명을 0으로 덮어쓴다. */
function clearNoticeCookie(): void {
  document.cookie = `${GUEST_NOTICE_COOKIE}=; path=/; max-age=0`;
}
