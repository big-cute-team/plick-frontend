import Link from "next/link";
import { UserRoundIcon } from "@plick/ui/icons";
import { ACTIVITY_LOGIN_COPY } from "@/_constants/activity";

/**
 * 비로그인 상태의 활동 화면 (KAN-495). 목록 대신 로그인을 권하는 카드를 그린다.
 *
 * 티켓은 "게스트에게 소셜 연동 유도"인데 자동 게스트 계정(회의록 BE-11·FE-17)은
 * 아직 없다. 지금의 비로그인은 토큰이 없는 상태뿐이라 로그인 화면으로 보내는
 * 걸로 대신하고, 게스트 계정이 생기면 이 카드의 문구와 목적지를 소셜 연동으로
 * 바꾼다. 카드 섀시는 마이페이지 `LoginPromptCard`와 같다.
 *
 * 서버 렌더(토큰 없음)와 클라 목록의 401 분기가 함께 쓴다.
 */
export function ActivityLoginPrompt() {
  return (
    <section className="bg-elevate-2 border-border rounded-card flex flex-col items-center border px-5 py-8 text-center">
      <span className="bg-avatar text-icon rounded-pill grid size-13 place-items-center">
        <UserRoundIcon size={26} />
      </span>
      <p className="text-body-lg text-text mt-4 font-extrabold tracking-tight">
        {ACTIVITY_LOGIN_COPY.title}
      </p>
      <p className="text-label text-text-3 mt-1.5">
        {ACTIVITY_LOGIN_COPY.description}
      </p>
      <Link
        href="/login"
        className="bg-accent text-on-accent rounded-control text-body mt-5 block w-full py-3 font-extrabold active:opacity-60"
      >
        로그인 하러 가기
      </Link>
    </section>
  );
}
