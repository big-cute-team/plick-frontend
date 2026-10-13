import { BRAND_NAME_KO } from "@plick/domain/brand";

/**
 * 가로형 로고 원본 비율 — `scripts/brand-assets`가 만든 `/brand/logo-horizontal.png`
 * (581x200)이다. 높이만 받고 너비는 여기서 계산해 레이아웃 시프트를 막는다.
 */
const LOGO_ASPECT = 581 / 200;

/**
 * 화면용 webp 후보. `scripts/brand-assets`가 두는 높이 100(디자이너 내보내기)·134·201 파일의
 * 실제 너비다. 브라우저가 `sizes`(렌더 너비)에 DPR을 곱해 그 이상인 가장 작은 후보를 고른다.
 */
const LOGO_WEBP = [
  { height: 100, width: 284 },
  { height: 134, width: 389 },
  { height: 201, width: 584 },
];

const LOGO_SRCSET = LOGO_WEBP.map(
  ({ height, width }) => `/brand/logo-horizontal-${height}.webp ${width}w`,
).join(", ");

/**
 * 해축이모 가로형 로고 (KAN-583) — 보라색 사자 캐릭터 + 초록 글자다. 시안의
 * 쓰임 높이는 앱 상단 바 32, 웹 GNB 40, 웹 로그인 카드 51, 앱 로그인 화면 67이다.
 * KAN-567에서는 Noto Sans KR 900 글자 워드마크("해축"+"이모")였는데 새 로고가
 * 래스터 이미지라 SVG 대신 비트맵을 두 앱 `public/brand/`에 같은 경로로 둔다.
 *
 * 처음엔 높이 200 PNG 한 장(40KB)을 모든 자리에 썼는데, 상단 바 32px 자리에는
 * 6배 큰 그림이라 전 화면 Lighthouse "이미지 전송" 항목에 잡혔다 (KAN-624). 지금은
 * webp 세 단계를 `srcset`에 두고 `sizes`에 렌더 너비를 그대로 줘 브라우저가 DPR에
 * 맞는 것을 고른다. 상단 바는 DPR 3에서도 100 높이(8KB)면 된다. PNG는 OG 이미지용으로
 * 남아 있다.
 *
 * `next/image`를 안 쓰는 이유: 이 패키지는 next에 의존하지 않는다.
 *
 * @param height - 렌더 높이 px
 * @param className - img에 더할 클래스
 */
export function Logo({
  height = 32,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  const width = Math.round(height * LOGO_ASPECT);
  return (
    <img
      src="/brand/logo-horizontal-100.webp"
      srcSet={LOGO_SRCSET}
      sizes={`${width}px`}
      alt={BRAND_NAME_KO}
      width={width}
      height={height}
      decoding="async"
      className={`block ${className}`}
    />
  );
}
