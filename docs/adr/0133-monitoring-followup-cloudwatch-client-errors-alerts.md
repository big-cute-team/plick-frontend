# 0133. 모니터링 후속: ALB CloudWatch, 클라 에러 보고, 슬랙 알림 (KAN-457)

KAN-455에서 프로메테우스와 그라파나를 prod에 올리고 일부러 남긴 후속이다. 그때
[ADR 0130](0130-prometheus-grafana-monitoring.md) 끝에 "남은 것"으로 세 가지를 적어 뒀다.
HTTP 레벨 지표가 없다, 브라우저 안에서 잡힌 에러를 못 센다, 알림이 없다. 이 세션에서 셋을
다 붙였고, 문서에 잘못 적어 둔 AMI 버전도 바로잡았다. 절차서는
[docs/monitoring.md](../monitoring.md)다.

## before를 먼저 남겼다

포트폴리오에 쓸 생각으로 고치기 전 상태를 먼저 찍었다. 사용자가 SSM 포트 포워딩으로 prod
그라파나에 들어가 대시보드를 캡처했고, 나는 프로메테우스 API에서 수치를 뽑았다. 프로메테우스
UI는 인증이 없어서 9090을 포워딩하면 `/api/v1/query`를 그냥 부를 수 있다.

수집 40시간 기준으로 BE 5xx는 0건이었고, 요청 속도는 mobile 0.027 req/s, web 0.085 req/s였다.
5분 창 482개 중 mobile은 141개가 요청 0이었다. 이 숫자가 뒤에 알림 임계값을 정하는 근거가
됐다. 파일은 `docs/perf/2026-09-09-kan-457-monitoring/before/`에 있다.

캡처를 보다가 하나 더 찾았다. "BE 호출 에러율" 패널 y축이 0%에서 10000%까지 찍혀 있었다.
단위가 `percentunit`(0~1을 %로 표시)인데 축 범위를 안 잡아 둬서 그라파나가 값 없는 상태에서
축을 제멋대로 늘린 것이다. `min: 0, max: 1`을 박아 고쳤다.

## 1. 브라우저 에러 경계를 서버로 보고한다

### 왜 없었나

에러바운더리는 React가 렌더 중 던져진 에러를 잡는 장치다. 잡는 순간 브라우저 안에서 끝난다.
서버는 그런 일이 있었는지 모르고, 프로메테우스는 서버 프로세스만 긁으니 카운터에 안 남는다.
KAN-447에서 화면마다 QueryBoundary를 세워 놓고도 "얼마나 자주 터지는지"를 아무도 몰랐다.

### 어떻게 붙였나

보고 경로는 세 조각이다.

브라우저 쪽은 `packages/core/src/client-error.ts`의 `reportClientError(boundary, error)`다.
`{ boundary, error }` JSON 한 줄을 같은 origin의 `/api/client-error`로 보낸다. 전송은
`navigator.sendBeacon`을 먼저 쓴다. beacon은 페이지가 닫히거나 이동해도 브라우저가 전송을
끝까지 책임지는 API라, 라우트 `error.tsx`에서 사용자가 곧바로 뒤로 가는 경우에도 보고가
산다. sendBeacon이 없거나 큐가 꽉 차 false를 주면 `fetch(..., { keepalive: true })`로
같은 효과를 낸다. 실패는 전부 삼킨다. 보고하다가 에러 화면이 또 깨지면 본말전도다.

경계 쪽은 `ErrorBoundary`에 `componentDidCatch`를 더한 것뿐이다. `getDerivedStateFromError`가
상태를 바꿔 fallback을 그리고, `componentDidCatch`가 커밋 뒤에 불려 부수효과(보고)를 낸다.
React가 두 메서드를 나눠 둔 이유가 정확히 이 용도다. `name` prop을 새로 받아 경계 이름으로
쓰고, `QueryBoundary`도 `name`을 받아 넘긴다. 사용처 7곳(기사 댓글, 릴 댓글, 토론, 경기
목록, 경기 상세, 시즌 스탯, 선수 스탯)에 이름을 달았다. 라우트 `error.tsx`는 클래스가
아니라 `useEffect`로 `route`라는 이름으로 보고한다. web에는 컴포넌트 경계가 없어서 web
클라 에러는 전부 `route`로 모인다.

서버 쪽은 라우트 핸들러다. `apps/{mobile,web}/app/api/client-error/route.ts`가
`@plick/core/client-error-handler`의 `handleClientErrorReport`를 `POST`로 그대로 내보낸다.
핸들러는 본문을 읽어 `plick_client_error_total{boundary, error}` 카운터를 올리고 204를 준다.
`proxy.ts`의 matcher가 `api`를 제외하니 토큰 갱신 미들웨어도 안 탄다.

### 메트릭 핸들을 어디서 꺼내나

여기서 한 번 막혔다. 카운터를 가진 핸들은 `instrumentation.ts`의 `register()`가 만들어 그
파일의 모듈 변수에 들고 있다. 라우트 핸들러는 다른 모듈이라 그 변수에 닿을 수 없고,
`instrumentation.ts`를 import하는 건 Next 규약 밖이다(Next가 알아서 부르는 파일이지 남이
가져다 쓰는 파일이 아니다).

KAN-455 때 `client.ts`의 관측자를 `globalThis[Symbol.for("plick.apiFetchObserver")]`에 걸어
둔 방식이 있었다. 같은 방식으로 `metrics-handle.ts`를 만들어 `setMetricsHandle`과
`getMetricsHandle`을 두고, `startMetricsServer`가 핸들을 만들면서 전역에 건다. `Symbol.for`는
같은 문자열이면 어느 번들에서 불러도 같은 심볼을 돌려주니, Turbopack이 모듈을 몇 번
복제하든 한 핸들을 본다. `metrics-handle.ts`에는 Node 전용 import가 없어서 어느 번들에
들어가도 안전하고, 라우트 핸들러는 prom-client를 끌어오지 않는다.

### 카디널리티

이 엔드포인트는 인증이 없다. 누구든 `curl`로 아무 문자열이나 보낼 수 있고, 라벨 값이
무한히 늘면 프로메테우스 메모리도 그만큼 는다. 두 겹으로 막았다.

- 핸들러가 형태를 본다. `^[A-Za-z][A-Za-z0-9_:.-]{0,39}$` 밖이면 `other`. 문자열이 아니어도
  `other`. 본문이 1KB를 넘으면 413.
- `metrics.ts`가 가짓수를 센다. 라벨마다 처음 본 값 32개까지만 그대로 쓰고 그 뒤는 전부
  `other`로 접는다. 진짜 경계 이름은 열 몇 개라 상한에 닿을 일이 없다.

에러 이름은 `error.name`을 쓴다. `constructor.name`이 아니다. prod 번들은 클래스 이름을
민지해서 생성자 이름이 `t`, `n` 따위로 바뀐다. `name`은 내장 에러가 스스로 채우고 우리
`ApiError`도 생성자에서 명시한다. ApiError는 `ApiError:404`처럼 status를 붙였다. 404와
500은 원인이 다른데 이름만으로는 구분이 안 되고, status는 가짓수가 한 자리 수라 부담이 없다.

### 검증에서 브라우저 패널에 속았다

`curl`로 POST하니 카운터는 바로 올라갔다. 정상 보고는 라벨대로, 쓰레기 본문과 `<script>`
같은 값은 `other`로 접혔다. 문제는 실제 경계를 터뜨리는 쪽이었다.

브라우저 패널에서 `/live`를 열었더니 클라 쿼리가 401을 받고도 스켈레톤에서 안 움직였다.
`window.fetch`를 스텁해 `/be/`를 즉시 reject하게 해도 마찬가지였다. 경계가 안 잡는 건지
보고가 안 가는 건지 한참 헤맸다. React fiber를 타고 올라가 QueryClient를 꺼내 봤더니 쿼리
둘 다 `fetchStatus: "paused"`였다. TanStack의 `networkMode: "online"`은 온라인이 아니라고
판단하면 fetch와 재시도를 멈추는데, 이 패널이 그 상태였다. `navigator.onLine`은 true였고
`online` 이벤트를 흘려도 안 풀렸다. 앱 문제도 내 코드 문제도 아니고 패널 환경이었다.

iOS 시뮬레이터 Safari로 같은 주소를 열자 바로 됐다. 로컬 BE가 502를 주고, 재시도 한 번 뒤
`LiveMatches` 경계가 터져 LiveLoadError가 그려지고, 카운터에
`plick_client_error_total{boundary="LiveMatches",error="ApiError:502",app="mobile"} 1`이
올라왔다. web은 라우트만 curl로 확인했다(`boundary="route"`).

## 2. ALB 지표는 CloudWatch 데이터 소스로

브라우저의 `/be` 프록시 fetch는 Next 리라이트라 apiFetch를 안 지나고, 페이지 요청 수나
ALB 5xx, 응답 지연 같은 값은 애초에 앱 프로세스 밖이다. ALB가 CloudWatch에 다 쌓고 있으니
그라파나가 그걸 읽게 했다.

데이터 소스는 `provisioning/datasources/cloudwatch.yml` 한 파일이다. `authType: default`는
AWS SDK 기본 자격 증명 체인이라 모니터링 EC2에서는 인스턴스 롤을 탄다. 롤에
`grafana-cloudwatch-read` 인라인 정책을 더해야 하는데, 그라파나 문서의 최소 권한에서 로그
부분을 뺀 것을 절차서 3.1에 적었다. 콘솔 작업은 사용자 몫이다.

패널을 만들면서 실제 리소스를 `aws elbv2 describe-load-balancers`로 확인하다가 하나 알았다.
prod 퍼블릭 ALB `plick-alb-pub-prod`는 프론트 대상 그룹 둘만 물고 있는 게 아니라 admin
대상 그룹도 같이 물고 있다. LoadBalancer 차원으로만 그리면 admin 트래픽이 섞인다. 그래서 네
패널(요청 수, 5xx, 응답 지연 p95, 비정상 호스트 수) 전부 TargetGroup 차원으로 걸렀다. 차원
값은 `targetgroup/tg-front-mobile-prod/<해시>` 형태라 대시보드 JSON에 박혀 있고, 대상 그룹을
다시 만들면 해시가 바뀌니 절차서 함정에 적어 뒀다. CloudFront가 앞에 있어서 이 값은 캐시를
못 맞혀 오리진까지 온 요청만이라는 점도 같이 적었다.

로컬 검증은 노트북 자격 증명으로 했다. `~/.aws`를 그라파나 컨테이너의 홈에 읽기 전용으로
마운트하면 같은 기본 체인이 그 파일을 읽는다. 값을 내가 보거나 옮길 필요가 없다.
`/api/ds/query`로 mobile 대상 그룹 RequestCount를 24시간 조회하니 24포인트, 합 3306건이
돌아왔다. 실제 prod 값이다.

## 3. 알림은 실측에서 임계값을 잡았다

규칙은 둘이다. BE 호출 에러율과 스크레이프 타깃 down. 파일은
`provisioning/alerting/rules.yml`이고 contact point와 라우팅은 `contact-points.yml`이다.
그라파나 파일 프로비저닝은 읽기 전용이라 UI에서 못 고치고, 고치려면 파일을 바꿔 컨테이너를
다시 만든다. 리포가 곧 상태라는 점에서는 오히려 좋다.

### 5분 창은 안 된다

처음 계획은 5분 창 에러율 5%였다. before 수치를 보고 접었다. mobile이 0.027 req/s면 5분에
요청이 8건 남짓이고 그중 한 건만 실패해도 12%다. 5분 창 482개 중 141개는 요청이 아예 0이었다.
이러면 알림이 아니라 소음이다. 창을 30분으로 넓히고, 같은 창에 요청이 20건 이상일 때만
비율을 보게 `and`를 걸었다. 낮에는 30분에 100건 안팎이라 조건을 넘고, 밤에는 20건이 안 돼
비율 규칙이 조용해진다. 그 시간대 장애는 타깃 down 규칙이 받는다. 며칠 분포를 더 보고
조정하기로 했다.

### web은 5xx 시리즈가 없다

규칙 식을 prod 프로메테우스에 그대로 던져 봤다. 분자 `sum by (app)(rate(...{status=~"5..|0"}))`
가 mobile만 돌려줬다. web은 배포 이후 5xx나 status 0을 한 번도 안 겪어서 그 라벨 조합의
시리즈 자체가 없고, 프로메테우스 나눗셈은 양쪽 라벨이 맞는 시리즈끼리만 계산하니 web 결과가
아예 안 나온다. 그라파나 입장에서는 영원히 NoData다. 분자에 `or sum by (app)(rate(전체)) * 0`을
붙여 분모와 같은 라벨 집합에 0을 깔았다. 이러면 web도 0%가 나온다. prod에서 다시 돌려 둘 다
0이 찍히는 걸 확인했다.

### 시크릿은 SSM에서

슬랙 웹훅 URL은 리포에도 user data에도 두지 않는다. 그라파나는 프로비저닝 파일 안의
`$VAR`를 환경변수로 치환해 주므로, contact point에는 `url: $SLACK_WEBHOOK_URL`만 적었다.
compose가 그 변수를 그라파나 컨테이너에 넘기고, 값은 같은 폴더의 `.env`에서 온다. 그 `.env`는
user data가 첫 부팅 때 `aws ssm get-parameter`로
`/plick/frontend/monitoring/prod/slack-webhook`을 읽어 쓴다. 프론트 EC2가 `.env`를 만드는
방식과 같다(deploy-v2).

파라미터가 없을 때 그라파나가 못 뜨면 곤란해서 compose 기본값을 자리표시자 URL로 뒀다.
프로비저닝은 통과하고 전송만 실패한다. 이미 떠 있는 prod 인스턴스는 user data가 다시 안
도니 `.env`를 손으로 쓰는 절차를 6절에 적었다. 값은 세션에 붙여 넣지 말고 인스턴스 안에서
SSM으로 읽게 했다.

로컬 스택에서 규칙 둘이 `health=ok`, `state=inactive`로 평가되는 것과 contact point의
url이 환경변수에서 채워진 것(`[REDACTED]`로 마스킹돼 나온다)을 API로 확인했다.

## 4. AMI 표기

절차서 3.4에 Ubuntu 24.04라고 적어 뒀는데 실제 인스턴스는 26.04로 만들었다. user data는
`VERSION_CODENAME`으로 Docker 저장소를 고르기 때문에 버전에 묶이지 않아서 동작에는 차이가
없었다. 표기만 맞췄다.

## 자잘하게 막힌 것

- compose override의 `ports:`는 덮어쓰지 않고 합쳐진다. 로컬 포트를 옮기려고 override에
  13000을 적었더니 3000도 같이 열려고 하다가 dev 서버와 충돌했다. `ports: !override`로 써야
  기본 파일 값을 버린다.
- 대시보드 JSON을 파이썬 `json.dump`로 다시 쓰면 파일 전체가 펼쳐져 diff가 350줄이 된다.
  원본은 프리티어가 한 줄 객체를 그대로 둔 컴팩트 형식이라, 문자열로 필요한 블록만 끼워 넣고
  프리티어를 돌리는 쪽이 diff가 작다.
- 브라우저 패널이 숨겨져 있으면 그라파나 패널이 "Loading plugin panel"에 머물고 스크린샷도
  못 찍는다. 값은 `/api/ds/query`로, 화면은 헤드리스 크롬으로 확인했다.

## 후속: 같은 날 prod에 반영했다

PR을 올린 뒤 사용자가 콘솔 작업을 순서대로 했다. 롤에 인라인 정책 둘을 달고, 슬랙 앱을
만들어 Incoming Webhook을 SSM 파라미터에 SecureString으로 넣고, SSM 세션에서 반영 스크립트를
붙여 넣어 그라파나를 다시 만들었다. 나는 읽기 전용 명령으로만 확인했다. 정책은
`get-role-policy`로 내용까지 대조했고, 파라미터는 이름과 타입, 값의 접두어(`https://hooks.slack.com/services/`)와
길이만 봤다. 값 자체는 보지 않았고 클립보드 복사도 샌드박스에서 막혀 스크립트 파일을 건네는
쪽으로 했다.

그라파나 CloudWatch 데이터 소스의 "Save & test"가 빨갛게 떴다. 메시지를 읽어 보니 지표 API는
성공이고 로그 그룹 나열(`logs:DescribeLogGroups`)만 거부였다. 로그 권한은 안 쓴다고 일부러
뺀 것인데, 테스트가 로그까지 건드릴 줄은 몰랐다. 지표만으로 동작에는 문제가 없지만 볼 때마다
헷갈릴 테니 그 권한 하나만 정책에 더했다. 절차서 JSON도 맞췄다.

그 뒤 알림 규칙 둘이 Normal로 평가되고, contact point 테스트 메시지가 슬랙 채널에 도착했고,
prod 대시보드에 ALB 패널 4개가 실제 값으로 그려지는 것까지 확인했다. 인프라 쪽은 이 세션에서
끝났다.

## 남은 것

- 앱 쪽 변경(보고 라우트, 카운터)은 main 병합 후 prod 배포가 나가야 산다. 그 전까지 "클라
  경계 에러" 패널은 비어 있다.
- 알림 임계값은 며칠 실측 뒤 조정한다. 야간 저트래픽 구간에서 비율 규칙이 꺼지는 게 맞는지도
  그때 본다.
- after 캡처는 prod에 다 반영된 뒤 같은 24시간 범위로 찍는다.
