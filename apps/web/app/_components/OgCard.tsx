/**
 * 동적 OG 이미지(1200x630) 카드 템플릿 (KAN-351, 시안 KAN-567) — 기사 상세·팀 허브의
 * `og/route.tsx`가 함께 쓴다.
 *
 * 화면 컴포넌트가 아니라 `next/og`(satori)가 PNG로 래스터라이즈하는 JSX다.
 * satori는 flex 레이아웃과 인라인 스타일만 지원하고 Tailwind 클래스와 CSS
 * 변수를 못 읽는다 — 색은 아래 상수로 박고, 토큰(`packages/tokens/theme.css`)이
 * 바뀌면 여기도 맞춘다(정적 OG 스크립트 `scripts/og-image/render.mjs`와 같은 규약).
 *
 * 디자인은 리디자인 라이트 팔레트다 — 흰 바탕, 왼쪽에 팀 컬러(없으면 강조색)
 * 세로 띠, 우측에 팀 로고 워터마크, 하단에 해축이모 글자 워드마크와 태그라인.
 * 루머 단계 배지는 시안 규칙("루머 단계 라벨은 노출하지 않는다")대로 뺐다.
 */
import { BRAND_TAGLINE, LOGO_PARTS } from "@plick/domain/brand";
import type { TeamCode } from "@plick/domain/types";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/* theme.css 라이트 토큰 사본 */
const BG = "#ffffff";
const TEXT_STRONG = "#16181b";
const TEXT_3 = "#5f6368";
const ACCENT = "#0a6b42";
const LOGO_TAIL = "#1f1f1f";

/** theme.css `--plk-team-*` 사본 — 세로 띠 색 */
export const TEAM_OG_COLORS: Record<TeamCode, string> = {
  LIV: "#c8102e",
  TOT: "#132257",
  ARS: "#ef0107",
  MUN: "#da291c",
  CHE: "#034694",
  MCI: "#6cabdd",
};

/** 해축이모 글자 워드마크 — `@plick/ui` Logo와 같은 분절·굵기·자간 */
function OgWordmark({ size }: { size: number }) {
  const [head, tail] = LOGO_PARTS;
  return (
    <div
      style={{
        display: "flex",
        fontSize: size,
        fontWeight: 900,
        letterSpacing: "-0.06em",
        lineHeight: 1,
      }}
    >
      <span style={{ color: ACCENT }}>{head}</span>
      <span style={{ color: LOGO_TAIL, marginLeft: 1 }}>{tail}</span>
    </div>
  );
}

/**
 * OG 카드 본체.
 *
 * @param title 카드 제목 — 호출부가 길이를 미리 자른다(satori lineClamp는 보조)
 * @param teamColor 대표 팀 컬러 hex. null이면 강조색 띠를 두른다
 * @param logoSrc 팀 로고 PNG data URI. null이면 워터마크 없음
 * @param logoOpacity 워터마크 투명도 — 기사(0.12)는 제목이 주인공, 팀 허브(0.2)는
 *   로고가 아이덴티티라 조금 더 선명하게. 흰 바탕이라 다크 시절보다 훨씬 옅다
 * @param showTagline 하단 태그라인 표시 여부 — 제목이 태그라인 그 자체인
 *   브랜드 폴백 카드에서만 끈다(중복 방지)
 */
export function OgCard({
  title,
  teamColor = null,
  logoSrc = null,
  logoOpacity = 0.12,
  showTagline = true,
}: {
  title: string;
  teamColor?: string | null;
  logoSrc?: string | null;
  logoOpacity?: number;
  showTagline?: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: BG,
        fontFamily: "Noto Sans KR",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 16,
          height: "100%",
          backgroundColor: teamColor ?? ACCENT,
        }}
      />
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
          padding: "64px 72px 60px 88px",
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
          <div
            style={{
              display: "block",
              lineClamp: 3,
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.32,
              letterSpacing: "-0.03em",
              color: TEXT_STRONG,
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
          <OgWordmark size={46} />
          {showTagline && (
            <div style={{ display: "flex", fontSize: 26, color: TEXT_3 }}>
              {BRAND_TAGLINE}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
