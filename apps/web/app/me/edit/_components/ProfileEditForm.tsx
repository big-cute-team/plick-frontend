"use client";

import { useState, useTransition } from "react";
import { TEAMS } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { ErrorDialog } from "@/_components/ErrorDialog";
import { updateMyProfile } from "@/_services/users";
import { FavoriteTeamPicker } from "./FavoriteTeamPicker";
import { NicknameEditField } from "./NicknameEditField";

/** 지금 인라인으로 편집 중인 행. */
type EditingRow = "nickname" | "teams" | null;

/**
 * 계정 행 셋 + 인라인 편집 (KAN-319, 모바일 이식 → KAN-567 시안 MY 685-715행).
 * 닉네임, 이메일, 응원팀을 라벨 96px 13 보조색 + 값 14 행으로 두고, 오른쪽
 * "수정하기"(12.5/700 강조색)를 누르면 그 행이 입력으로 바뀐다. 편집 중인 행 밑에
 * 저장, 취소 버튼이 선다.
 *
 * 저장은 프로필 저장 서버 액션 하나다. 닉네임 입력이 비어 있으면 기존 닉네임을 그대로
 * 실어 보낸다. BE가 같은 값은 변경으로 치지 않아 7일 제한에 안 걸린다. 성공하면
 * 액션이 MY로 보낸다. 저장 거절(중복, 변경 제한 등)은 중앙 팝업(`ErrorDialog`)으로
 * 보여준다.
 *
 * @param currentNickname `GET /users/me`로 받은 현재 닉네임 (입력이 빌 때의 대체값)
 * @param nicknameChangeableAt 닉네임을 다시 바꿀 수 있는 시각. null이면 지금 가능
 * @param email 이메일. 카카오, 애플 가입은 없어 그때는 행을 그리지 않는다
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
  const [editing, setEditing] = useState<EditingRow>(null);
  const [nickname, setNickname] = useState("");
  const [teams, setTeams] = useState<TeamCode[]>(initialTeams);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (code: TeamCode) => {
    setTeams((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const cancel = () => {
    setEditing(null);
    setNickname("");
    setTeams(initialTeams);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      // 입력이 비었으면 기존 닉네임으로 채워 보낸다(모바일과 같은 규칙). 둘 다 없으면 항목 생략.
      const result = await updateMyProfile(
        nickname.trim() || currentNickname,
        teams,
      );
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="max-w-narrow">
      <Row label="닉네임" first editing={editing === "nickname"}>
        {editing === "nickname" ? (
          <NicknameEditField
            value={nickname}
            onChange={setNickname}
            changeableAt={nicknameChangeableAt}
          />
        ) : (
          <>
            <span className="text-body-md text-text-strong flex-1">
              {currentNickname ?? "미설정"}
            </span>
            <EditButton onClick={() => setEditing("nickname")} />
          </>
        )}
      </Row>

      {email && (
        <Row label="이메일">
          <span className="text-body-md text-text-strong flex-1">{email}</span>
        </Row>
      )}

      <Row label="응원팀" editing={editing === "teams"} top>
        {editing === "teams" ? (
          <FavoriteTeamPicker selected={teams} onToggle={toggle} />
        ) : (
          <>
            <div className="flex flex-1 flex-wrap gap-2">
              {initialTeams.length > 0 ? (
                initialTeams.map((code) => (
                  <span
                    key={code}
                    className="border-border-table flex items-center gap-1.75 border py-1.5 pr-3.25 pl-2.25"
                  >
                    <TeamCrest team={TEAMS[code]} size={18} />
                    <span className="text-label-lg text-text-strong font-bold">
                      {TEAMS[code].name}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-body-md text-text-4">
                  아직 응원팀이 없어요
                </span>
              )}
            </div>
            <EditButton onClick={() => setEditing("teams")} />
          </>
        )}
      </Row>

      {editing && (
        <div className="flex justify-end gap-2.5 pt-4">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="text-label-lg text-text-3 hover:text-text-strong focus-visible:outline-accent h-9.5 px-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent h-9.5 px-4.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            {pending ? "저장 중" : "저장"}
          </button>
        </div>
      )}

      {error && <ErrorDialog message={error} onClose={() => setError(null)} />}
    </div>
  );
}

/**
 * 계정 행 — 라벨 96px + 값. 첫 행은 섹션 구분선, 나머지는 목록 구분선으로 위를 긋는다.
 *
 * @param first 첫 행이면 위 선을 진하게
 * @param top 값이 여러 줄이면(응원팀 칩) 라벨을 위에 맞춘다
 * @param editing 편집 중이면 값 자리가 입력 블록으로 늘어난다
 */
function Row({
  label,
  first = false,
  top = false,
  editing = false,
  children,
}: {
  label: string;
  first?: boolean;
  top?: boolean;
  editing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex gap-2.5 pt-4 pb-2.25 ${
        first ? "border-border border-t" : "border-border-soft border-t"
      } ${top || editing ? "items-start" : "items-baseline"}`}
    >
      <span
        className={`text-body text-text-3 w-24 shrink-0 ${top || editing ? "pt-1.75" : ""}`}
      >
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-2.5">{children}</div>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-label-lg text-accent hover:text-accent-hover focus-visible:outline-accent shrink-0 font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      수정하기
    </button>
  );
}
