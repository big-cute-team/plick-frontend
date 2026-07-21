"use client";

import { useState } from "react";
import { BottomActionBar } from "@/_components/BottomActionBar";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { useNicknameCheck } from "@/_lib/useNicknameCheck";
import { SkipLink } from "@/onboarding/_components/SkipLink";
import { NicknameField } from "./NicknameField";

/**
 * 온보딩 1단계 폼 — 닉네임 상태를 들고, "다음"에 쿼리로 실어 2단계(팀 선택)로 넘긴다.
 * 온보딩 저장 API는 두 단계 값을 한 번에 받으므로(KAN-264) 여기선 전송 없이 값만 나른다.
 *
 * "다음"은 **현재 입력값이 중복확인을 통과했을 때만** 열린다 — 중복이거나, 입력을
 * 바꾸고 아직 확인 안 했으면 잠긴다(입력이 바뀌면 결과를 지우므로 자동으로 다시 잠김).
 * 그래서 중복확인 상태 기계(`useNicknameCheck`)를 필드가 아니라 여기서 들고
 * 필드에는 내려준다. 확인은 그 순간의 답이라 제출 때 BE가 다시 검사한다(팝업 처리).
 *
 * @param initial - 초기 닉네임 — `GET /users/me`의 닉네임(KAN-267). 자동 닉네임
 *   (plick+숫자)은 금지어 "plick"을 포함해 확인을 통과할 수 없으므로, 진행하려면
 *   자기 닉네임을 새로 정해야 한다(건너뛰기는 SkipLink 몫).
 */
export function NicknameStep({ initial = "" }: { initial?: string }) {
  const [nickname, setNickname] = useState(initial);
  const { result, pending, check, reset } = useNicknameCheck();

  const trimmed = nickname.trim();
  const confirmed =
    result !== null && "available" in result && result.available;

  /** 입력이 바뀌면 직전 확인 결과는 더 이상 유효하지 않다 — 지워서 "다음"도 잠근다. */
  const handleChange = (next: string) => {
    setNickname(next);
    reset();
  };

  return (
    <>
      <section className="px-edge flex flex-1 flex-col pt-5.5">
        <h1 className="text-headline text-text font-extrabold">
          닉네임을 정해주세요
        </h1>
        <p className="text-body text-text-3 mt-2.5 font-semibold">
          댓글과 반응에 표시될 이름이에요
        </p>

        <div className="mt-7.5">
          <NicknameField
            value={nickname}
            onChange={handleChange}
            result={result}
            pending={pending}
            onCheck={() => check(trimmed)}
          />
        </div>
      </section>

      <BottomActionBar>
        <SkipLink />
        {confirmed ? (
          <PrimaryButton
            href={`/onboarding/team?nickname=${encodeURIComponent(trimmed)}`}
          >
            다음
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled>다음</PrimaryButton>
        )}
      </BottomActionBar>
    </>
  );
}
