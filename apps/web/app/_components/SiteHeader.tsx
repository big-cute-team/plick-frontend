import Link from "next/link";
import { BRAND_TAGLINE } from "@plick/domain/brand";
import { Logo } from "@plick/ui/Logo";
import { NavLinks } from "./NavLinks";
import { ProfileMenu } from "./ProfileMenu";

/**
 * 데스크톱 상단 바 2줄 (KAN-567, 시안 "상단 바"). 첫 줄은 로고와 태그라인, 오른쪽에
 * 로그인·가입(로그인 상태면 닉네임·MY·로그아웃) 텍스트 링크. 둘째 줄은 탭
 * 다섯 개(홈, 릴스, LIVE, 투표, MY)다. 전에는 로고 + 알약 GNB + 아바타 드롭다운 한
 * 줄이었고(KAN-338), 좁은 폭에서는 햄버거(`MobileNav`)로 접었다. 시안은 텍스트만
 * 있는 두 줄이라 햄버거를 없애고 둘째 줄 탭을 가로 스크롤로 뒀다 — 330px에서도
 * 탭이 잘리지 않고 넘어간다.
 *
 * 시안의 "접속 N명"과 "오늘 발행 N건 댓글 N개"는 BE에 집계가 없어 뺐다(API 공백).
 *
 * sticky다. 아래 sticky 요소(팀 탭·표 머리, 우측 레일)의 `top`은 이 바의 높이
 * (58 + 38 + 선 2 = 98px)와 짝이다 — 줄 높이를 바꾸면 globals.css의 `--site-header-h`를
 * 같이 고친다.
 */
export function SiteHeader() {
  return (
    <header className="bg-nav border-border sticky top-0 z-40 border-b">
      <div className="max-w-page px-gutter mx-auto flex h-14.5 w-full items-center gap-4">
        <Link
          href="/"
          aria-label="해축이모 홈"
          className="focus-visible:outline-accent shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Logo size={23} />
        </Link>
        <span className="text-caption-lg text-text-3 hidden tracking-tight sm:inline">
          {BRAND_TAGLINE}
        </span>

        <div aria-hidden className="flex-1" />

        <ProfileMenu />
      </div>
      <div className="border-border-soft border-t">
        <NavLinks className="max-w-page px-gutter mx-auto w-full" />
      </div>
    </header>
  );
}
