"use client";

import { useState, useTransition } from "react";
import { CheckIcon, CloseIcon } from "@plick/ui/icons";
import { checkNickname } from "@/_lib/api/users";
import { NICKNAME_MAX_LENGTH } from "@/onboarding/_lib/constants";

/** 중복확인 결과 — 아직 안 눌렀으면 null, 눌렀으면 사용 가능 여부 또는 조회 실패. */
type CheckResult = { available: boolean } | { error: string } | null;

/**
 * 닉네임 변경 입력 — 인풋 + 중복확인 버튼 (KAN-269).
 *
 * 현재 닉네임은 위 정보 카드에 이미 보이므로, 이 인풋은 "새로 바꿀 값"만 받는다
 * (빈 값 + 플레이스홀더로 시작). "중복확인"은 `GET /users/nickname-check`를 서버 액션으로
 * 불러 사용 가능 여부만 확인한다. 실제 저장(닉네임 변경 PATCH·7일 제한 409)은 후속 티켓 몫이라
 * 여기선 아직 값을 저장하지 않는다.
 */
export function NicknameEditField() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<CheckResult>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = value.trim();

  /** 입력이 바뀌면 직전 확인 결과는 더 이상 유효하지 않다 — 지운다. */
  const onChange = (next: string) => {
    setValue(next);
    setResult(null);
  };

  const check = () => {
    if (!trimmed) return;
    startTransition(async () => {
      setResult(await checkNickname(trimmed));
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-body text-text font-extrabold">닉네임 변경</span>
        <span className="text-caption text-text-4">
          7일마다 한 번 바꿀 수 있어요
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="bg-elevate-2 border-border rounded-card flex h-13 min-w-0 flex-1 items-center gap-2.5 border px-4">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            aria-label="닉네임 변경"
            placeholder="새 닉네임"
            className="text-body text-text placeholder:text-text-4 min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-semibold"
          />
          <span className="text-label text-text-4 font-semibold">
            {value.length}/{NICKNAME_MAX_LENGTH}
          </span>
        </div>

        <button
          type="button"
          onClick={check}
          disabled={!trimmed || pending}
          className="bg-elevate-2 border-border text-text-3 rounded-card text-body h-13 shrink-0 border px-4 font-semibold active:opacity-70 disabled:opacity-40"
        >
          {pending ? "확인 중…" : "중복확인"}
        </button>
      </div>

      {result &&
        ("error" in result ? (
          <p className="text-label text-danger flex items-center gap-1.5 px-1 font-semibold">
            {result.error}
          </p>
        ) : result.available ? (
          <p className="text-label text-accent flex items-center gap-1.5 px-1 font-semibold">
            <CheckIcon size={14} />
            사용할 수 있는 닉네임이에요
          </p>
        ) : (
          <p className="text-label text-danger flex items-center gap-1.5 px-1 font-semibold">
            <CloseIcon size={14} />
            이미 사용 중이거나 쓸 수 없는 닉네임이에요
          </p>
        ))}
    </div>
  );
}
