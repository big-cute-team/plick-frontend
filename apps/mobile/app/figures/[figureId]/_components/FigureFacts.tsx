import { FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import { teamProfilePath } from "@plick/domain/format";
import type { FigureProfile } from "@plick/domain/types";
import { ProfileFacts } from "@/_components/ProfileFacts";

/**
 * 인물 "기본 정보" (KAN-567, 시안 선수 프로필 기본 정보). 인물 사전이 주는 값만
 * 행으로 만든다. 소속(팀 프로필 링크), 구분, 영문명. 시안의 포지션·등번호·국적·
 * 나이는 인물 사전에 없어 뺐다(API 공백). 소속이 없으면 "소속" 행에 없음을
 * 적는다. 줄을 비우면 무소속인지 로드 실패인지 구분이 안 된다.
 *
 * @param figure 인물 프로필
 */
export function FigureFacts({ figure }: { figure: FigureProfile }) {
  const team = figure.team;
  return (
    <ProfileFacts
      items={[
        team
          ? {
              label: "소속",
              value: team.name,
              href: team.code ? teamProfilePath(team.code) : undefined,
            }
          : { label: "소속", value: "소속 팀 정보 없음" },
        { label: "구분", value: FIGURE_TYPE_LABEL[figure.type] },
        ...(figure.nameEn ? [{ label: "영문명", value: figure.nameEn }] : []),
      ]}
    />
  );
}
