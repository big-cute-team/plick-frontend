/**
 * @file 브라우저 쿠키 읽기. HttpOnly가 아닌 쿠키만 보인다.
 */

/**
 * 이름으로 쿠키 값을 읽는다. 브라우저에서만 부른다(`document`가 서버 렌더에 없다).
 *
 * @param name 쿠키 이름
 * @returns 값. 없으면 null. 값은 브라우저에서 고칠 수 있으니 믿기 전에 호출부가 거른다
 */
export function readCookie(name: string): string | null {
  const hit = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}
