/**
 * 해축이모 로고 산출물 생성 스크립트 (KAN-583).
 *
 * 피그마 "로고" 프레임(Plick 파일 1126:2)의 새 로고는 벡터가 아니라 래스터 이미지
 * 채움이라 SVG로 못 뽑는다. `src/`에 원본 PNG 두 장을 두고(가로형 투명 원본, 앱 아이콘
 * 정사각 원본) 여기서 쓰임새별 크기로 줄여 두 앱에 커밋한다. 원본이 바뀔 때만 다시 돌린다.
 *
 *   logo-horizontal.png  가로형, 높이 200 → apps/web/assets/og/ (OG 이미지용)
 *   logo-horizontal-{100,134,201}.webp
 *                        화면용 webp 세 단계 (KAN-624) → packages/ui/src/assets/brand/.
 *                        `Logo.tsx`가 import해서 Next가 `/_next/static/media/<해시>.webp`로
 *                        묶는다(S3+CloudFront 1년 immutable). public/에 두면 해시가 없어
 *                        CDN을 못 타고 max-age=0이라 페이지마다 다시 요청했다.
 *                        100은 디자이너가 피그마에서 내보낸
 *                        `src/logo-horizontal-100.webp`(284×100, 7.9KB)를 그대로 복사한다.
 *                        같은 크기를 여기서 만들면 10.8KB라 그쪽이 작다. 134·201은 원본 PNG에서
 *                        만든다(로그인 67×2, 67×3). `Logo.tsx`가 srcset으로 고른다.
 *                        PNG 200은 OG 이미지(scripts/og-image)용으로 남긴다
 *   icon.png             512, 모서리 22% 둥글게 투명 (manifest·파비콘 링크).
 *                        팔레트 품질 65 (KAN-624, 152KB → 38KB). 아이콘은 전 화면이
 *                        `<link rel="icon">`으로 받는다
 *   apple-icon.png       180, 정사각 (iOS가 마스크를 직접 씌운다)
 *   favicon.ico          32·16 PNG 엔트리, 모서리 둥글게
 *   teams/{code}.webp    팀 크레스트 132px, teams/{code}-290.webp 290px (KAN-624)
 *                        → packages/ui/src/assets/teams/. `TeamCrest.tsx`가 import한다.
 *                        `src/teams/{code}.svg`(구단 공식 벡터)에서 만든다. 132는 40px 자리
 *                        (×1.1 배율 ×DPR 3), 290은 팀 프로필 머리 88px 자리다. `TeamCrest`가
 *                        srcset으로 고른다. 전에는 160px 한 장이었다
 *
 * 실행: `npm install` 후 `node build.mjs` (이 폴더는 pnpm 워크스페이스 밖이다)
 */
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const HERE = new URL(".", import.meta.url).pathname;
const ROOT = join(HERE, "../..");
const SRC = join(HERE, "src");
const APPS = ["mobile", "web"];
const UI_ASSETS = join(ROOT, "packages/ui/src/assets");

/** 모서리 반지름은 한 변의 22% (피그마 "앱 아이콘" 규칙) */
const roundedMask = (size) =>
  Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#fff"/></svg>`,
  );

async function squareIcon(size, { rounded }) {
  let img = sharp(join(SRC, "app-icon.png")).resize(size, size);
  if (rounded) {
    img = img.composite([{ input: roundedMask(size), blend: "dest-in" }]);
  }
  return img
    .png({ palette: true, quality: 65, effort: 10, compressionLevel: 9 })
    .toBuffer();
}

/** 크레스트 webp 한 변. 40×1.1×3과 88×1.1×3 */
const CREST_SIZES = [132, 290];

/** 크레스트 SVG → 정사각 투명 캔버스에 contain으로 앉힌 webp */
async function crest(code, size) {
  return sharp(join(SRC, "teams", `${code}.svg`), { density: 300 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 85 })
    .toBuffer();
}

/** 원본 PNG에서 만드는 webp 높이. 67×2, 67×3. 100은 디자이너 파일을 복사한다 */
const LOGO_WEBP_HEIGHTS = [134, 201];

/** PNG 엔트리를 담는 ICO 컨테이너 — 모든 현행 브라우저가 읽는다 */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = [];
  const blobs = [];
  let offset = 6 + 16 * entries.length;
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    dir.push(e);
    blobs.push(png);
  }
  return Buffer.concat([header, ...dir, ...blobs]);
}

const horizontal = await sharp(join(SRC, "logo-horizontal.png"))
  .trim({ threshold: 8 })
  .resize({ height: 200 })
  .png({ palette: true })
  .toBuffer();
const { width: hw, height: hh } = await sharp(horizontal).metadata();
const webps = await Promise.all(
  LOGO_WEBP_HEIGHTS.map(async (height) => {
    const buffer = await sharp(join(SRC, "logo-horizontal.png"))
      .trim({ threshold: 8 })
      .resize({ height })
      .webp({ quality: 85 })
      .toBuffer();
    const { width } = await sharp(buffer).metadata();
    return { height, width, buffer };
  }),
);

const icon512 = await squareIcon(512, { rounded: true });
const apple180 = await squareIcon(180, { rounded: false });
const favicon = ico([
  { size: 32, png: await squareIcon(32, { rounded: true }) },
  { size: 16, png: await squareIcon(16, { rounded: true }) },
]);

const crestCodes = readdirSync(join(SRC, "teams"))
  .filter((f) => f.endsWith(".svg"))
  .map((f) => f.replace(/\.svg$/, ""));
const crests = await Promise.all(
  crestCodes.map(async (code) => ({
    code,
    files: await Promise.all(
      CREST_SIZES.map(async (size) => ({
        size,
        buffer: await crest(code, size),
      })),
    ),
  })),
);

for (const app of APPS) {
  const appDir = join(ROOT, "apps", app, "app");
  writeFileSync(join(appDir, "icon.png"), icon512);
  writeFileSync(join(appDir, "apple-icon.png"), apple180);
  writeFileSync(join(appDir, "favicon.ico"), favicon);
}
writeFileSync(join(ROOT, "apps/web/assets/og/logo-horizontal.png"), horizontal);

const brandDir = join(UI_ASSETS, "brand");
const teamsDir = join(UI_ASSETS, "teams");
mkdirSync(brandDir, { recursive: true });
mkdirSync(teamsDir, { recursive: true });
copyFileSync(
  join(SRC, "logo-horizontal-100.webp"),
  join(brandDir, "logo-horizontal-100.webp"),
);
for (const { height, buffer } of webps) {
  writeFileSync(join(brandDir, `logo-horizontal-${height}.webp`), buffer);
}
for (const { code, files } of crests) {
  for (const { size, buffer } of files) {
    const name =
      size === CREST_SIZES[0] ? `${code}.webp` : `${code}-${size}.webp`;
    writeFileSync(join(teamsDir, name), buffer);
  }
}

console.log(
  `done: logo-horizontal ${hw}x${hh}, webp 284x100(copy) ${webps.map((w) => `${w.width}x${w.height}`).join(" ")}, icon 512 (${icon512.length}B), apple-icon 180, favicon 32+16, crests ${crestCodes.join(" ")} ${CREST_SIZES.join("/")}`,
);
