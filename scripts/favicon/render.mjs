/**
 * PLick 파비콘 세트 생성 스크립트 (KAN-346).
 * 피그마에서 내보낸 logo.svg(520x520, 다크 원형 배경)를 원본으로
 * 두 앱의 icon.png(512), apple-icon.png(180), favicon.ico(16+32)를 만든다.
 *
 * icon.png는 원형 그대로(모서리 투명), apple-icon.png는 iOS가 투명을
 * 지원하지 않아 다크 토큰 배경(#0b0d12)을 정사각으로 깔아 합성한다.
 * favicon.ico는 16·32 BMP(BGRA) 엔트리를 직접 조립한다. PNG 엔트리는
 * 구형 파서 호환이 갈려서 전통적인 BMP 포맷으로 넣는다.
 */
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APPS = [
  join(HERE, "../../apps/mobile/app"),
  join(HERE, "../../apps/web/app"),
];
const BG = "#0b0d12";

const logoSvg = readFileSync(join(HERE, "logo.svg"), "utf8");

/** 정사각 배경을 깐 apple-icon용 SVG — 원본을 그대로 품고 뒤에 rect만 깐다. */
const appleSvg = logoSvg.replace(
  /(<svg[^>]*>)/,
  `$1<rect width="520" height="520" fill="${BG}"/>`,
);

/**
 * SVG를 지정 폭으로 래스터해 { png, pixels(RGBA), width, height }를 돌려준다.
 * @param svg - SVG 문자열
 * @param width - 출력 폭(px)
 */
function raster(svg, width) {
  const rendered = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
  }).render();
  return {
    png: rendered.asPng(),
    pixels: rendered.pixels,
    width: rendered.width,
    height: rendered.height,
  };
}

/**
 * RGBA 픽셀 버퍼를 ICO의 BMP(DIB) 엔트리로 변환한다.
 * BMP는 상하 반전 저장에 BGRA 순서이고, 높이는 AND 마스크 몫까지 두 배로 적는다.
 * @param pixels - RGBA 버퍼
 * @param size - 정사각 한 변(px)
 */
function toDib(pixels, size) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  const bgra = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = ((size - 1 - y) * size + x) * 4;
      bgra[dst] = pixels[src + 2];
      bgra[dst + 1] = pixels[src + 1];
      bgra[dst + 2] = pixels[src];
      bgra[dst + 3] = pixels[src + 3];
    }
  }
  /* 32bpp는 알파를 쓰지만 AND 마스크 자리는 규격상 채워 둔다(전부 0 = 불투명 판정 무시) */
  const andMask = Buffer.alloc(((size + 31) >> 5) * 4 * size);
  return Buffer.concat([header, bgra, andMask]);
}

/**
 * 크기 배열로 멀티사이즈 ICO 파일 버퍼를 조립한다.
 * @param entries - { size, dib } 배열
 */
function toIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const dirs = [];
  let offset = 6 + 16 * count;
  for (const { size, dib } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size === 256 ? 0 : size, 0);
    dir.writeUInt8(size === 256 ? 0 : size, 1);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(dib.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += dib.length;
    dirs.push(dir);
  }
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.dib)]);
}

const icon = raster(logoSvg, 512);
const apple = raster(appleSvg, 180);
const ico = toIco(
  [32, 16].map((size) => ({
    size,
    dib: toDib(raster(logoSvg, size).pixels, size),
  })),
);

for (const dir of APPS) {
  writeFileSync(join(dir, "icon.png"), icon.png);
  writeFileSync(join(dir, "apple-icon.png"), apple.png);
  writeFileSync(join(dir, "favicon.ico"), ico);
  console.log(`done: ${dir}`);
}
