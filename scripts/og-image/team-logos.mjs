/**
 * 팀 로고 webp → 동적 OG용 PNG 변환 스크립트 (KAN-351).
 *
 * `next/og`의 satori가 webp를 못 읽어서 팀 크레스트를 512x512 투명 캔버스에
 * contain으로 앉힌 PNG로 변환해 `apps/web/assets/og/teams/{code}.png`로 커밋한다.
 * 크기를 통일해 두면 OG 템플릿이 로고별 비율을 몰라도 된다. 로고 원본이 바뀔 때만
 * 다시 돌린다.
 *
 * 원본은 `scripts/brand-assets/src/teams/{code}.svg`(구단 공식 벡터)다 (KAN-624).
 * 전에는 `apps/web/public/teams/*.webp`(160px)를 512로 키워 썼는데, 화면용 webp가
 * 132px로 줄면서 그걸 키우면 흐려져 벡터에서 바로 만든다.
 */
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";

const SRC = new URL("../brand-assets/src/teams", import.meta.url).pathname;
const OUT = new URL("../../apps/web/assets/og/teams", import.meta.url).pathname;
const SIZE = 512;

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".svg"))) {
  const code = basename(file, ".svg");
  await sharp(join(SRC, file), { density: 300 })
    .resize(SIZE, SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    // 팔레트 양자화 — OG 렌더에 화질 차이 없이 용량을 1/4로 줄인다
    .png({ palette: true })
    .toFile(join(OUT, `${code}.png`));
  console.log(`done: ${code}.png`);
}
