/**
 * 해축이모 로고 산출물 생성 스크립트 (KAN-583).
 *
 * 피그마 "로고" 프레임(Plick 파일 1126:2)의 새 로고는 벡터가 아니라 래스터 이미지
 * 채움이라 SVG로 못 뽑는다. `src/`에 원본 PNG 두 장을 두고(가로형 투명 원본, 앱 아이콘
 * 정사각 원본) 여기서 쓰임새별 크기로 줄여 두 앱에 커밋한다. 원본이 바뀔 때만 다시 돌린다.
 *
 *   logo-horizontal.png  가로형, 높이 200 (화면 최대 사용 67px의 3배)
 *                        → apps/{mobile,web}/public/brand/, apps/web/assets/og/
 *   icon.png             512, 모서리 22% 둥글게 투명 (manifest·파비콘 링크)
 *   apple-icon.png       180, 정사각 (iOS가 마스크를 직접 씌운다)
 *   favicon.ico          32·16 PNG 엔트리, 모서리 둥글게
 *
 * 실행: `npm install` 후 `node build.mjs` (이 폴더는 pnpm 워크스페이스 밖이다)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const HERE = new URL(".", import.meta.url).pathname;
const ROOT = join(HERE, "../..");
const SRC = join(HERE, "src");
const APPS = ["mobile", "web"];

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
  return img.png({ palette: true }).toBuffer();
}

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

const icon512 = await squareIcon(512, { rounded: true });
const apple180 = await squareIcon(180, { rounded: false });
const favicon = ico([
  { size: 32, png: await squareIcon(32, { rounded: true }) },
  { size: 16, png: await squareIcon(16, { rounded: true }) },
]);

for (const app of APPS) {
  const appDir = join(ROOT, "apps", app, "app");
  const brandDir = join(ROOT, "apps", app, "public/brand");
  mkdirSync(brandDir, { recursive: true });
  writeFileSync(join(brandDir, "logo-horizontal.png"), horizontal);
  writeFileSync(join(appDir, "icon.png"), icon512);
  writeFileSync(join(appDir, "apple-icon.png"), apple180);
  writeFileSync(join(appDir, "favicon.ico"), favicon);
}
writeFileSync(join(ROOT, "apps/web/assets/og/logo-horizontal.png"), horizontal);

console.log(
  `done: logo-horizontal ${hw}x${hh}, icon 512, apple-icon 180, favicon 32+16`,
);
