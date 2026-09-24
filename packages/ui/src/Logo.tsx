import { LOGO_PARTS } from "@plick/domain/brand";

/**
 * 해축이모 워드마크 (KAN-567) — 글자 로고다. "해축"은 강조색, "이모"는 제목색으로
 * 900 굵기에 자간 -.06em, 두 토막 사이 1px. 시안의 상단 바(앱 19px, 웹 23px)
 * 그대로다. 전에는 PLick SVG 워드마크였다.
 *
 * 폰트를 물려받으므로 상위에 앱 폰트(`--font-noto`)가 걸려 있어야 시안과 같다.
 *
 * @param size - 글자 크기 px (앱 상단 바 19, 웹 상단 바 23)
 * @param className - 바깥 span에 더할 클래스
 */
export function Logo({
  size = 19,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const [head, tail] = LOGO_PARTS;
  return (
    <span
      aria-label={`${head}${tail}`}
      className={`tracking-logo inline-flex items-baseline gap-px leading-none font-black ${className}`}
      style={{ fontSize: size }}
    >
      <span aria-hidden className="text-accent">
        {head}
      </span>
      <span aria-hidden className="text-text-strong">
        {tail}
      </span>
    </span>
  );
}
