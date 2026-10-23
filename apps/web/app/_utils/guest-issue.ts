/**
 * @file 게스트를 발급하지 않을 화면 판정 (KAN-514). KAN-667(모바일 KAN-665)에서 발급이 프록시에서
 * 브라우저로 옮겨 오면서 프록시의 `skipsGuestIssue`를 여기로 뺐다.
 */

/**
 * 게스트를 발급할 자리가 아닌 경로.
 *
 * `/oauth`는 콜백이 직접 새 토큰 쿠키를 심는 구간이다. `/login`·`/signup`을 빼는 이유는 따로다.
 * 이 화면에 토큰 없이 닿는 사람은 주소로 로그인하러 직접 들어온 기존 소셜 사용자다. 여기서 게스트를
 * 쥐어 주면 소셜 버튼이 연동(`/auth/link`) 갈래로 가고, 기록이 빈 새 게스트를 옛 계정에 붙이려다
 * `EXISTING_ACCOUNT`로 떨어져 "이미 가입된 계정이라 활동이 이어지지 않아요"라는 엉뚱한 안내를
 * 보게 된다. 앱 안에서 넘어온 게스트는 이미 토큰이 있어 이 판정에 닿지 않는다.
 *
 * @param pathname 지금 화면 경로
 */
export function skipsGuestIssue(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/oauth")
  );
}
