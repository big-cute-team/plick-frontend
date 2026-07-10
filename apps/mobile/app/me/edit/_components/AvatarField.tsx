import { CameraIcon, UserRoundIcon } from "@/_components/icons";

/**
 * 프로필 수정 아바타 — 큰 원형 아바타 + 우하단 카메라 배지(사진 변경 진입).
 *
 * 사진 업로드는 추후 연결(퍼블리싱 단계라 배지는 표시만).
 */
export function AvatarField() {
  return (
    <div className="flex justify-center pt-2 pb-0.5">
      <div className="relative size-21">
        <span className="bg-avatar text-icon grid size-full place-items-center rounded-full">
          <UserRoundIcon size={40} />
        </span>
        <span className="bg-accent text-on-accent border-bg absolute right-0 bottom-0 grid size-8.5 place-items-center rounded-full border-3">
          <CameraIcon size={14} />
        </span>
      </div>
    </div>
  );
}
