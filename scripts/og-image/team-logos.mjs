/**
 * 팀 로고 webp → 동적 OG용 PNG 변환 스크립트 (KAN-351).
 *
 * `next/og`의 satori가 webp를 못 읽어서 `apps/web/public/teams/*.webp`를
 * 512x512 투명 캔버스에 contain으로 앉힌 PNG로 변환해
 * `apps/web/assets/og/teams/{code}.png`로 커밋한다. 크기를 통일해 두면
 * OG 템플릿이 로고별 비율을 몰라도 된다. 로고 원본이 바뀔 때만 다시 돌린다.
 */
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";

const SRC = new URL("../../apps/web/public/teams", import.meta.url).pathname;
const OUT = new URL("../../apps/web/assets/og/teams", import.meta.url).pathname;
const SIZE = 512;

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".webp"))) {
  const code = basename(file, ".webp");
  await sharp(join(SRC, file))
    .resize(SIZE, SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    // 팔레트 양자화 — OG 렌더에 화질 차이 없이 용량을 1/4로 줄인다
    .png({ palette: true })
    .toFile(join(OUT, `${code}.png`));
  console.log(`done: ${code}.png`);
}
