import { rem } from "@plick/domain/format";
import ars from "./assets/teams/ars.webp";
import ars290 from "./assets/teams/ars-290.webp";
import che from "./assets/teams/che.webp";
import che290 from "./assets/teams/che-290.webp";
import liv from "./assets/teams/liv.webp";
import liv290 from "./assets/teams/liv-290.webp";
import mci from "./assets/teams/mci.webp";
import mci290 from "./assets/teams/mci-290.webp";
import mun from "./assets/teams/mun.webp";
import mun290 from "./assets/teams/mun-290.webp";
import tot from "./assets/teams/tot.webp";
import tot290 from "./assets/teams/tot-290.webp";

type CrestImage = { src: string; width: number; height: number };

/**
 * 팀 코드별 크레스트 두 단계 (`scripts/brand-assets`가 구단 공식 SVG에서 만든다).
 * 132는 40px 자리(×1.1 배율 ×DPR 3), 290은 팀 프로필 머리 88px 자리다. import해 두면
 * Next가 `/_next/static/media/<이름>.<해시>.webp`로 묶어 CDN이 1년 캐시한다 (KAN-624).
 */
const CRESTS: Record<string, { small: CrestImage; large: CrestImage }> = {
  ARS: { small: ars, large: ars290 },
  CHE: { small: che, large: che290 },
  LIV: { small: liv, large: liv290 },
  MCI: { small: mci, large: mci290 },
  MUN: { small: mun, large: mun290 },
  TOT: { small: tot, large: tot290 },
};

/**
 * `html { font-size: 110% }`(theme.css, KAN-574) 배율. `rem(size)`로 그린 크레스트의 실제
 * CSS px은 `size × 1.1`이라 `sizes`에 그 값을 줘야 브라우저가 DPR을 곱해 맞는 판을 고른다.
 */
const UI_SCALE = 1.1;

/**
 * 팀 크레스트 — 빅6 구단 로고를 그린다. 빅6 밖 팀은 `LiveCrest`가 맡는다.
 *
 * 로고 원본 비율이 팀마다 달라(세로형 등) 정사각 박스에 `object-contain`으로 담는다.
 * 전에는 두 앱 `public/teams/<code>.webp` 160px 한 장을 13px 칩부터 88px 프로필 머리까지
 * 다 썼다. 작은 자리는 과하고 큰 자리는 흐렸고, `public/`이라 CDN도 브라우저도 캐시하지
 * 않았다. 지금은 132·290 두 장을 `srcset`으로 고른다 (KAN-624).
 *
 * @param team - 팀 레지스트리 항목 (예: `TEAMS.LIV` — `code`로 에셋, `name`으로 alt)
 * @param size - 렌더 크기(시안 px, 정사각형). rem으로 그려 전체 배율을 따른다
 * @param decorative - 옆에 팀명 텍스트가 있으면 true. alt를 비워 스크린리더가 팀명을 두 번 읽지
 *   않게 한다(image-redundant-alt, KAN-670)
 */
export function TeamCrest({
  team,
  size = 40,
  className = "",
  decorative = false,
}: {
  team: { code: string; name: string };
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const crest = CRESTS[team.code.toUpperCase()];
  if (!crest) return null;
  return (
    /* 로고는 수 KB 정적 에셋이라 next/image 최적화 없이 그대로 서빙한다 */
    <img
      src={crest.small.src}
      srcSet={`${crest.small.src} ${crest.small.width}w, ${crest.large.src} ${crest.large.width}w`}
      sizes={`${Math.round(size * UI_SCALE)}px`}
      alt={decorative ? "" : team.name}
      width={size}
      height={size}
      /* Tailwind preflight(img { height:auto })가 height 속성을 무시해 인라인으로 고정 */
      style={{ width: rem(size), height: rem(size) }}
      className={`object-contain ${className}`}
    />
  );
}
