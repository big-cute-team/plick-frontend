/**
 * @file `packages/*` TS 소스를 빌드 없이 `node --test`로 부르기 위한 로더 등록.
 *
 * Node 22는 `.ts`를 바로 돌리지만, 소스가 번들러 관례대로 확장자 없이 서로를 import(`./analytics`)해서
 * Node 해석기가 못 찾는다. 상대 경로 import가 실패하면 `.ts`를 붙여 한 번 더 찾는 훅만 건다.
 *
 * 플래그는 타입만 걷는 `--experimental-strip-types`가 아니라 `--experimental-transform-types`다
 * (KAN-675). 프록시가 부르는 `ApiError`가 생성자 매개변수 프로퍼티(`public status`)를 써서
 * 걷기만 하는 모드는 문법 오류로 멈춘다.
 *
 * 앱 파일(`apps/<앱>/…`)을 직접 부르는 테스트(KAN-675 게스트 라우트·프록시)를 위해 앱 tsconfig의
 * `@/* → ./app/*` alias도 푼다. 부르는 파일이 어느 앱 아래 있는지로 앱을 정한다. `next`는 exports
 * 맵이 없어 ESM 해석기가 `next/server`를 못 찾으므로 `.js`를 붙여 다시 찾는다.
 */
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/") && context.parentURL) {
    const app = context.parentURL.match(/^(.*\\/apps\\/[^/]+\\/)/);
    if (app) {
      const target = app[1] + "app/" + specifier.slice(2);
      try {
        return await next(target, context);
      } catch {
        return next(target + ".ts", context);
      }
    }
  }
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !/\\.[cm]?[jt]s$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    if (specifier.startsWith("next/") && !specifier.endsWith(".js")) {
      return next(specifier + ".js", context);
    }
    throw error;
  }
}`),
);
