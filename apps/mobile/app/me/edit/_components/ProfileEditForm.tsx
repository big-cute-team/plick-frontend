"use client";

import { useState, useTransition } from "react";
import { TEAMS } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { ErrorDialog } from "@/_components/ErrorDialog";
import { updateMyProfile } from "@/_services/users";
import { NicknameEditField } from "./NicknameEditField";
import { TeamPicker } from "./TeamPicker";

/**
 * 계정 폼 (KAN-567 리디자인). 닉네임·이메일·응원팀 행을 쌓고, 닉네임과 응원팀 행의
 * "수정"을 누르면 그 행 아래에 편집기가 펼쳐진다. 편집기가 하나라도 열리면 맨 아래
 * "저장" 버튼이 나타나 프로필 저장 서버 액션(KAN-268·KAN-269)을 부른다. 성공하면
 * 액션이 MY로 보낸다.
 *
 * 닉네임 입력이 비어 있으면 기존 닉네임을 그대로 실어 보낸다. BE가 같은 값은
 * 변경으로 치지 않아 7일 제한에 안 걸린다. 저장 거절(중복·변경 제한 등)은
 * 중앙 팝업(`ErrorDialog`)으로 보여준다.
 *
 * @param currentNickname `GET /users/me`로 받은 현재 닉네임 (입력이 빌 때의 대체값)
 * @param nicknameChangeableAt 닉네임을 다시 바꿀 수 있는 시각. null이면 지금 가능
 * @param email 이메일. 카카오·애플 가입 등으로 없을 수 있어 null이면 행을 뺀다
 * @param initialTeams `GET /users/me`로 받은 현재 응원팀 목록
 */
export function ProfileEditForm({
  currentNickname,
  nicknameChangeableAt,
  email,
  initialTeams,
}: {
  currentNickname: string | null;
  nicknameChangeableAt: string | null;
  email: string | null;
  initialTeams: TeamCode[];
}) {
  const [nickname, setNickname] = useState("");
  const [teams, setTeams] = useState<TeamCode[]>(initialTeams);
  const [editingNickname, setEditingNickname] = useState(false);
  const [editingTeams, setEditingTeams] = useState(false);
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
      <div className="border-border-soft border-b">
        <div className="flex min-h-13.5 items-center gap-2.5">
          <span className="text-body text-text-3 w-18 shrink-0">닉네임</span>
          <span className="text-body-md text-text-strong min-w-0 flex-1 truncate font-bold">
            {currentNickname ?? "미설정"}
          </span>
          <EditToggle
            on={editingNickname}
            onClick={() => setEditingNickname((v) => !v)}
          />
        </div>
        {editingNickname && (
          <div className="pb-4">
            <NicknameEditField
              value={nickname}
              onChange={setNickname}
              changeableAt={nicknameChangeableAt}
            />
          </div>
        )}
      </div>

      {email && (
        <div className="border-border-soft flex min-h-13.5 items-center gap-2.5 border-b">
          <span className="text-body text-text-3 w-18 shrink-0">이메일</span>
          <span className="text-body-md text-text-strong min-w-0 flex-1 truncate">
            {email}
          </span>
        </div>
      )}

      <div className="border-border-soft border-b">
        <div className="flex items-start gap-2.5 py-3.5">
          <span className="text-body text-text-3 w-18 shrink-0 pt-2">
            응원팀
          </span>
          <ul className="flex min-w-0 flex-1 flex-wrap gap-1.75">
            {teams.length === 0 && (
              <li className="text-label-lg text-text-4 pt-2">
                아직 응원팀이 없어요
              </li>
            )}
            {teams.map((code) => (
              <li
                key={code}
                className="bg-chip rounded-pill flex h-8.5 items-center gap-1.5 pr-3.25 pl-2.25"
              >
                <TeamCrest team={TEAMS[code]} size={20} />
                <span className="text-label-lg text-text-strong font-bold">
                  {TEAMS[code].name}
                </span>
              </li>
            ))}
          </ul>
          <span className="pt-2">
            <EditToggle
              on={editingTeams}
              onClick={() => setEditingTeams((v) => !v)}
            />
          </span>
        </div>
        {editingTeams && (
          <div className="pb-4">
            <TeamPicker selected={teams} onToggle={toggle} />
          </div>
        )}
      </div>

      {(editingNickname || editingTeams) && (
        <div className="pt-6">
          <PrimaryButton onClick={submit} disabled={pending}>
            {pending ? "저장 중" : "저장"}
          </PrimaryButton>
        </div>
      )}

      {error && <ErrorDialog message={error} onClose={() => setError(null)} />}
    </>
  );
}

/**
 * 행 오른쪽 "수정" 텍스트 버튼. 편집기가 열려 있으면 "닫기"로 바뀐다.
 *
 * @param on 편집기가 열려 있는가
 * @param onClick 토글
 */
function EditToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-label-lg text-accent shrink-0 py-2 font-bold active:opacity-60"
    >
      {on ? "닫기" : "수정"}
    </button>
  );
}
