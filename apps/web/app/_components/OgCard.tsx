/**
 * 동적 OG 이미지(1200x630) 카드 템플릿 (KAN-351) — 기사 상세·팀 허브의
 * `og/route.tsx`가 함께 쓴다.
 *
 * 화면 컴포넌트가 아니라 `next/og`(satori)가 PNG로 래스터라이즈하는 JSX다.
 * satori는 flex 레이아웃과 인라인 스타일만 지원하고 Tailwind 클래스와 CSS
 * 변수를 못 읽는다 — 색은 아래 상수로 박고, 토큰(`packages/tokens/theme.css`)이
 * 바뀌면 여기도 맞춘다(정적 OG 스크립트 `scripts/og-image/render.mjs`와 같은 규약).
 *
 * 디자인은 정적 브랜드 OG(ADR 0070)의 연장이다 — 다크 배경 + 라디얼 글로우.
 * 글로우가 팀 컬러가 되고, 우측에 팀 로고가 반투명 워터마크로 얹힌다.
 */
import type { TeamCode } from "@plick/domain/types";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/* theme.css 다크 토큰 사본 */
const BG = "#0b0d12";
const TEXT = "#eef2f8";
const TEXT_3 = "#93a0b4";
const ACCENT = "#2fd97f";

/** theme.css `--plk-team-*` 사본 — 글로우·배지 색 */
export const TEAM_OG_COLORS: Record<TeamCode, string> = {
  LIV: "#c8102e",
  TOT: "#132257",
  ARS: "#ef0107",
  MUN: "#da291c",
  CHE: "#034694",
  MCI: "#6cabdd",
};

/** hex 색을 지정 투명도의 rgba()로 — satori 그라디언트 stop에 쓴다 */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** PLick 워드마크 — `@plick/ui` Logo.tsx 벡터 원본, 색만 OG 상수로 고정 */
function OgWordmark({ height }: { height: number }) {
  const ratio = 33.0001 / 10.5383;
  return (
    <svg height={height} width={height * ratio} viewBox="0 0 33.0001 10.5383">
      <path
        d="M8.22051 10.4064V0.766837H10.6916V8.40602H14.6453V10.4064H8.22051Z"
        fill={TEXT}
      />
      <path
        d="M0 10.4065V0.766865H4.0667C4.78842 0.766865 5.41442 0.90807 5.94473 1.19048C6.47503 1.46975 6.88609 1.86356 7.17792 2.37189C7.46974 2.87709 7.61565 3.46545 7.61565 4.13696C7.61565 4.81474 7.4666 5.40466 7.1685 5.90672C6.8704 6.40879 6.44836 6.79632 5.90237 7.06931C5.35951 7.34231 4.72095 7.47881 3.98669 7.47881H1.5156V5.5443H3.50659C3.83607 5.5443 4.11377 5.48782 4.3397 5.37485C4.56876 5.25875 4.74292 5.09558 4.86216 4.88534C4.98453 4.67197 5.04572 4.4225 5.04572 4.13696C5.04572 3.85141 4.98453 3.60508 4.86216 3.39798C4.74292 3.19088 4.56876 3.03242 4.3397 2.92259C4.11377 2.80963 3.83607 2.75315 3.50659 2.75315H2.47109V10.4065H0Z"
        fill={TEXT}
      />
      <path d="M15.0911 10.3466V3.25727H17.5819V10.3466H15.0911Z" fill={TEXT} />
      <path
        d="M27.912 8.599L27.9261 5.68548H28.2556L30.1477 3.17673H32.9106L29.9312 6.92337H29.2581L27.912 8.599ZM25.7092 10.4064V0.766837H28.1567V10.4064H25.7092ZM30.1807 10.4064L28.4109 7.47407L30.0112 5.73725L33.0001 10.4064H30.1807Z"
        fill={TEXT}
      />
      <path
        d="M21.614 10.5383C20.8389 10.5383 20.1753 10.3829 19.623 10.0723C19.0739 9.75851 18.6518 9.32234 18.3569 8.7638C18.0619 8.20212 17.9144 7.55101 17.9144 6.81046C17.9144 6.07306 18.0619 5.42352 18.3569 4.86183C18.6518 4.30015 19.0754 3.86399 19.6277 3.55333C20.18 3.23955 20.8421 3.08265 21.614 3.08265C22.3012 3.08265 22.899 3.20817 23.4073 3.4592C23.9156 3.70709 24.311 4.05854 24.5934 4.51353C24.8758 4.96538 25.0217 5.49569 25.0311 6.10444H22.753C22.7122 5.73103 22.5946 5.44234 22.4 5.23838C22.2086 5.03128 21.9576 4.92773 21.6469 4.92773C21.4022 4.92773 21.1872 4.99833 21.0021 5.13954C20.817 5.2776 20.6726 5.48471 20.5691 5.76084C20.4655 6.03697 20.4137 6.38057 20.4137 6.79164C20.4137 7.2027 20.4639 7.54787 20.5644 7.82714C20.6679 8.10327 20.8123 8.31194 20.9974 8.45315C21.1825 8.59121 21.399 8.66025 21.6469 8.66025C21.8478 8.66025 22.0266 8.61632 22.1835 8.52846C22.3404 8.43746 22.4675 8.3041 22.5648 8.12838C22.6652 7.95265 22.7279 7.73771 22.753 7.48354H25.0311C25.0186 8.1017 24.8727 8.63985 24.5934 9.09798C24.3141 9.55611 23.9219 9.9107 23.4167 10.1617C22.9115 10.4128 22.3106 10.5383 21.614 10.5383Z"
        fill={TEXT}
      />
      <path
        d="M17.5394 1.24401C17.5394 1.93106 16.9825 2.48802 16.2954 2.48802C15.6084 2.48802 15.0514 1.93106 15.0514 1.24401C15.0514 0.556962 15.6084 0 16.2954 0C16.9825 0 17.5394 0.556962 17.5394 1.24401Z"
        fill={ACCENT}
      />
    </svg>
  );
}

/**
 * OG 카드 본체.
 *
 * @param title 카드 제목 — 호출부가 길이를 미리 자른다(satori lineClamp는 보조)
 * @param badge 루머 단계 라벨. null이면 배지를 그리지 않는다
 * @param teamColor 대표 팀 컬러 hex. null이면 브랜드 accent로 글로우를 그린다
 * @param logoSrc 팀 로고 PNG data URI. null이면 워터마크 없이 글로우만
 * @param logoOpacity 워터마크 투명도 — 기사(0.3)는 제목이 주인공, 팀 허브(0.5)는
 *   로고가 아이덴티티라 조금 더 선명하게
 * @param showTagline 하단 태그라인 표시 여부 — 제목이 태그라인 그 자체인
 *   브랜드 폴백 카드에서만 끈다(중복 방지)
 */
export function OgCard({
  title,
  badge = null,
  teamColor = null,
  logoSrc = null,
  logoOpacity = 0.3,
  showTagline = true,
}: {
  title: string;
  badge?: string | null;
  teamColor?: string | null;
  logoSrc?: string | null;
  logoOpacity?: number;
  showTagline?: boolean;
}) {
  const glow = teamColor ?? ACCENT;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: BG,
        backgroundImage: `radial-gradient(circle at 82% 38%, ${withAlpha(glow, 0.34)} 0%, ${withAlpha(glow, 0.1)} 45%, rgba(0, 0, 0, 0) 68%)`,
        fontFamily: "Pretendard",
      }}
    >
      {logoSrc && (
        /* eslint-disable-next-line @next/next/no-img-element -- satori 렌더에는 next/image가 없다 */
        <img
          src={logoSrc}
          width={470}
          height={470}
          style={{
            position: "absolute",
            right: -36,
            top: 80,
            opacity: logoOpacity,
          }}
          alt=""
        />
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: "64px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            flexGrow: 1,
            maxWidth: 790,
          }}
        >
          {badge && (
            <div
              style={{
                display: "flex",
                padding: "10px 24px",
                borderRadius: 999,
                border: `2px solid ${withAlpha(glow, 0.75)}`,
                backgroundColor: withAlpha(glow, 0.22),
                color: TEXT,
                fontSize: 26,
                letterSpacing: 2,
                marginBottom: 34,
              }}
            >
              {badge}
            </div>
          )}
          <div
            style={{
              display: "block",
              lineClamp: 3,
              fontSize: 62,
              fontWeight: 600,
              lineHeight: 1.3,
              color: TEXT,
              wordBreak: "keep-all",
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <OgWordmark height={42} />
          {showTagline && (
            <div style={{ display: "flex", fontSize: 26, color: TEXT_3 }}>
              프리미어리그 소식을 릴스로
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
