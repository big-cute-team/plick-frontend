import { SiteHeader } from "@/_components/SiteHeader";
import { APP_VERSION_LABEL } from "@/_constants/me";

/**
 * MY 로딩 스켈레톤 (KAN-319) — 프로필 fetch(`GET /users/me`) 동안 로그인 상태의
 * 실제 구성대로 자리를 잡아둔다: 프로필 카드 / 응원팀 카드 / FAQ / 로그아웃 버튼.
 * 타이틀·버전 문구는 정적이라 실물을 그대로 그린다.
 */
export default function MyLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          <h1 className="text-hero text-text tracking-heading font-extrabold">
            MY
          </h1>

          <div className="gap-gap-lg flex animate-pulse flex-col pt-5.5">
            <div className="bg-elevate rounded-card h-21.5" />
            <div className="bg-elevate rounded-card h-27" />
            <div className="bg-elevate rounded-card h-15.5" />
            <div className="bg-elevate rounded-control mt-2 h-12.5" />
            <p className="text-caption text-text-4 text-center">
              {APP_VERSION_LABEL}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
