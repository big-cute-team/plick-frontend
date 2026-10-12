import { ACTIVITY_TABS } from "@/_constants/me";
import { MeShell } from "@/me/_components/MeShell";
import { MyCommentRowSkeleton } from "@/me/_components/MyCommentRowSkeleton";

/** 활동 목록 자리에 깔 줄 수. `MyCommentsList`의 첫 로딩과 같다. */
const SKELETON_ROWS = 3;

/**
 * MY의 로딩 자리 (KAN-602). 프로필(`GET /users/me`)과 활동 첫 페이지를 기다리는
 * 동안 좌측 메뉴(실물), 닉네임 줄 뼈대, 활동 탭 라벨, 목록 뼈대를 먼저 그린다.
 * 로그인 여부를 아직 몰라 가장 흔한 로그인 화면 모양을 잡는다.
 *
 * 라우트 그룹 `(main)` 안에 둬 계정·차단 목록까지 이 뼈대로 덮지 않는다.
 */
export default function MyLoading() {
  return (
    <MeShell>
      <div aria-hidden className="animate-pulse pb-5.5">
        <div className="bg-chip h-7 w-36" />
      </div>
      <div
        aria-hidden
        className="border-border flex items-center gap-4.5 border-b"
      >
        {ACTIVITY_TABS.map(({ key, label }) => (
          <span
            key={key}
            className="text-body text-text-3 -mb-px border-b-2 border-transparent pb-2.25 font-medium"
          >
            {label}
          </span>
        ))}
      </div>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <MyCommentRowSkeleton key={i} />
      ))}
    </MeShell>
  );
}
