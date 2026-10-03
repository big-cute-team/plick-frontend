import { BRAND_NAME_KO } from "@plick/domain/brand";

/**
 * 가로형 로고 원본 비율 — `scripts/brand-assets`가 만든 `/brand/logo-horizontal.png`
 * (581x200)이다. 높이만 받고 너비는 여기서 계산해 레이아웃 시프트를 막는다.
 */
const LOGO_ASPECT = 581 / 200;

/**
 * 해축이모 가로형 로고 (KAN-583) — 보라색 사자 캐릭터 + 초록 글자 PNG다. 시안의
 * 쓰임 높이는 앱 상단 바 32, 웹 GNB 40, 웹 로그인 카드 51, 앱 로그인 화면 67이다.
 * KAN-567에서는 Noto Sans KR 900 글자 워드마크("해축"+"이모")였는데 새 로고가
 * 래스터 이미지라 SVG 대신 PNG를 두 앱 `public/brand/`에 같은 경로로 둔다.
 *
 * `next/image`를 안 쓰는 이유: 이 패키지는 next에 의존하지 않고, 원본이 화면
 * 최대 사용 높이의 3배(200px)라 최적화 없이도 충분히 작다(40KB).
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
  return (
    <img
      src="/brand/logo-horizontal.png"
      alt={BRAND_NAME_KO}
      width={Math.round(height * LOGO_ASPECT)}
      height={height}
      decoding="async"
      className={`block ${className}`}
    />
  );
}
