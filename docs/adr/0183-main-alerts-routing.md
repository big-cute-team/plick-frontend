# 0183. 모니터링 서버에 main 서버 알림 길을 낸다

KAN-601. 2026-10-06.

## 무슨 일이었나

10-06 오후에 main API 서버 두 대가 함께 느려졌다. 1분 최대 응답이 12.9초까지 갔다. 그런데 프로메테우스에
있는 main 지표로는 원인이 안 보였다. JVM 프로세스 CPU는 1%였고 GC 정지 비율도 1% 안쪽이었다.
원인은 CloudWatch의 EBS 지표에서 나왔다. 평소 시간당 9GB이던 디스크 읽기가 270GB로 뛰어 있었다.
1GB 인스턴스의 메모리가 바닥나서 커널이 실행 코드 페이지를 내쫓았다가 다시 읽기를 반복한 것이다.
main 지표는 JVM 안만 본다. 머신 메모리, 페이지 폴트, 디스크 IO는 수집하는 곳이 없었다.

같은 날 하나가 더 보였다. `/api/v1/matches`가 4일째 요청마다 502였는데 알림이 한 번도 안 왔다.
CloudWatch의 앱 5xx 알람은 5분에 5건 기준이었고, 이 API는 5분에 3~4건씩 실패했다.

백엔드 쪽에서 KAN-601로 호스트 지표 수집, 알림 규칙, 장애 분석 대시보드를 만들었다. 대부분은
plick-infra(`observability/`)와 plick-backend에 있고, 이 리포에는 모니터링 서버 설정의 정본이 있어서
세 군데를 고쳤다.

## 한 일

### 호스트 지표 수집 잡

`prometheus.yml`에 `plick-main-node` 잡을 더했다. main 인스턴스의 node_exporter(9100)를 긁는다.
찾는 방식은 `plick-main` 잡과 같다. Name 태그 `plick-main-prod`로 EC2 서비스 디스커버리를 하고, 포트만
9100이고, 경로는 기본값 `/metrics`라 적지 않았다. 설치는 plick-backend의 CodeDeploy 훅이 하고,
`main-sg-prod`의 9100 인바운드는 plick-infra Terraform이 연다.

### 라우팅

main 알림은 같은 슬랙 웹훅으로 가되 메시지 틀이 다르다. 제목이 `[PLick main 심각]`, `[PLick main 주의]`로
시작하고, 본문에 원인 후보와 먼저 볼 것, 장애 분석 대시보드의 해당 패널 링크가 붙는다. 수신처와 규칙은
plick-infra의 `plick-main.yml` 한 파일에 있고 모니터링 서버의 같은 프로비저닝 폴더에 함께 둔다.

라우팅만 이 리포의 `contact-points.yml`에 넣었다. 그라파나는 조직당 정책 트리를 하나만 받는다.
정책을 두 파일에 나눠 두면 한쪽이 다른 쪽을 덮는다. 그래서 기존 루트 정책 아래에 자식 경로 두 개를 달았다.

| 라벨             | 수신처                             | 묶음과 반복                                                                                   |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `team=main`      | `slack-plick-main`                 | 알림 이름으로 묶는다. 두 대가 같이 울리면 한 메시지에 `(2건)`으로 온다. 4시간마다 다시 보낸다 |
| `team=heartbeat` | `heartbeat-plick-monitoring`(웹훅) | 3분마다 다시 보낸다                                                                           |

수신처 이름을 다른 파일에서 참조해도 되는지는 그라파나 12.1.0을 로컬에서 같은 프로비저닝 폴더로 띄워
확인했다. 알림 프로비저닝은 모든 파일의 수신처를 먼저 등록하고 정책을 나중에 적용해서, 정책 파일에 없는
수신처 이름도 잡힌다.

### 하트비트

모니터링 서버는 한 대다. 이 서버나 그라파나가 멈추면 그라파나 알림이 전부 조용해지는데, 그걸 알려 줄
곳이 없었다. 그래서 그라파나에 항상 울리는 규칙을 하나 두고, 그 알림을 Lambda 함수 URL로 보낸다.
Lambda는 받을 때마다 CloudWatch 지표를 하나 남기고, 지표가 15분 끊기면 CloudWatch 알람이 그라파나와
상관없는 SNS 경로로 슬랙에 알린다.

함수 URL은 인증 없이 열려 있어서 Bearer 토큰으로 거른다. 토큰은 Terraform이 만들어 SSM
`/plick/frontend/monitoring/prod/heartbeat-token`에 넣는다. 모니터링 서버 롤이 읽을 수 있는 경로가
`/plick/frontend/monitoring/*`라 그 아래에 뒀다. compose에 `HEARTBEAT_TOKEN`을 넘기는 줄을 더했고,
user data가 슬랙 웹훅과 같은 방식으로 이 값을 읽어 `.env`에 쓴다. 값이 비어도 그라파나는 뜬다.
하트비트만 401로 거절되고, 그러면 15분 뒤 하트비트 알람이 울려서 빠진 걸 알게 된다.

## 서버와 리포가 어긋나 있던 것

설정을 올리기 전에 서버의 `/srv/monitoring`과 이 리포를 비교했더니 두 파일이 달랐다.

- `docker-compose.yml`: 서버에는 그라파나를 사설 IP에도 바인딩하고 `GF_SERVER_ROOT_URL`을 둔 변경이
  있었다. 9-28에 `grafana.plick.co.kr`을 열면서 서버에서만 고친 것이다(plick-infra `grafana_access.tf`).
  리포에 옮겼다. 안 옮기면 모니터링 서버를 다시 만들 때 그라파나 주소가 사라지고, 알림의 대시보드 링크도
  `localhost:3000`으로 나간다.
- `rules.yml`: 서버의 타깃 down 규칙은 `plick-front-.*`, 리포는 `plick-.*`였다(ADR 0136에서 넓힌 것).
  이번에는 서버 쪽으로 맞췄다. main 잡은 이제 `plick-main.yml`의 규칙이 따로 보고, 넓힌 채로 두면
  node_exporter가 깔리기 전(main 운영 릴리스 전) 9100 타깃이 down이라 이 규칙이 계속 울린다. 요약 문구의
  `humanizePercentage`도 서버 쪽 것을 옮겼다. 그라파나 템플릿에는 `mul`이 없어서 원래 식은 값을 못 그린다.

user data payload는 13,310바이트가 됐다. 한도는 16KB이고 ADR 0136에서 적은 11KB보다 늘었다.
main 알림 파일과 대시보드는 plick-infra에 있어서 payload에 안 들어간다. 대신 서버를 새로 만들면 그 파일들은
plick-infra의 `push_to_monitoring.py`로 다시 올려야 한다.

## 검증

- `promtool check config`로 `prometheus.yml` 문법을 확인했다.
- 그라파나 12.1.0을 로컬 도커로 띄워 이 리포의 `contact-points.yml`, `rules.yml`과 plick-infra의
  `plick-main.yml`을 같은 폴더에 넣었다. 프로비저닝 오류 없이 규칙 32개(프런트 2개, main 30개)가 올라왔고, 슬랙 웹훅 자리에
  로컬 수신기를 두어 `[PLick main 심각] API 5xx 비율 높음` 메시지와 하트비트(Bearer 토큰 포함)가 각각의
  경로로 가는 것을 받아 봤다.
- 운영 모니터링 서버에 올린 뒤 그라파나 로그에 프로비저닝 오류가 없었고, 하트비트가 Lambda에 도착해
  CloudWatch 지표가 찍혔다. `plick-main-node` 타깃 두 개는 `connection refused`로 down이다. 보안그룹은
  열려 있고 node_exporter가 아직 없다는 뜻이다.

## 남은 것

- node_exporter는 plick-backend 운영 릴리스 뒤에 깔린다. 그 뒤 `plick-main-node` 타깃이 up이 되는지 본다.
- 모니터링 서버를 다시 만들 때 plick-infra 파일을 다시 올리는 절차를 user data에 넣을지는 정하지 않았다.
  리포가 프라이빗이라 인스턴스가 받아 올 길이 없고, payload에 넣으면 16KB 한도를 넘는다.
