"use client";

import { CheckIcon, CloseIcon } from "@plick/ui/icons";
import type { NicknameCheckResult } from "@/_hooks/useNicknameCheck";

/**
 * 닉네임 중복확인 결과 한 줄 (KAN-319, 모바일 이식) — 사용 가능(초록 체크)·
 * 사용 불가(빨간 X)·조회 실패(빨간 문구). 결과가 없으면(null) 아무것도 그리지 않는다.
 * web에선 아직 프로필 수정만 쓰므로 라우트에 co-locate한다(온보딩이 연결되면 `_components/`로).
 *
 * @param result - `useNicknameCheck`의 결과
 */
export function NicknameCheckNotice({
  result,
}: {
  result: NicknameCheckResult;
}) {
  if (!result) {
    return null;
  }

  if ("error" in result) {
    return (
      <p className="text-label text-danger flex items-center gap-1.5 px-1 font-semibold">
        {result.error}
      </p>
    );
  }

  if (result.available) {
    return (
      <p className="text-label text-accent flex items-center gap-1.5 px-1 font-semibold">
        <CheckIcon size={14} />
        사용할 수 있는 닉네임이에요
      </p>
    );
  }

  return (
    <p className="text-label text-danger flex items-center gap-1.5 px-1 font-semibold">
      <CloseIcon size={14} />
      이미 사용 중이거나 쓸 수 없는 닉네임이에요
    </p>
  );
}
