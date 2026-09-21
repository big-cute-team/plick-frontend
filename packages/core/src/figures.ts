/**
 * @file 팀·인물 프로필 fetcher (KAN-500, `GET /api/v1/teams/{teamId}`,
 * `GET /api/v1/figures/{figureId}`).
 *
 * 기사 카드의 `figures` 배열 원소 변환({@link toFigureTag})도 여기 둔다 —
 * 피드·릴스·상세가 같은 `FigureResponse`를 받으므로 변환 한 곳을 셋이
 * 가져다 쓴다(`FeedCardResponse`·`toArticleCard`를 좋아요 목록이 가져다 쓰는
 * 것과 같은 관용).
 *
 * 둘 다 익명 허용 공개 API다(`SecurityConfig` permitAll, be-verify 실측 익명
 * 200). 로그인해도 응답이 같아 토큰을 싣지 않는다 — 만료 토큰을 실으면
 * 오히려 401이다. 단발 읽기라 서버 컴포넌트에서 await 한다.
 */

import { TEAM_CODES } from "@plick/domain/constants";
import type {
  FigureProfile,
  FigureTag,
  FigureType,
  TeamProfile,
} from "@plick/domain/types";
import { apiFetch } from "./client";

/**
 * BE 인물 요약 (be-verify가 소스·스웨거로 확인한 그대로). 기사 카드 네 곳의
 * `figures[]`와 팀 프로필의 `figures[]`가 같은 모양이다. `nameEn`·소개·소속은
 * 여기 없고 인물 프로필에만 있다.
 */
export interface FigureResponse {
  figureId: number;
  nameKo: string;
  /** "PLAYER" | "MANAGER" | "COACH" | "OWNER" | "OTHER" */
  type: string;
  imageUrl: string | null;
}

interface TeamProfileResponse {
  teamId: number;
  nameKo: string;
  nameEn: string;
  shortName: string;
  logoUrl: string | null;
  figures: FigureResponse[];
}

interface FigureProfileResponse {
  figureId: number;
  nameKo: string;
  nameEn: string | null;
  type: string;
  imageUrl: string | null;
  description: string | null;
  team: {
    teamId: number;
    nameKo: string;
    shortName: string;
    logoUrl: string | null;
  } | null;
}

const FIGURE_TYPES: FigureType[] = [
  "PLAYER",
  "MANAGER",
  "COACH",
  "OWNER",
  "OTHER",
];

/** 모르는 값이 와도 화면이 죽지 않게 OTHER로 떨어뜨린다. */
function toFigureType(raw: string): FigureType {
  return FIGURE_TYPES.includes(raw as FigureType)
    ? (raw as FigureType)
    : "OTHER";
}

/** BE → 도메인 경계 변환. 기사 카드와 팀 프로필의 인물 원소가 함께 쓴다. */
export function toFigureTag(r: FigureResponse): FigureTag {
  return {
    id: String(r.figureId),
    name: r.nameKo,
    type: toFigureType(r.type),
    imageUrl: r.imageUrl,
  };
}

/**
 * 기사 응답의 `figures` 배열 변환. BE 새 빌드는 항상 배열(태그 없으면 `[]`)로
 * 주지만, FE가 먼저 배포되거나 옛 빌드에 붙으면 키 자체가 없다 — 그때 화면이
 * 죽지 않게 빈 배열로 눕힌다.
 */
export function toFigureTags(
  figures: FigureResponse[] | null | undefined,
): FigureTag[] {
  return (figures ?? []).map(toFigureTag);
}

/**
 * 팀 프로필 한 건 — 로고·표기·소속 인물 목록.
 *
 * @param teamId BE `teams.team_id` (레지스트리 `TEAM_IDS`로 팀 코드에서 얻는다)
 * @throws {ApiError} 없는 id는 404 `TEAM_NOT_FOUND`, 정수가 아니면 400
 *   `COMMON_INVALID_PARAM` — 호출부가 잡아 not-found로 보낸다.
 */
export async function getTeamProfile(teamId: number): Promise<TeamProfile> {
  const team = await apiFetch<TeamProfileResponse>(`/api/v1/teams/${teamId}`);
  return {
    id: team.teamId,
    code: TEAM_CODES[team.teamId] ?? null,
    name: team.nameKo,
    nameEn: team.nameEn,
    logoUrl: team.logoUrl,
    figures: toFigureTags(team.figures),
  };
}

/**
 * 인물 프로필 한 건 — 사진·한 줄 소개·소속 팀.
 *
 * @param figureId 라우트 파라미터 그대로의 인물 id (BE는 int64 정수)
 * @throws {ApiError} 없는 id와 운영자가 내린 인물(`is_deleted`)은 똑같이 404
 *   `FIGURE_NOT_FOUND`, 정수가 아니면 400 `COMMON_INVALID_PARAM`.
 */
export async function getFigureProfile(
  figureId: string,
): Promise<FigureProfile> {
  const figure = await apiFetch<FigureProfileResponse>(
    `/api/v1/figures/${encodeURIComponent(figureId)}`,
  );
  return {
    id: String(figure.figureId),
    name: figure.nameKo,
    nameEn: figure.nameEn,
    type: toFigureType(figure.type),
    imageUrl: figure.imageUrl,
    description: figure.description,
    team: figure.team
      ? {
          id: figure.team.teamId,
          code: TEAM_CODES[figure.team.teamId] ?? null,
          name: figure.team.nameKo,
          logoUrl: figure.team.logoUrl,
        }
      : null,
  };
}
