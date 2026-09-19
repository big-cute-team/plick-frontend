"use client";

import { useState } from "react";

/**
 * 선수 사진 원형 — API-Football CDN 사진을 그리고, 없거나 실패하면 아바타
 * 배경 토큰의 빈 원으로 폴백한다(껍데기 때의 `bg-avatar` 자리). 폴백 상태
 * 때문에 클라 컴포넌트다.
 *
 * @param src - 사진 URL (null이면 바로 폴백)
 * @param name - alt 텍스트
 * @param size - 한 변 px
 */
export function PlayerPhoto({
  src,
  name,
  size,
  className = "",
}: {
  src: string | null;
  name: string;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={`bg-avatar shrink-0 rounded-full ${className}`}
        style={box}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- CDN 사진 호스트가 외부라 next/image 대신 일반 img (MediaThumb과 같은 이유)
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={box}
      className={`bg-avatar shrink-0 rounded-full object-cover ${className}`}
    />
  );
}
