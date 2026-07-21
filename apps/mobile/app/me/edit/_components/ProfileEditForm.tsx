"use client";

import { useState, useTransition } from "react";
import type { TeamCode } from "@plick/domain/types";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { updateMyProfile } from "@/_lib/api/users";
import { ErrorDialog } from "./ErrorDialog";
import { NicknameEditField } from "./NicknameEditField";
import { TeamPicker } from "./TeamPicker";

/**
 * 프로필 수정 폼 — 닉네임 입력과 응원팀 선택 상태를 들고, "변경사항 저장"에서
 * 프로필 저장 서버 액션(KAN-268·KAN-269)을 부른다. 성공하면 액션이 MY로 보낸다.
 * 닉네임 입력이 비어 있으면 기존 닉네임을 그대로 실어 보낸다 — BE가 같은 값은
 * 변경으로 치지 않아 7일 제한에 안 걸린다.
 * 저장 거절(중복·변경 제한 등)은 중앙 팝업(`ErrorDialog`)으로 보여준다.
 * 프래그먼트로 렌더해 페이지 세로 스택(gap)의 직접 자식 배치를 유지한다.
 *
 * @param currentNickname - `GET /users/me`로 받은 현재 닉네임 (입력이 빌 때의 대체값)
 * @param nicknameChangeableAt - 닉네임을 다시 바꿀 수 있는 시각 — null이면 지금 가능
 * @param initialTeams - `GET /users/me`로 받은 현재 응원팀 목록
 */
export function ProfileEditForm({
  currentNickname,
  nicknameChangeableAt,
  initialTeams,
}: {
  currentNickname: string | null;
  nicknameChangeableAt: string | null;
  initialTeams: TeamCode[];
}) {
  const [nickname, setNickname] = useState("");
  const [teams, setTeams] = useState<TeamCode[]>(initialTeams);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (code: TeamCode) => {
    setTeams((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      // 입력이 비었으면 기존 닉네임으로 채워 보낸다(사용자 확정 규칙). 둘 다 없으면 항목 생략.
      const result = await updateMyProfile(
        nickname.trim() || currentNickname,
        teams,
      );
      if (result?.error) setError(result.error);
    });
  };

  return (
    <>
      <NicknameEditField
        value={nickname}
        onChange={setNickname}
        changeableAt={nicknameChangeableAt}
      />

      <TeamPicker selected={teams} onToggle={toggle} />

      <PrimaryButton onClick={submit} disabled={pending}>
        {pending ? "저장 중…" : "변경사항 저장"}
      </PrimaryButton>

      {error && <ErrorDialog message={error} onClose={() => setError(null)} />}
    </>
  );
}
