import { UserRoundIcon } from "@plick/ui/icons";

/**
 * 프로필 수정 아바타 — 큰 원형 아바타.
 * 웹·모바일 프로필 수정 화면 공용 (`@plick/ui`). 토큰 유틸만 써 양쪽에서 그대로 동작한다.
 *
 * 사진 업로드 진입(카메라 배지)은 업로드 기능이 생길 때 다시 붙인다.
 */
export function AvatarField() {
  return (
    <div className="flex justify-center pt-2 pb-0.5">
      <span className="bg-avatar text-icon grid size-21 place-items-center rounded-full">
        <UserRoundIcon size={40} />
      </span>
    </div>
  );
}
