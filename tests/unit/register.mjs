/**
 * @file `packages/*` TS 소스를 빌드 없이 `node --test`로 부르기 위한 로더 등록.
 *
 * Node 22는 타입 표기를 걷어 `.ts`를 바로 돌리지만(`--experimental-strip-types`), 소스가 번들러
 * 관례대로 확장자 없이 서로를 import(`./analytics`)해서 Node 해석기가 못 찾는다. 상대 경로 import가
 * 실패하면 `.ts`를 붙여 한 번 더 찾는 훅만 건다.
 */
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !/\\.[cm]?[jt]s$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    throw error;
  }
}`),
);
