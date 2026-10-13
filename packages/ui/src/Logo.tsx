import { BRAND_NAME_KO } from "@plick/domain/brand";
import logo100 from "./assets/brand/logo-horizontal-100.webp";
import logo134 from "./assets/brand/logo-horizontal-134.webp";
import logo201 from "./assets/brand/logo-horizontal-201.webp";

/**
 * 가로형 로고 원본 비율 — `scripts/brand-assets`가 만든 원본(581x200)이다. 높이만 받고
 * 너비는 여기서 계산해 레이아웃 시프트를 막는다.
 */
const LOGO_ASPECT = 581 / 200;

/**
 * 화면용 webp 후보. 높이 100(디자이너 내보내기)·134·201 파일을 import해 두면 Next가
 * `/_next/static/media/<이름>.<해시>.webp`로 묶고 실제 너비를 같이 준다. 브라우저가
 * `sizes`(렌더 너비)에 DPR을 곱해 그 이상인 가장 작은 후보를 고른다.
 */
const LOGO_SRCSET = [logo100, logo134, logo201]
  .map((image) => `${image.src} ${image.width}w`)
  .join(", ");

/**
 * 해축이모 가로형 로고 (KAN-583) — 보라색 사자 캐릭터 + 초록 글자다. 시안의
 * 쓰임 높이는 앱 상단 바 32, 웹 GNB 40, 웹 로그인 카드 51, 앱 로그인 화면 67이다.
 * KAN-567에서는 Noto Sans KR 900 글자 워드마크("해축"+"이모")였는데 새 로고가
 * 래스터 이미지라 SVG 대신 비트맵이다.
 *
 * 처음엔 `public/brand/`의 높이 200 PNG 한 장(40KB)을 모든 자리에 썼는데, 상단 바
 * 32px 자리에는 6배 큰 그림이라 전 화면 Lighthouse "이미지 전송" 항목에 잡혔고,
 * `public/`은 이름에 해시가 없어 CDN을 못 타고 `max-age=0`이라 페이지마다 다시
 * 요청했다 (KAN-624). 지금은 webp 세 단계를 import해 `srcset`에 두고 `sizes`에 렌더
 * 너비를 그대로 준다. 상단 바는 DPR 3에서도 100 높이(8KB)면 되고, 해시 경로라
 * S3+CloudFront가 1년 immutable로 캐시한다. OG 이미지용 PNG는 `apps/web/assets/og`에
 * 따로 있다.
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
      src={logo100.src}
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
