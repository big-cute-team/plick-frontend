/**
 * VS 화면 탭. 기존 기본 URL을 유지해 open은 밸런스게임을 가리킨다. 랭킹(`rank`)은 모바일에만 있다.
 * 데스크톱은 `/rankings` 페이지로 뺐다(KAN-724 PR).
 */
export type DebateTab = "open" | "prediction";
