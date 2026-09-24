"use client";

import { useEffect, useState } from "react";
import { NICKNAME_MAX_LENGTH } from "@plick/domain/constants";
import { formatChangeableAt } from "@plick/domain/format";
import { useNicknameCheck } from "@/_hooks/useNicknameCheck";
import { NicknameCheckNotice } from "@/_components/NicknameCheckNotice";

/**
 * 닉네임 변경 입력 — 인풋 + 검사 텍스트 버튼 (KAN-319, 모바일 KAN-269 이식). 계정 행
 * 안에서 "수정하기"를 누르면 그 자리에 뜬다 (KAN-567). 각진 표 테두리 인풋 h-9.5에
 * 글자수, 그 옆에 "닉네임 검사" 텍스트 버튼이다.
 *
 * 값은 부모(ProfileEditForm)가 드는 제어형이다. 저장 시 닉네임을 함께 보내야 해서다.
 * "닉네임 검사"는 `useNicknameCheck`로 사용 가능 여부만 확인한다(실제 저장은 폼의 몫).
 *
 * 7일 제한 잠금은 `changeableAt`을 현재 시각과 비교해 판단한다. BE 값의 null 여부만
 * 믿지 않는다(응답이 온 뒤 시각이 지나면 풀려야 하므로). 잠겨 있으면 인풋, 버튼을
 * 막고 언제부터 가능한지 빨간 글씨로 안내하며, 시각이 지나면 리로드 없이 자동으로
 * 풀린다.
 *
 * @param value 현재 입력값
 * @param onChange 입력 변경 핸들러
 * @param changeableAt 닉네임을 다시 바꿀 수 있는 시각(ISO). null이면 제한 이력 없음
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

  /** 입력이 바뀌면 직전 확인 결과는 더 이상 유효하지 않다. 지운다. */
  const handleChange = (next: string) => {
    onChange(next);
    reset();
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <label
          className={`border-border-table focus-within:border-accent flex h-9.5 min-w-0 flex-1 items-center gap-2 border px-3 ${locked ? "opacity-40" : ""}`}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            disabled={locked}
            aria-label="닉네임 변경"
            placeholder={`한글, 영문, 숫자 1~${NICKNAME_MAX_LENGTH}자`}
            className="text-body text-text placeholder:text-text-4 min-w-0 flex-1 bg-transparent outline-none"
          />
          <span className="text-caption text-text-4">
            {value.length}/{NICKNAME_MAX_LENGTH}
          </span>
        </label>
        <button
          type="button"
          onClick={() => check(trimmed)}
          disabled={locked || !trimmed || pending}
          className="text-label-lg text-accent hover:text-accent-hover focus-visible:outline-accent shrink-0 px-1 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
        >
          {pending ? "검사 중" : "닉네임 검사"}
        </button>
      </div>

      {locked && changeableAt !== null ? (
        <p className="text-label text-danger" role="alert">
          {formatChangeableAt(changeableAt)}까지는 닉네임을 바꿀 수 없어요
        </p>
      ) : (
        <>
          <p className="text-caption text-text-4">
            공백 없이 써야 하고, 7일마다 한 번 바꿀 수 있어요
          </p>
          <NicknameCheckNotice result={result} />
        </>
      )}
    </div>
  );
}
