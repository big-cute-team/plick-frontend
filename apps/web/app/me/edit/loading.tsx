import Link from "next/link";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { SiteHeader } from "@/_components/SiteHeader";

/**
 * 프로필 수정 로딩 스켈레톤 (KAN-319) — 초깃값 fetch(`GET /users/me`) 동안
 * 아바타 / 이메일 카드 / 닉네임 입력 / 팀 그리드 자리를 잡아둔다.
 * 뒤로 링크·타이틀은 정적이라 실물을 그대로 그린다.
 */
export default function ProfileEditLoading() {
  return (
    <>
      <SiteHeader />
      <main>
        <div className="max-w-narrow mx-auto w-full px-6 pt-9 pb-22">
          <Link
            href="/me"
            className="text-label text-text-3 hover:text-text focus-visible:ring-accent inline-flex items-center gap-1 rounded-sm font-semibold focus-visible:ring-2 focus-visible:outline-none active:opacity-60"
          >
            <ChevronMiniIcon className="rotate-180" />
            MY
          </Link>
          <h1 className="text-hero text-text tracking-heading pt-3 font-bold">
            프로필 수정
          </h1>

          <div className="gap-gap-lg flex animate-pulse flex-col pt-5.5">
            <div className="bg-elevate rounded-pill mx-auto size-24" />
            <div className="bg-elevate rounded-card h-13" />
            <div className="bg-elevate rounded-card h-27" />
            <div className="gap-gap grid grid-cols-3">
              <div className="bg-elevate rounded-card min-h-29.5" />
              <div className="bg-elevate rounded-card min-h-29.5" />
              <div className="bg-elevate rounded-card min-h-29.5" />
              <div className="bg-elevate rounded-card min-h-29.5" />
              <div className="bg-elevate rounded-card min-h-29.5" />
              <div className="bg-elevate rounded-card min-h-29.5" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
