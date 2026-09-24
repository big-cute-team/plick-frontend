import type { ReactNode } from "react";
import { PageContainer } from "@/_components/PageContainer";
import { SiteHeader } from "@/_components/SiteHeader";
import { MeNav } from "./MeNav";
import { SiteFooter } from "@/_components/SiteFooter";

/**
 * MY 세 화면(내 활동, 계정, 차단 목록)의 공통 뼈대 (KAN-567 시안 MY 577행).
 * GNB 아래 `172px minmax(0,1fr)` 그리드에 좌측 메뉴와 본문을 둔다. 좁은 폭에선
 * 메뉴가 위로 올라가 한 열로 쌓인다.
 *
 * @param nav 좌측 메뉴를 그릴지. 비로그인, 게스트 화면은 메뉴 없이 본문만 둔다
 * @param children 우측 본문
 */
export function MeShell({
  nav = true,
  children,
}: {
  nav?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main>
        <PageContainer
          className={`pt-6.5 pb-12 ${
            nav
              ? "grid grid-cols-1 gap-8 lg:grid-cols-[172px_minmax(0,1fr)] lg:gap-12"
              : ""
          }`}
        >
          {nav && <MeNav />}
          <div className="min-w-0">{children}</div>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
