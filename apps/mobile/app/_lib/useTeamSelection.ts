"use client";

import { useState } from "react";
import type { TeamCode } from "@plick/domain/types";

/**
 * 팀 선택 상태 훅 — TeamPicker(프로필 수정)·TeamSelectGrid(온보딩)가 공용.
 *
 * 선택 상태는 로컬로만 유지한다(퍼블리싱 단계라 저장은 미연결, BE 연동 시 교체).
 *
 * @param initial - 최초 선택 팀 코드. 아직 응원팀이 없으면 null
 */
export function useTeamSelection(initial: TeamCode | null) {
  const [selected, select] = useState<TeamCode | null>(initial);
  const isSelected = (code: TeamCode) => code === selected;
  return { selected, select, isSelected };
}
