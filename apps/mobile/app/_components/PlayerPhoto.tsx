"use client";

import { useState } from "react";

/**
 * 인물 사진 원형 — 외부 사진 URL을 그리고, 없거나 실패하면 아바타 배경
 * 토큰의 빈 원으로 폴백한다(껍데기 때의 `bg-avatar` 자리). 폴백 상태
 * 때문에 클라 컴포넌트다.
 *
 * 라이브 스코어 선수단(API-Football CDN)에서 쓰다가 인물 태그 칩과
 * 팀·인물 프로필(KAN-500, BE `imageUrl`)이 두 번째 사용처가 되면서
 * `_components/`로 올렸다. 확인 시점 BE 인물 사진은 전원 null이라 프로필과
 * 칩에서는 폴백 원이 기본 경로다.
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
