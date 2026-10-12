"use client";

import { useState } from "react";
import { rem } from "@plick/domain/format";

/**
 * 인물 사진 원형 — 사진 URL을 그리고, 없거나 로드에 실패하면 아바타 배경
 * 토큰의 원으로 폴백한다. 폴백 상태 때문에 클라 컴포넌트다.
 *
 * 라이브 스코어 선수단(API-Football CDN)에서 시작해 인물 태그 칩과 팀·인물
 * 프로필(KAN-500)이 쓰다가, 웹 급상승 랭킹·인물 프로필(KAN-501)이 붙으면서
 * 모바일 `_components/`와 웹 `live/_components/`에 있던 같은 파일 두 벌을
 * 여기로 합쳤다(ADR 0011 게이트 C). BE `imageUrl`은 확인 시점 인물 전원이
 * null이라 폴백이 기본 경로다.
 *
 * @param src - 사진 URL (null이면 바로 폴백)
 * @param name - alt 텍스트
 * @param size - 한 변 px
 * @param square - 정사각 칸(팀 프로필 선수단 표, KAN-599). 칩 면 바탕에 상단 기준으로 자른다
 */
export function PlayerPhoto({
  src,
  name,
  size,
  square = false,
  className = "",
}: {
  src: string | null;
  name: string;
  size: number;
  square?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = { width: rem(size), height: rem(size) };
  const shape = square ? "bg-chip object-top" : "bg-avatar rounded-full";

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={`${shape} shrink-0 ${className}`}
        style={box}
      />
    );
  }
  return (
    /* 사진 호스트가 외부 CDN이라 next/image 대신 일반 img로 그린다 (MediaThumb과 같은 이유) */
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={box}
      className={`${shape} shrink-0 object-cover ${className}`}
    />
  );
}
