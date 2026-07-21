"use client";

import { useState, useTransition } from "react";
import type { TeamCode } from "@plick/domain/types";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { updateMyTeams } from "@/_lib/api/users";
import { TeamPicker } from "./TeamPicker";

/**
 * 프로필 수정 폼 — 응원팀 선택 상태를 들고, "변경사항 저장"에서
 * 응원팀 저장 서버 액션(KAN-268)을 부른다. 성공하면 액션이 MY로 보낸다.
 * 프래그먼트로 렌더해 페이지 세로 스택(gap)의 직접 자식 배치를 유지한다.
 *
 * @param initialTeams - `GET /users/me`로 받은 현재 응원팀 목록
 */
export function ProfileEditForm({
  initialTeams,
}: {
  initialTeams: TeamCode[];
}) {
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
      const result = await updateMyTeams(teams);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <>
      <TeamPicker selected={teams} onToggle={toggle} />

      <div>
        {error && (
          <p
            className="text-caption text-danger mb-2.5 text-center"
            role="alert"
          >
            {error}
          </p>
        )}
        <PrimaryButton onClick={submit} disabled={pending}>
          {pending ? "저장 중…" : "변경사항 저장"}
        </PrimaryButton>
      </div>
    </>
  );
}
