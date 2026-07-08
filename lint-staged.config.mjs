/**
 * lint-staged 설정 (Turborepo 모노레포용)
 *
 * ESLint v9 flat config는 "실행 위치(cwd)"에서 eslint.config.js를 찾는다.
 * 저장소 루트에는 설정이 없고 각 워크스페이스(apps/*, packages/ui) 안에만 있으므로,
 * 루트에서 eslint를 한 번에 돌리면 설정을 못 찾는다.
 * → 스테이징된 코드 파일이 속한 워크스페이스로 스코프해서 해당 패키지의 lint를 돌린다.
 *
 * 훅은 `--concurrent false`로 실행(.husky/pre-commit) → eslint(읽기 전용)와
 * prettier --write가 같은 파일에 동시 접근하지 않도록 직렬 실행.
 */
export default {
  // 코드 파일: 속한 워크스페이스의 eslint로 검증
  "apps/web/**/*.{ts,tsx,js,mjs,cjs}": () => "pnpm --filter web lint",
  "apps/mobile/**/*.{ts,tsx,js,mjs,cjs}": () => "pnpm --filter mobile lint",
  "packages/ui/**/*.{ts,tsx,js,mjs,cjs}": () => "pnpm --filter @plick/ui lint",
  // 전체 파일: Prettier 포맷 적용
  "**/*.{ts,tsx,js,mjs,cjs,json,css,md}": "prettier --write",
};
