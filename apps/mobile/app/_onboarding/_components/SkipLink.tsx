import Link from "next/link";

/**
 * 온보딩 건너뛰기 링크. 하단 CTA 버튼 위 "다음에 할게요". 누르면 홈으로 간다.
 * KAN-567 시안 규칙대로 밑줄 없는 회색 텍스트 버튼이다.
 * 가입 시 BE가 자동 닉네임을 부여하므로 온보딩을 건너뛰어도 정상 상태다.
 * 두 단계(닉네임·팀 선택) 공용.
 */
export function SkipLink() {
  return (
    <div className="mb-3.5 text-center">
      <Link href="/" className="text-label-lg text-text-3 active:opacity-60">
        다음에 할게요
      </Link>
    </div>
  );
}
