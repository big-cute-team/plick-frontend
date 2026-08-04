/**
 * @file 동적 OG 렌더 자산 로더 (KAN-351) — Pretendard 폰트와 팀 로고 PNG.
 *
 * 자산은 `apps/web/assets/og/`에 커밋돼 있다. satori(next/og)는 CSS로 폰트를
 * 못 받고 바이트를 직접 요구하며, webp도 못 읽어 로고는 PNG 사본을 쓴다
 * (`scripts/og-image/team-logos.mjs`로 생성).
 *
 * `process.cwd()` 기준 리터럴 경로로 읽는 이유: Next의 파일 추적(nft)이 이
 * 패턴을 정적 분석해 standalone 산출물에 자산을 포함시킨다. `public/`과 달리
 * 배포 워크플로의 수동 복사 스텝(ADR 0059)에 기대지 않는다.
 *
 * 모듈 캐시는 프로세스 생존 동안 유지된다 — OG 요청마다 디스크를 다시 읽지
 * 않게 하는 것뿐이고, 자산은 배포 단위로만 바뀌므로 무효화가 필요 없다.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TeamCode } from "@plick/domain/types";

let fontCache: Buffer | null = null;

/** OG 텍스트 렌더용 Pretendard SemiBold 바이트를 읽는다. */
export async function loadOgFont(): Promise<Buffer> {
  fontCache ??= await readFile(
    join(process.cwd(), "assets/og/Pretendard-SemiBold.otf"),
  );
  return fontCache;
}

const logoCache = new Map<TeamCode, string>();

/**
 * 팀 로고 PNG를 satori가 그릴 수 있는 data URI로 읽는다.
 *
 * 절대 URL 대신 data URI인 이유: OG 렌더 중 자기 서버로 HTTP를 되돌리면
 * 요청 한 번이 두 번이 되고, 빌드 시점 프리렌더에서는 서버가 아예 없다.
 */
export async function loadTeamLogo(code: TeamCode): Promise<string> {
  const cached = logoCache.get(code);
  if (cached) return cached;

  const png = await readFile(
    join(process.cwd(), "assets/og/teams", `${code.toLowerCase()}.png`),
  );
  const dataUri = `data:image/png;base64,${png.toString("base64")}`;
  logoCache.set(code, dataUri);
  return dataUri;
}
