"use client";

import { useEffect, useState } from "react";
import { formatChangeableAt } from "@plick/domain/format";
import { useNicknameCheck } from "@/_hooks/useNicknameCheck";
import { NICKNAME_MAX_LENGTH } from "@/_constants/onboarding";
import { NicknameCheckNotice } from "@/_components/NicknameCheckNotice";

/**
 * 닉네임 변경 입력 — 인풋 + 중복확인 버튼 (KAN-319, 모바일 KAN-269 이식).
 *
 * 현재 닉네임은 아바타 밑에 이미 보이므로, 이 인풋은 "새로 바꿀 값"만 받는다
 * (빈 값 + 플레이스홀더로 시작). 값은 부모(ProfileEditForm)가 드는 제어형 — 저장 시
 * 닉네임을 함께 보내야 해서다. "중복확인"은 `useNicknameCheck`로 사용 가능 여부만
 * 확인한다(실제 저장은 폼의 "변경사항 저장" 몫). 데스크톱이라 버튼에 hover를 얹는다.
 *
 * 7일 제한 잠금은 `changeableAt`을 현재 시각과 비교해 판단한다 — BE 값의
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
  const { result, pending, check, reset } = useNicknameCheck();
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
    reset();
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-tab text-text font-extrabold">닉네임 변경</span>
        <span className="text-caption text-text-4">
          7일마다 한 번 바꿀 수 있어요
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <div
          className={`bg-elevate-2 border-border rounded-card focus-within:border-border-strong flex h-13 min-w-0 flex-1 items-center gap-2.5 border px-4 ${locked ? "opacity-40" : ""}`}
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
          onClick={() => check(trimmed)}
          disabled={locked || !trimmed || pending}
          className="bg-elevate-2 border-border text-text-3 rounded-card text-body hover:bg-elevate focus-visible:outline-accent h-13 shrink-0 border px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-70 disabled:opacity-40"
        >
          {pending ? "확인 중…" : "중복확인"}
        </button>
      </div>

      {locked && changeableAt !== null ? (
        <p className="text-label text-danger px-1 font-semibold" role="alert">
          {formatChangeableAt(changeableAt)}까지는 닉네임을 바꿀 수 없어요
        </p>
      ) : (
        <NicknameCheckNotice result={result} />
      )}
    </div>
  );
}
