import Link from "next/link";
import { Logo } from "@plick/ui/Logo";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";
import { PageContainer } from "./PageContainer";
import { ProfileMenu } from "./ProfileMenu";

/**
 * 데스크톱 상단 GNB — 로고 + 내비게이션 + 프로필 메뉴.
 *
 * 검색 인풋과 알림 아이콘은 대응 기능이 없어 걷어냈다(KAN-338). 프로필은
 * 로그인·마이페이지·로그아웃 진입점을 담은 드롭다운(`ProfileMenu`)으로
 * 되살렸다. 테마 토글도 걷어냈다 — 웹·모바일 모두 다크 고정으로 돌렸다.
 * 라이트 토큰은 `theme.css`에 그대로 남아 있다.
 */
export function SiteHeader() {
  return (
    <header className="bg-nav border-border sticky top-0 z-40 border-b">
      <PageContainer className="flex h-16 items-center gap-4 lg:gap-7">
        <Link
          href="/"
          aria-label="PLick 홈"
          className="focus-visible:outline-accent shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Logo height={20} />
        </Link>

        <NavLinks className="hidden lg:flex" />

        {/* 모바일: 내비를 숨기고 이 스페이서로 우측 클러스터를 민다 */}
        <div aria-hidden className="flex-1" />

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <ProfileMenu />
          <MobileNav className="lg:hidden" />
        </div>
      </PageContainer>
    </header>
  );
}
