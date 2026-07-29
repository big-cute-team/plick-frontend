import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 빌드인가(`next build`·`next start`). dev 서버는 false다.
 *
 * 아래 standalone 설정을 dev에서 켜지 않으려고 가른다 — 이유는 그 주석에 있다.
 * `next build`가 NODE_ENV를 production으로 두고 config를 읽으므로 CI에서 따로
 * 넘겨줄 값은 없다.
 */
const isBuild = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * EC2 배포용 산출물 (KAN-334). 빌드가 실제로 쓰인 파일만 추려 `.next/standalone`에
   * 런타임까지 통째로 담아 준다. 이게 없으면 `.next`만 복사해도 서버가 못 뜬다.
   * `@plick/ui` 같은 workspace 의존성이 pnpm 심볼릭 링크라, 배포 서버에서
   * `pnpm install`을 다시 돌리지 않는 한 모듈을 찾지 못하기 때문이다.
   *
   * `outputFileTracingRoot`는 그 추적의 시작점이다. 모노레포에서 이걸 앱 폴더로
   * 두면 `packages/*`가 추적 범위 밖이라 빠진다. 리포 루트로 올려야 workspace
   * 패키지까지 따라 들어온다.
   *
   * 빌드일 때만 넣는 이유: `outputFileTracingRoot`는 이름과 달리 빌드 전용이
   * 아니다. dev 서버도 이 값을 Turbopack 프로젝트 루트로 쓴다
   * (`setup-dev-bundler.js`: `turbopack.root || outputFileTracingRoot || dir`).
   * 그러면 감시 범위가 앱 폴더에서 리포 전체로 넓어져 `node_modules`와 양쪽
   * `.next`(수 GB)까지 들어오고, 자기 dev 캐시 쓰기가 다시 watch 이벤트로
   * 돌아오는 되먹임이 생겨 dev가 느려진다. `turbopack.root`를 앱 폴더로 좁히는
   * 반대 방향은 그 아래만 resolve되는 제약이라 `packages/*`를 끊는다 (KAN-330).
   *
   * 주의: standalone에는 `public/`과 `.next/static/`이 들어가지 않는다. CDN에
   * 따로 올리는 걸 전제한 설계라, 한 서버에서 다 서빙하려면 배포 때 손으로
   * 복사해야 한다. 빠뜨리면 CSS와 이미지가 전부 404로 뜬다.
   */
  ...(isBuild && {
    output: "standalone",
    outputFileTracingRoot: path.join(appDir, "../../"),
  }),

  /**
   * same-origin BE 프록시 (KAN-271, web은 KAN-318). 브라우저가 `localhost:8080`을
   * 직접 때리면 cross-origin이라 CORS에 막힌다. BE에 CORS를 여는 대신 Next가
   * `/be/*`를 그대로 넘겨주게 해서 브라우저는 상대경로만 부르게 한다.
   * 서버 컴포넌트 fetch는 서버→서버라 이 경로를 타지 않고 절대 URL을 그대로 쓴다.
   *
   * 이 값은 서버가 뜰 때가 아니라 `next build` 때 한 번 평가돼 `routes-manifest.json`에
   * 문자열로 굳는다. 배포 서버의 `.env`에 넣어봐야 프록시 대상은 안 바뀐다는 뜻이라,
   * 빌드하는 쪽(CI)에서 넘겨야 한다.
   *
   * `??`가 아니라 `||`인 이유: GitHub Actions는 없는 시크릿을 undefined가 아니라
   * 빈 문자열로 넘긴다. `??`면 빈 문자열이 그대로 통과해 destination이 `/:path*`가
   * 되고, `/be/*`가 자기 자신으로 되도는 리라이트가 만들어진다.
   */
  async rewrites() {
    const base = process.env.API_BASE_URL || "http://localhost:8080";
    return [{ source: "/be/:path*", destination: `${base}/:path*` }];
  },
};

export default nextConfig;
