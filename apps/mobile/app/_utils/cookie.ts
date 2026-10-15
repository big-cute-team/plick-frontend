/**
 * @file 브라우저 쿠키 읽기. HttpOnly가 아닌 쿠키만 보인다.
 */

/**
 * 이름으로 쿠키 값을 읽는다. 브라우저에서만 부른다(`document`가 서버 렌더에 없다).
 *
 * 값은 디코드해 돌려준다. Next의 `cookies().set`과 `response.cookies.set`은 값을
 * `encodeURIComponent`로 적어서, 게스트 마감 시각(`2026-10-29T14:16:54+09:00`)처럼 `:`·`+`가
 * 든 값은 그대로 읽으면 `%3A`·`%2B`가 섞인다 (KAN-632). 디코드가 안 되는 값은 원문을 돌려준다.
 *
 * @param name 쿠키 이름
 * @returns 값. 없으면 null. 값은 브라우저에서 고칠 수 있으니 믿기 전에 호출부가 거른다
 */
export function readCookie(name: string): string | null {
  const hit = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  if (!hit) return null;
  const raw = hit.slice(name.length + 1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
