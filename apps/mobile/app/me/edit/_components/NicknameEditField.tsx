"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckIcon, CloseIcon } from "@plick/ui/icons";
import { checkNickname } from "@/_lib/api/users";
import { NICKNAME_MAX_LENGTH } from "@/onboarding/_lib/constants";
import { formatChangeableAt } from "../_lib/utils";

/** 중복확인 결과 — 아직 안 눌렀으면 null, 눌렀으면 사용 가능 여부 또는 조회 실패. */
type CheckResult = { available: boolean } | { error: string } | null;

/**
 * 닉네임 변경 입력 — 인풋 + 중복확인 버튼 (KAN-269).
 *
 * 현재 닉네임은 위 정보 카드에 이미 보이므로, 이 인풋은 "새로 바꿀 값"만 받는다
 * (빈 값 + 플레이스홀더로 시작). 값은 부모(ProfileEditForm)가 드는 제어형 — 저장 시
 * 닉네임을 함께 보내야 해서다. "중복확인"은 `GET /users/nickname-check`를 서버 액션으로
 * 불러 사용 가능 여부만 확인한다(실제 저장은 폼의 "변경사항 저장" 몫).
 *
 * 7일 제한 잠금은 `changeableAt`을 **현재 시각과 비교**해 판단한다 — BE 값의
 * null 여부만 믿지 않는다(응답이 온 뒤 시각이 지나면 풀려야 하므로). 잠겨 있으면
 * 인풋·버튼을 막고 언제부터 가능한지 빨간 글씨로 안내하며, 시각이 지나면
 * 리로드 없이 자동으로 풀린다.
 *
 * @param value - 현재 입력값
 * @param onChange - 입력 변경 핸들러
 * @param changeableAt - 닉네임을 다시 바꿀 수 있는 시각(ISO) — null이면 제한 이력 없음
 */
export function NicknameEditField({
  value,
  onChange,
  changeableAt,
}: {
  value: string;
  onChange: (value: string) => void;
  changeableAt: string | null;
}) {
  const [result, setResult] = useState<CheckResult>(null);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  const lockedUntil = changeableAt === null ? null : Date.parse(changeableAt);
  const locked = lockedUntil !== null && lockedUntil > now;

  /** 잠금 시각이 지나는 순간 한 번 다시 렌더해 자동으로 풀어준다. */
  useEffect(() => {
    if (!locked || lockedUntil === null) return;
    const id = setTimeout(() => setNow(Date.now()), lockedUntil - now);
    return () => clearTimeout(id);
  }, [locked, lockedUntil, now]);

  const trimmed = value.trim();

  /** 입력이 바뀌면 직전 확인 결과는 더 이상 유효하지 않다 — 지운다. */
  const handleChange = (next: string) => {
    onChange(next);
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
        <div
          className={`bg-elevate-2 border-border rounded-card flex h-13 min-w-0 flex-1 items-center gap-2.5 border px-4 ${locked ? "opacity-40" : ""}`}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            disabled={locked}
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
          disabled={locked || !trimmed || pending}
          className="bg-elevate-2 border-border text-text-3 rounded-card text-body h-13 shrink-0 border px-4 font-semibold active:opacity-70 disabled:opacity-40"
        >
          {pending ? "확인 중…" : "중복확인"}
        </button>
      </div>

      {locked && changeableAt !== null ? (
        <p className="text-label text-danger px-1 font-semibold" role="alert">
          {formatChangeableAt(changeableAt)}까지는 닉네임을 바꿀 수 없어요
        </p>
      ) : (
        result &&
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
        ))
      )}
    </div>
  );
}
