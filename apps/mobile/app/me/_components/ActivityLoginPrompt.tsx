import Link from "next/link";

/**
 * 비로그인 상태의 활동 목록 자리 (KAN-495, KAN-567 리디자인). 카드 대신 빈
 * 상태와 같은 글줄에 "로그인" 텍스트 버튼만 둔다. 상단 안내(`MeLoginNotice`)가
 * 이미 이유를 말하므로 여기서 되풀이하지 않는다.
 *
 * 서버 렌더(토큰 없음)와 클라 목록의 401 분기가 함께 쓴다.
 */
export function ActivityLoginPrompt() {
  return (
    <p className="text-body text-text-4 py-10 text-center">
      로그인하면 활동이 여기 모여요{" "}
      <Link
        href="/login"
        className="text-accent ml-1 font-bold active:opacity-60"
      >
        로그인
      </Link>
    </p>
  );
}
