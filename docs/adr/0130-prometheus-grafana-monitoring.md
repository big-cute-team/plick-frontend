# 0130. 프로메테우스 + 그라파나 모니터링, prod에 바로 (KAN-455)

스터디 숙제의 마지막 조각이다. 에러바운더리와 throwOnError, Suspense는 KAN-447에서 끝냈고
([ADR 0128](0128-error-handling-before-capture.md)), 남은 게 "프로메테우스 + 그라파나 설정"이었다.
이 세션에서는 앱에 메트릭 포트를 열고, 모니터링 EC2를 prod VPC에 세우는 데 필요한 파일과
절차를 전부 리포에 넣었다. 콘솔에서 리소스를 만드는 일은 내가 할 수 없어서 절차서로 남겼다
([docs/monitoring.md](../monitoring.md)).

## 프로메테우스가 뭔지부터

이 세션은 "프로메테우스랑 그라파나가 뭔지 먼저 쉽게 설명해 달라"에서 시작했다. 정리하면
이렇다. 프로메테우스는 숫자를 모으는 쪽이다. 서버가 "요청이 몇 건 왔나, 응답이 몇 ms 걸렸나,
메모리를 얼마나 쓰나" 같은 수치를 노출하는 작은 페이지(`/metrics`)를 열어 두면, 프로메테우스가
15초마다 그 페이지를 긁어 시간순으로 저장한다. 이걸 스크레이프라고 한다. 앱이 보내는 게 아니라
프로메테우스가 와서 가져가는 풀(pull) 구조라는 게 핵심이다. 그라파나는 그 숫자를 그래프로
그려 주는 화면이다. 둘은 한 쌍으로 쓴다.

## 프라이빗 서브넷 문제는 생각보다 작았다

prod 프론트 EC2는 프라이빗 서브넷에 있고 들어오는 길은 ALB뿐이다. 풀 구조라 프로메테우스가
인스턴스에 닿아야 하는데, 어디에 둘지가 결정이었다. 셋을 놓고 봤다.

1. 같은 VPC 프라이빗 서브넷에 작은 EC2를 하나 올려 프로메테우스와 그라파나를 docker compose로
   띄운다. 보안그룹 규칙 한 줄이면 닿는다.
2. BE 팀이 이미 프로메테우스를 돌리고 있으면 거기 얹는다.
3. Grafana Cloud 같은 관리형에 에이전트가 밀어 넣는 푸시 방식으로 뒤집는다. 인바운드가
   아예 필요 없다.

숙제 취지가 "프로메테우스 설정을 직접 해 본다"라서 3은 빼고, 사용자가 "prod에 바로, EC2도
만드는 걸로" 정해서 1로 갔다. dev를 건너뛴 이유는 모니터링 EC2 하나에 월 2만 원 정도가
드는데 두 환경에 다 올릴 가치는 아직 없고, prod 지표가 곧 포트폴리오 재료이기 때문이다.

그런데 진짜 문제는 네트워크가 아니었다. ASG가 배포마다 인스턴스를 통째로 바꾸니(Blue/Green,
[ADR 0068](0068-deploy-v2-groundwork.md)) IP를 적어 둘 수가 없다는 것, 그리고 `/metrics`를
어디에 노출하느냐였다.

## `/metrics`는 별도 포트에

처음 떠오르는 건 Next 라우트 핸들러로 `app/metrics/route.ts`를 만드는 것이다. 이러면 ALB를 거쳐
인터넷에서도 `m.plick.co.kr/metrics`가 열린다. 요청 수와 에러율, 메모리 사용량은 남에게 보여 줄
값이 아니다. ALB 리스너 규칙으로 그 경로를 막는 방법도 있지만, 규칙을 빠뜨리면 그대로
새는 구조는 싫었다.

그래서 Next와 별도 포트에 `node:http` 서버를 하나 더 띄웠다. ALB 대상 그룹은 3000·3001만
알고 있으니 9464·9465는 바깥에서 닿을 길이 없고, 보안그룹에서 모니터링 EC2의 SG를 소스로만
열면 된다. 한 인스턴스에 web과 mobile이 같이 뜨므로 포트를 앱마다 다르게 줬다.

띄우는 자리는 Next의 `instrumentation.ts`다. 앱 루트에 이 파일을 두고 `register()`를
export하면 서버 프로세스가 뜰 때 한 번 불린다. 함정이 하나 있다. `register`는 Node 런타임과
Edge 런타임에서 각각 불리는데, Edge에는 `node:http`가 없다. 그래서
`process.env.NEXT_RUNTIME === "nodejs"`일 때만, 그것도 동적 `import()`로 메트릭 모듈을
불러온다. 정적 import를 쓰면 Edge 번들에 prom-client가 딸려 들어가 빌드가 깨진다.

같은 파일에서 `onRequestError`도 export했다. Next가 요청 처리 중 잡은 에러(렌더, 라우트
핸들러, 서버 액션)마다 불리는 훅이라 여기서 카운터를 올린다. `context.routeType`이 어디서
났는지 알려 줘서 라벨로 썼다. 에러바운더리가 잡는 클라이언트 렌더 에러는 브라우저 안에서
끝나니 여기 안 온다. 그건 별도 과제다.

## 메트릭은 `@plick/core`에, 관측 훅은 `client.ts`에

prom-client 코드는 `packages/core/src/metrics.ts` 한 파일이다. web과 mobile이 똑같이 쓰고,
Node 전용이라 브라우저 번들에 들어가면 안 된다. `@plick/core`는 파일 단위 export
(`./*`)라 `@plick/core/metrics`만 서버에서 import하면 나머지는 영향이 없다.

BE 호출을 세는 자리는 `apiFetch`다. 모든 서버 fetch가 지나가는 래퍼라 여기가 axios
interceptor 자리다. 그런데 `client.ts`는 브라우저 번들에도 들어간다. prom-client를 여기서
import할 수는 없다. 그래서 관측자 슬롯만 뒀다. `setApiFetchObserver(fn)`으로 콜백을
꽂아 두면 `apiFetch`가 결과(메서드, 경로, status, 소요 시간)를 넘겨 주고, 브라우저에선
아무도 안 꽂으니 비용이 없다. 메트릭 모듈이 서버에서 이 슬롯에 카운터와 히스토그램을 꽂는다.

경로 라벨은 그대로 넣으면 안 된다. `/api/v1/articles/123`, `/124`, `/125`가 전부 다른
시계열이 돼서 프로메테우스 메모리가 기사 수만큼 는다. 숫자·UUID·긴 해시 세그먼트를
`:id`로 접는 `normalizePath`를 넣었다. 쿼리스트링도 뗀다.

## 검증에서 헛짚은 것: 카운터가 0이었다

standalone 빌드를 돌리고 `node server.js`로 띄운 뒤 `:9464/metrics`를 쳤다. Node 기본
지표는 나왔는데 `plick_be_request_total` 시계열이 하나도 없었다. 페이지도 200으로 잘 떴는데.

첫 가설은 번들 격리였다. Next는 `instrumentation.ts`를 별도 엔트리로 컴파일하고
(`.next/server/instrumentation.js`), 페이지는 각자 청크로 묶는다. 엔트리마다 webpack
런타임과 모듈 캐시가 따로라 같은 `client.ts`가 두 번 평가된다. 그러면 instrumentation
번들의 슬롯에만 관측자가 꽂히고, 페이지 번들의 `apiFetch`는 빈 슬롯을 본다. 그럴듯해서
슬롯을 모듈 변수에서 `globalThis`의 `Symbol.for` 키로 옮기고 다시 빌드했다.

그래도 0이었다. 그제야 로그를 봤더니 `EADDRINUSE: 127.0.0.1:3101`. 이전 검증에서 띄운
서버를 `pkill -f "standalone/apps/mobile/server.js"`로 죽였다고 생각했는데, 프로세스는
`cd` 한 뒤 `node server.js`로 떠서 커맨드라인에 그 경로가 없었다. pkill이 아무것도 못
잡았고, 새 서버는 뜨지도 못했고, 나는 옛 빌드의 서버를 계속 치고 있었다. 게다가 홈과
`/articles`는 클라이언트 fetch 위주라 서버 apiFetch 호출이 적었다.

`lsof -ti :3101 | xargs kill`로 제대로 죽이고 라이브 스코어 순위 페이지(서버 컴포넌트
fetch)를 치니 바로 나왔다.

```
plick_be_request_total{method="GET",path="/api/v1/articles/hot",status="200",app="mobile"} 1
plick_be_request_total{method="GET",path="/api/v1/standings",status="502",app="mobile"} 1
plick_be_request_total{method="GET",path="/api/v1/matches/:id",status="502",app="mobile"} 4
```

경로 정규화(`matches/:id`)와 라벨이 의도대로 붙었다. 502는 로컬 BE에 FOOTBALL_API_KEY가
없어서 나는 것으로 이미 아는 값이다([ADR 0129](0129-livescore-api-wiring.md)).

`globalThis` 변경은 그대로 뒀다. 이번엔 원인이 아니었지만 번들 격리 자체는 사실이고,
instrumentation에서 만든 싱글턴을 라우트와 공유하려면 `globalThis`가 정석이다. 검증 실패의
진짜 원인을 확인하기 전에 가설을 코드에 밀어 넣은 건 [ADR 0128]에서도 한 번 겪은 패턴이라
반성으로 적어 둔다. 재현 절차부터 의심했어야 했다.

## 인스턴스 교체는 EC2 서비스 디스커버리로

프로메테우스 설정에 `ec2_sd_configs`를 썼다. 리전의 인스턴스 목록을 주기적으로
DescribeInstances로 받아 와 태그로 거르고 프라이빗 IP를 타깃으로 만든다. ASG가 붙이는
`aws:autoscaling:groupName=plick-frontend-asg-prod` 태그를 필터로 쓰면 Green이 뜨고
Blue가 죽어도 60초 안에 타깃이 따라온다. 자격 증명은 모니터링 EC2의 인스턴스 롤에서
자동으로 얻으니 키를 어디 적을 일도 없다. 필요한 권한은 `ec2:DescribeInstances`와
`ec2:DescribeAvailabilityZones` 둘이다.

## 모니터링 EC2는 user data 하나로

배포 v2에서 배운 대로 인스턴스 안에 손 세팅을 남기지 않는다. `infra/monitoring/` 아래
compose 파일과 프로메테우스 설정, 그라파나 프로비저닝(데이터 소스와 대시보드 JSON)을 두고,
`scripts/monitoring/build-user-data.sh`가 그 폴더를 tar+gzip+base64로 묶어 user data
스크립트 안에 심는다. 첫 부팅에 Docker를 깔고 파일을 풀고 `docker compose up -d`하면 끝이다.
리포가 프라이빗이라 인스턴스가 git clone을 못 하고, S3를 거치면 버킷과 롤이 하나 더
필요해서 통째로 실어 보내는 쪽을 골랐다.

여기서도 하나 막혔다. user data는 16KB 제한인데 첫 출력이 14.8KB였다. 대시보드 JSON을
compact로 줄여도 그대로 14.8KB였다. 압축이 안 되고 있었다. macOS의 bsdtar에 `-z`를 줘서
파이프로 내보내면 결과가 정확히 10240바이트, tar 블록 크기 배수였다. `file`은 gzip이라고
하는데 크기가 그 모양이니 블록 패딩이 압축 뒤에 붙는 것 같았다. 더 파지 않고 `tar -cf - |
gzip -9`로 갈랐더니 4KB, user data 전체가 6KB로 내려왔다.

그라파나와 프로메테우스 포트는 둘 다 127.0.0.1에만 바인딩했다. 보안그룹에 인바운드가
없고, 보는 방법은 SSM 포트 포워딩 하나다. 노트북에서 `aws ssm start-session`으로 인스턴스의
3000을 로컬 3000으로 끌어오면 그게 그라파나다. 배포 때 쓰던 SSM 세션과 같은 도구라
새로 열 구멍이 없다. 첫 로그인은 admin/admin이고 그라파나가 바로 비밀번호 변경을
강제한다. 바깥에서 닿을 수 없는 포트라 초기값을 user data에 박아 두지 않았다.

## 로컬에서 스택까지 돌려 봤다

콘솔에 올리기 전에 같은 compose를 로컬 docker로 띄웠다. 포트만 override로 바꾸고 프로메테우스
설정은 `host.docker.internal:9464`·`9465` static 타깃으로 갈아 끼웠다(ec2_sd는 로컬에
자격 증명이 없어 타깃이 비니까). `promtool check config`가 통과했고, 그라파나 API로 데이터
소스와 `PLick Frontend (prod)` 대시보드가 프로비저닝된 게 보였다. standalone web·mobile을
띄우고 curl로 트래픽을 흘리니 두 잡 모두 `up`이었고, 대시보드에 BE 호출 속도와 502 에러율,
path별 p95, 이벤트루프 지연이 그려졌다. 스크린샷을 찍으려고 로컬 그라파나만 익명 Admin을
켰다. 로그인 폼에 비밀번호를 넣는 건 내가 할 수 없는 일이라서.

대시보드 JSON은 파이썬으로 패널 9개를 찍어 냈다. 손으로 JSON을 쓰기엔 길고, 그라파나 UI에서
만들어 export하는 건 인스턴스가 아직 없어서. 나중에 UI에서 고치면 export해서 리포 파일에
되돌려 놓아야 재생성에서 살아남는다.

## 남은 것

- 콘솔 작업은 사용자 몫이다: IAM 롤, 보안그룹 둘, 모니터링 EC2. 순서와 값은
  [docs/monitoring.md](../monitoring.md) 3절에 있다.
- 메트릭 포트는 앱 코드가 여니 이 브랜치가 main까지 가서 prod 배포가 나가야 열린다.
  develop 병합으로 dev에 먼저 나가는데, dev에는 아무도 안 긁으니 포트만 열린 상태가 된다.
- HTTP 레벨 지표(페이지 요청 수, ALB 5xx, 응답 지연)는 여기 없다. 브라우저 `/be` 프록시
  fetch는 Next 리라이트라 apiFetch를 안 지난다. ALB CloudWatch를 그라파나 데이터 소스로
  붙이면 정확한 값이 나오고, 인스턴스 롤에 CloudWatch 읽기 권한만 더하면 된다. 후속 과제다.
- 클라이언트 에러바운더리가 잡은 에러 수는 브라우저 안에 있다. 세려면 앱이 서버로 보고하는
  경로가 필요하다. 이것도 후속이다.
- 알림(에러율 임계치 → 슬랙)은 그라파나 알림 규칙으로 걸 수 있는데 인스턴스가 서고 나서
  실제 값 분포를 보고 정한다.

## 후속: 콘솔 작업 중 ASG 태그 필터가 빗나갔다

사용자가 콘솔에서 IAM 롤(plick-front-monitoring-role-prod), 보안그룹(front-monitoring-sg-prod),
모니터링 EC2(front-monitoring-prod)를 만들었다. user data는 문제없이 돌아 컨테이너 둘이
떴는데, 프로메테우스 타깃에 `prometheus` 잡만 있고 프론트 잡 둘이 없었다.

로그에 에러가 한 줄도 없어서 자격 증명 실패는 아니었다. 실패였다면 refresh 단계에서
ERROR가 찍힌다. 설정에 ec2_sd가 실린 것도 API로 확인했고, droppedTargets도 0이었다.
발견은 성공했는데 결과가 0개라는 뜻이라, 모니터링 EC2에 aws CLI를 깔아 같은 롤로 같은
조회를 손으로 돌려 봤다. 필터를 건 조회는 비었고, 필터를 뺀 조회에서 답이 나왔다.

```
i-0a998b838b1a5cb22  192.168.2.149  plick-frontend-asg-prod  CodeDeploy_plick-frontend-dg-prod_d-86V40O0LK
i-09796df509c9f84c8  192.168.4.151  plick-frontend-asg-prod  CodeDeploy_plick-frontend-dg-prod_d-86V40O0LK
```

`aws:autoscaling:groupName` 값이 `plick-frontend-asg-prod`가 아니었다. CodeDeploy Blue/Green은
배포마다 원본 ASG를 복제해 Green을 만들고, 그 복제본 이름을 `CodeDeploy_<배포그룹>_d-<배포ID>`로
짓는다. 트래픽이 넘어가면 Blue를 지우고 복제본이 현역이 된다. 그래서 인스턴스에 붙는 groupName
태그는 배포할 때마다 바뀌고, 내가 콘솔에서 봤던 `plick-frontend-asg-prod`는 ASG 자체가 아니라
Launch Template이 내려 주는 `Name` 태그였다. 사용자도 태그 탭에서 그 값을 보고 "맞다"고 했는데
둘 다 키를 확인하지 않고 값만 본 것이다.

필터를 `tag:Name`으로 바꿨다. Name 태그는 Launch Template의 태그 사양에서 오므로 어느 복제본이
떠도 같다. 인스턴스에서는 `/srv/monitoring/prometheus/prometheus.yml`을 `sed -i`로 고치고
`POST /-/reload`로 반영하려 했는데, 그래도 타깃이 안 나왔다. 컨테이너 안에서 메타데이터
서비스에 닿는지(401이 바로 오면 닿는 것), 로그에 refresh 에러가 있는지까지 다 확인하고 나서야
원인이 보였다. `sed -i`는 파일을 제자리에서 고치는 게 아니라 임시 파일을 쓰고 이름을 바꿔치기해서
inode가 바뀐다. compose가 `prometheus.yml`을 파일 단위로 bind mount해 뒀으니 컨테이너는 옛
inode를 계속 물고 있었고, reload는 옛 설정을 충실히 다시 읽었다. `docker compose up -d
--force-recreate prometheus`로 컨테이너를 다시 만들어 새 파일을 물게 했다. 문서의 설정 갱신
절도 reload가 아니라 재생성으로 고쳤다. `--web.enable-lifecycle`은 제자리 편집(`tee`처럼
truncate해서 쓰는 방식)일 때만 쓸모가 있다.

덤으로 안 것 하나. 콘솔의 Ubuntu 타일 기본값이 24.04가 아니라 26.04(resolute)였다. Docker
공식 저장소에 26.04 채널이 이미 있어서 그대로 깔렸다. 문서엔 24.04로 적어 뒀는데 실제 인스턴스는
26.04다.
