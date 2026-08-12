"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@plick/ui/icons";

/**
 * 공용 뒤로가기 버튼 — 상단바 좌측에 놓는 아이콘 링크.
 *
 * 기본은 명시적 목적지로 이동한다(온보딩처럼 동선이 정해진 화면).
 *
 * `behavior="back"`이면 히스토리 back을 먼저 시도한다 (KAN-386) — 기사 세부처럼
 * 홈·기사 목록 어디서든 들어오는 화면은 목적지를 하나로 고정하면 다른 쪽에서 온
 * 사용자가 엉뚱한 화면으로 떨어진다. 딥링크 진입처럼 되돌아갈 히스토리가 없으면
 * `href`로 이동한다. href는 폴백이자 크롤러가 따라갈 내부 링크로 남는다.
 *
 * @param href - 뒤로가기 목적지 (back 모드에서는 히스토리가 없을 때의 폴백)
 * @param behavior - `"push"`(기본): href로 이동. `"back"`: 히스토리 back 우선.
 */
export function BackButton({
  href,
  behavior = "push",
}: {
  href: string;
  behavior?: "push" | "back";
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (behavior !== "back") return;
        e.preventDefault();
        /* 새 탭·딥링크 진입은 히스토리가 이 페이지뿐이라 back이 앱 밖으로
           떨어진다 — 그때만 폴백으로 민다 */
        if (window.history.length > 1) router.back();
        else router.push(href);
      }}
      aria-label="뒤로"
      className="text-icon -ml-1.5 grid size-9 place-items-center active:opacity-60"
    >
      <ArrowLeftIcon size={20} />
    </Link>
  );
}
