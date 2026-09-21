# 0163. 경기 목록 카드 팀 표기를 서버 shortName으로 통일한다 (KAN-553)

## 무엇을 했나

라이브 스코어 탭의 경기 목록 카드가 팀을 전부 서버가 내려주는 영문 3글자 코드 `shortName`으로
표기하게 했다. 손댄 파일은 넷이다.

- `apps/mobile/app/live/_components/MatchCard.tsx`, `apps/web/app/live/_components/MatchCard.tsx`:
  팀 한 줄이 `team.name` 대신 `team.shortName`을 그린다.
- `packages/core/src/live.ts`: BE 응답 타입 `SideResponse`에 `shortName?: string`을 더하고, 경계 변환
  `toLiveTeam`이 `side.shortName ?? code ?? teamShortName(side.name)` 순서로 고른다.
- `packages/domain/src/live.ts`: 빅6 밖 EPL 팀의 영문명 → 코드 표(`TEAM_SHORT_NAMES`)를 지우고
  `teamShortName`을 순수 폴백으로 남겼다. `LiveTeam.name`이 영문 고정이라던 낡은 주석도 고쳤다.

상세 헤더와 라인업, 순위표는 그대로 전체 한글명 `name`을 쓴다.

## 왜 생긴 일인가

라이브 스코어 API는 원래 팀명을 영문으로 줬다. 그래서 `LiveTeam.shortName`은 서버 값이 아니라
프론트가 만들었다. 빅6면 팀 레지스트리 코드(CHE, TOT, ARS)를 쓰고, 아니면 도메인 패키지의
영문명 표에서 찾고(Brighton → BHA), 그것도 없으면 이름의 첫 세 글자를 대문자로 자르는 식이었다.
컵 상대나 친선 상대까지 표에 다 넣을 수 없어서 마지막 폴백이 있었다.

그런데 백엔드가 팀명을 한글 사전으로 치환하기 시작했다(KAN-528, 2026-09-19). 그 순간 영문명
표는 한 번도 맞지 않게 됐고 전부 마지막 폴백으로 떨어졌다. "브라이튼"을 세 글자로 자르면 "브라이",
"아스톤 빌라"는 "아스톤", "브렌트포드"는 "브렌트"다. 빅6는 여전히 레지스트리 코드라 카드에
"브렌트 3 CHE 0", "TOT 2 아스톤 3" 같은 줄이 섰다. 백엔드가 이 화면을 보고 카드용 영문 3글자 코드를
`shortName`으로 전 팀에 주기로 했다(KAN-550). 빅6도 서버가 같은 코드(MUN, MCI, LIV, ARS, CHE, TOT)를
주니 프론트가 따로 코드를 만들 이유가 없어졌다. 이 작업은 그 필드를 받는 쪽이다.

## 폴백을 남긴 이유

프론트가 백엔드보다 먼저 배포될 수 있다. dev는 이미 `shortName`이 있지만 prod는 순서를 장담할 수
없어서, 필드가 없으면 예전 방식(빅6 코드, 아니면 앞 세 글자)으로 떨어지게 뒀다. 응답 타입에서
`shortName`을 optional로 둔 것도 그래서다. `??` 한 줄이라 양쪽 환경 백엔드가 다 올라가면 뒤를 지우고
필드를 필수로 바꾸면 된다.

## 무엇을 지우고 무엇을 남겼나

티켓은 "프론트의 코드 테이블은 지운다"고 했다. 지운 건 카드 표기에만 쓰이던 영문 팀명 → 코드 표다.
빅6 레지스트리(`TEAMS`, `TEAM_CODES`)는 남겼다. 그 표는 카드 라벨보다 로컬 크레스트 에셋, 마이팀
강조, 스쿼드 진입 링크가 쓰는 것이라 지우면 그쪽이 같이 무너진다. 카드는 이제 그 표에서 코드를
꺼내지 않고, 폴백에서만 잠깐 스친다.

킥오프 전 프리뷰의 상대 전적(headToHead) 줄은 서버가 한글 팀명만 주고 `shortName`이 없어 지금도
`teamShortName`으로 자른다. 티켓 범위 밖이라 두었다. 헤더의 두 팀 코드를 빌려 쓰면 될 일이라
후속으로 남긴다.

처음엔 티켓의 "경기 목록 카드"를 두고 상세 위 같은 날 경기 스트립을 말하는 건지 헷갈려 목록 카드
변경을 되돌렸다가 다시 넣었다. 티켓에 적힌 그대로 목록 카드로 확정했다. 스트립과 타임라인, 라인업
헤더, 제네릭 크레스트는 원래부터 `shortName`을 그리고 있어서 매퍼 수정만으로 함께 바로잡힌다.

## 검증

집에서 핫스팟으로 붙은 상태라 dev(CloudFront)가 403으로 막혀 실제 응답을 못 봤다. 회사망 IP만 열려
있는 것 같다. 로컬 BE(8082)는 FOOTBALL_API_KEY가 없어 502라 경기 목록이 안 온다. 그래서 응답 shape는
Confluence 명세의 예시(`"home": { "teamId": 2, "name": "맨체스터 시티", "shortName": "MCI", ... }`)를
기준으로 잡았고, 로컬에서 `format:check`, `lint`, `check-types`, `build`를 돌렸다. dev 카드에서
"BRE 3 : 0 CHE"처럼 보이는지는 회사에서 확인한다.

## 관련

- 배선 원본: [ADR 0129](0129-livescore-api-wiring.md)
- 명세: Confluence [API 명세] 라이브 스코어 §1 필드 표 home.shortName / away.shortName
- 백엔드: KAN-528(팀명 한글), KAN-550(shortName 추가)
