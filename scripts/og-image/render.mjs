/**
 * 해축이모 OG 기본 이미지(1200x630) 생성 스크립트 (KAN-567, 전에는 PLick 다크 카드).
 * 라이트 토큰(흰 바탕, 강조색 띠)에 가로형 로고 PNG(KAN-583, apps/web/assets/og의
 * scripts/brand-assets 산출물)를 가운데 앉히고 태그라인을 아래에 둔다. 전에는 글자
 * 워드마크를 Noto Sans KR Black으로 그렸다. 태그라인은 같은 폴더의 Bold로 렌더한다.
 */
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OG_ASSETS = join(HERE, "../../apps/web/assets/og");

const BG = "#ffffff";
const ACCENT = "#0a6b42";
const TEXT_3 = "#5f6368";

const TAGLINE = "해외축구 이적 루머와 이슈 모음";

/* 가로형 로고 581x200을 높이 180으로 — 글자 워드마크 150px과 비슷한 존재감 */
const LOGO_H = 180;
const LOGO_W = Math.round((LOGO_H * 581) / 200);
const LOGO_X = (1200 - LOGO_W) / 2;
const LOGO_Y = 170;
const logoDataUri = `data:image/png;base64,${readFileSync(join(OG_ASSETS, "logo-horizontal.png")).toString("base64")}`;

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect width="16" height="630" fill="${ACCENT}"/>
  <image href="${logoDataUri}" x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_W}" height="${LOGO_H}"/>
  <text x="600" y="440" text-anchor="middle" font-family="Noto Sans KR" font-weight="700" font-size="40" fill="${TEXT_3}">${TAGLINE}</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    fontFiles: [join(OG_ASSETS, "NotoSansKR-Bold.ttf")],
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
