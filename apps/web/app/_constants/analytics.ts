/**
 * @file GA4 측정 설정 (KAN-380).
 *
 * `NEXT_PUBLIC_` env는 빌드 시점에 번들로 굳는다(ADR 0070). 배포 값은 deploy.yml
 * 빌드 스텝에 있고, main 브랜치 빌드에만 넣는다 — dev 배포와 로컬은 값이 비어
 * 태그가 아예 렌더되지 않으므로 개발 트래픽이 실서비스 지표에 섞이지 않는다.
 *
 * 모바일 앱과 같은 측정 ID를 쓴다. GA4 스트림의 교차 도메인 구성에 두 도메인을
 * 등록해 두면 `plick.co.kr`에서 `m.plick.co.kr`로 넘어간 방문이 한 세션으로 이어진다.
 */

/**
 * GA4 측정 ID(`G-XXXXXXXXXX`). 값이 없으면 측정을 붙이지 않는다.
 *
 * 브라우저에 그대로 노출되는 공개 값이라 시크릿으로 감추지 않는다 — 측정 ID는
 * 데이터를 읽을 권한이 아니라 어디로 보낼지를 가리키는 주소다.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
