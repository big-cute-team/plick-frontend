/**
 * 해축이모 OG 기본 이미지(1200x630) 생성 스크립트 (KAN-567, 전에는 PLick 다크 카드).
 * 라이트 토큰(흰 바탕, 강조색 띠)과 글자 워드마크로 정적 PNG를 만든다.
 * 글자는 apps/web/assets/og의 Noto Sans KR Black(워드마크)·Bold(태그라인)로 렌더한다.
 */
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OG_ASSETS = join(HERE, "../../apps/web/assets/og");

const BG = "#ffffff";
const ACCENT = "#0a6b42";
const LOGO_TAIL = "#1f1f1f";
const TEXT_3 = "#5f6368";

const TAGLINE = "해외축구 이적 루머와 이슈 모음";

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect width="16" height="630" fill="${ACCENT}"/>
  <text x="600" y="330" text-anchor="middle" font-family="Noto Sans KR" font-weight="900" font-size="150" letter-spacing="-9"><tspan fill="${ACCENT}">해축</tspan><tspan fill="${LOGO_TAIL}">이모</tspan></text>
  <text x="600" y="420" text-anchor="middle" font-family="Noto Sans KR" font-weight="700" font-size="40" fill="${TEXT_3}">${TAGLINE}</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    fontFiles: [
      join(OG_ASSETS, "NotoSansKR-Black.ttf"),
      join(OG_ASSETS, "NotoSansKR-Bold.ttf"),
    ],
    loadSystemFonts: false,
    defaultFontFamily: "Noto Sans KR",
  },
});
const png = resvg.render().asPng();
writeFileSync(join(HERE, "opengraph-image.png"), png);
for (const app of ["mobile", "web"]) {
  writeFileSync(join(HERE, `../../apps/${app}/app/opengraph-image.png`), png);
}
console.log("done: opengraph-image.png → apps/{mobile,web}/app/");
