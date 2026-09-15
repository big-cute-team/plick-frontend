# 모니터링 (프로메테우스 + 그라파나, prod)

prod 프론트 EC2(ASG)의 Node 서버 지표와 메인 API 서버 지표를 프로메테우스가 긁고 그라파나로 본다. ALB HTTP 지표는 CloudWatch 데이터 소스로 같은
대시보드에 붙이고, 임계치를 넘으면 슬랙으로 알린다.
판단 근거와 시행착오는 [ADR 0130](adr/0130-prometheus-grafana-monitoring.md)과
후속 [ADR 0133](adr/0133-monitoring-followup-cloudwatch-client-errors-alerts.md)에 있다.
여기는 만들고 운영하는 절차만 둔다. 현재 prod에만 적용한다.

## 1. 구성

```
프론트 EC2 (ASG, front-sg-prod)             모니터링 EC2 (front-monitoring-sg-prod)
  pm2 plick-mobile :3001 ─┐                   docker compose
     └─ /metrics :9464 ◄──┼── scrape ◄──── prometheus :9090 (127.0.0.1)
  pm2 plick-web    :3000 ─┤                     └─ ec2_sd (태그로 인스턴스 자동 발견)
     └─ /metrics :9465 ◄──┘                   grafana :3000 (127.0.0.1)
                                                 ▲  ▲
                                    노트북 ── SSM 포트 포워딩  └─ CloudWatch(ALB) 읽기
                                                    슬랙 ◄── 알림 규칙 (웹훅은 SSM 파라미터)
  브라우저 에러 경계 ── POST /api/client-error ──► 앱 라우트 핸들러 → 카운터
  메인 API EC2 (main-sg-prod) /actuator/prometheus :9466 ◄── scrape ◄── prometheus
```

- 앱 쪽: 각 앱 `instrumentation.ts`의 `register()`가 Node 런타임에서
  `@plick/core/metrics`의 `startMetricsServer`를 불러 Next와 별도 포트에 `/metrics`를
  연다. 포트는 mobile 9464, web 9465(`METRICS_PORT`로 덮어쓸 수 있다). ALB 대상
  그룹에 없는 포트라 인터넷에서 닿지 않는다
- 수집 지표: Node 기본(CPU, 메모리, 이벤트루프 지연, GC), `plick_be_request_total`과
  `plick_be_request_duration_seconds`(서버 프로세스의 apiFetch BE 호출),
  `plick_request_error_total`(Next `onRequestError`),
  `plick_client_error_total`(브라우저 에러 경계가 `POST /api/client-error`로 보고한 에러,
  라벨은 `boundary`·`error`)
- ALB 지표: 요청 수·5xx·응답 지연 p95·비정상 호스트 수는 앱 프로세스 밖이라 프로메테우스에
  없다. 그라파나 CloudWatch 데이터 소스가 인스턴스 롤로 `AWS/ApplicationELB`를 읽는다.
  ALB `plick-alb-pub-prod`는 admin 대상 그룹도 같이 물고 있어서 패널은 대상 그룹
  차원(`tg-front-mobile-prod`·`tg-front-web-prod`)으로 거른다. CloudFront가 앞에 있으니
  이 값은 오리진까지 온 요청만이다
- 알림: 그라파나 알림 규칙 2개(BE 호출 에러율, 스크레이프 타깃 down)가 슬랙 웹훅으로
  나간다. 8절
- 모니터링 EC2: [infra/monitoring/](../infra/monitoring/)의 compose와 설정을 user data로
  실어 첫 부팅에 `docker compose up -d`한다. 프로메테우스는 `ec2_sd_configs`로
  `Name=plick-frontend-asg-prod` 태그의 인스턴스를 60초마다 다시 찾는다.
  메인 API 서버(`Name=plick-main-prod`)도 같은 방식으로 긁는다. 백엔드는 스프링 부트라
  포트가 9466이고 경로가 `/actuator/prometheus`인 것만 다르다(KAN-473).
  `aws:autoscaling:groupName`은 CodeDeploy Blue/Green이 배포마다 ASG를 복제하며
  `CodeDeploy_…_d-<배포ID>`로 바꿔 달아서 필터로 못 쓴다. Blue/Green으로 인스턴스가 통째로 바뀌어도 설정을 안 건드린다
- 그라파나: 데이터 소스(Prometheus·CloudWatch), `PLick Frontend (prod)` 대시보드, 알림
  규칙·contact point가 프로비저닝으로 자동 등록된다

## 2. 리포 파일

| 경로                                         | 역할                                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| `packages/core/src/metrics.ts`               | 레지스트리, 카운터·히스토그램, `/metrics` HTTP 서버         |
| `packages/core/src/client.ts`                | `setApiFetchObserver`: apiFetch 결과를 메트릭으로 넘기는 훅 |
| `packages/core/src/metrics-handle.ts`        | 메트릭 핸들 전역 공유 (라우트 핸들러가 꺼내 쓴다)           |
| `packages/core/src/client-error.ts`          | 브라우저 경계 → `reportClientError` (sendBeacon)            |
| `packages/core/src/client-error-handler.ts`  | `POST /api/client-error` 본문 검증과 카운트                 |
| `apps/{mobile,web}/app/api/client-error/`    | 위 핸들러를 내보내는 라우트                                 |
| `apps/{mobile,web}/instrumentation.ts`       | 서버 기동 시 메트릭 서버 시작, `onRequestError` 카운트      |
| `infra/monitoring/docker-compose.yml`        | 프로메테우스 + 그라파나                                     |
| `infra/monitoring/prometheus/prometheus.yml` | 스크레이프 잡(ec2_sd)                                       |
| `infra/monitoring/grafana/`                  | 데이터 소스·대시보드·알림 프로비저닝                        |
| `scripts/monitoring/build-user-data.sh`      | 위 폴더를 묶어 EC2 user data 스크립트를 출력                |

## 3. 처음 만들기 (콘솔, prod)

리전은 ap-northeast-2, VPC는 plick-vpc-prod다. 이름 규칙은 ADR 0084를 따른다.

### 3.1 IAM 롤 `plick-front-monitoring-role-prod`

- 신뢰 엔터티: EC2
- 관리형 정책: `AmazonSSMManagedInstanceCore`
- 인라인 정책 3개. `prometheus-ec2-sd`(프로메테우스가 인스턴스 목록을 읽는 권한),
  `grafana-cloudwatch-read`(그라파나가 ALB 지표를 읽는 권한), `monitoring-ssm-read`
  (user data가 슬랙 웹훅을 읽는 권한). 뒤 둘은 KAN-457에서 추가했다

`prometheus-ec2-sd`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ec2:DescribeInstances", "ec2:DescribeAvailabilityZones"],
      "Resource": "*"
    }
  ]
}
```

`grafana-cloudwatch-read` (그라파나 문서의 CloudWatch 데이터 소스 최소 권한에서 로그 부분을 뺀 것.
`logs:DescribeLogGroups` 하나만 남긴 이유는 데이터 소스 "Save & test"가 로그 그룹 나열까지 해 보기
때문이다. 없어도 지표는 되지만 테스트가 빨갛게 떠서 헷갈린다):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:ListMetrics",
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:DescribeAlarmsForMetric",
        "cloudwatch:DescribeAlarmHistory",
        "ec2:DescribeTags",
        "ec2:DescribeInstances",
        "ec2:DescribeRegions",
        "logs:DescribeLogGroups",
        "tag:GetResources"
      ],
      "Resource": "*"
    }
  ]
}
```

`monitoring-ssm-read`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:ap-northeast-2:<계정ID>:parameter/plick/frontend/monitoring/*"
    }
  ]
}
```

### 3.1.1 SSM 파라미터 (슬랙 웹훅)

슬랙 앱에서 Incoming Webhook을 만들어 URL을 `/plick/frontend/monitoring/prod/slack-webhook`에
SecureString으로 넣는다(기본 키 aws/ssm이면 kms 권한은 필요 없다). user data가 첫 부팅 때
읽어 `/srv/monitoring/.env`에 쓰고 compose가 그라파나 환경변수로 넘긴다. 파라미터가 없어도
그라파나는 뜬다. 자리표시자 URL로 프로비저닝만 통과하고 전송이 실패할 뿐이다.

### 3.2 보안그룹

- `front-monitoring-sg-prod` 생성 (VPC plick-vpc-prod): 인바운드 없음, 아웃바운드 전체.
  그라파나·프로메테우스는 127.0.0.1에만 바인딩돼 있고 SSM 포트 포워딩으로만 본다
- `front-sg-prod` 인바운드 규칙 추가: TCP 9464-9465, 소스 `front-monitoring-sg-prod`,
  설명 `prometheus scrape`. 이 한 줄이 프라이빗 서브넷 문제의 전부다
- `main-sg-prod` 인바운드 규칙 추가: TCP 9466, 소스 `front-monitoring-sg-prod`.
  메인 API 서버를 긁으려면 같은 규칙이 백엔드 쪽에도 있어야 한다. 백엔드가 이미 열어 뒀다

### 3.3 user data 만들기

```bash
scripts/monitoring/build-user-data.sh > /tmp/monitoring-user-data.sh
```

출력 파일(약 11KB, 제한 16KB)을 그대로 붙여 넣는다. 안에 infra/monitoring/ 전체가
tar+gzip+base64로 들어 있다.

### 3.4 EC2 생성 `front-monitoring-prod`

- AMI: Ubuntu Server 26.04 LTS (x86_64). 처음엔 24.04로 적었는데 실제로는 26.04로 만들었다.
  user data는 `VERSION_CODENAME`으로 Docker 저장소를 고르니 버전에 묶이지 않는다
- 유형: t3.small (프로메테우스+그라파나에 2GB면 충분하다)
- 키 페어: 없음 (SSM만 쓴다)
- 네트워크: VPC plick-vpc-prod, 서브넷 pri-svc-a-prod, 퍼블릭 IP 자동 할당 비활성화,
  보안그룹 front-monitoring-sg-prod
- 스토리지: 30GB gp3 (보존 30일 기준 넉넉하다)
- 고급 세부 정보: IAM 인스턴스 프로파일 plick-front-monitoring-role-prod, 사용자 데이터에
  3.3 출력 붙여 넣기
- 태그: Name=front-monitoring-prod

user data는 첫 부팅에만 돈다. Docker apt 저장소와 이미지 pull이 인터넷을 타므로 NAT가
살아 있어야 한다(prod는 plick-nat-prod). 부팅 후 3~5분 기다린다.

### 3.5 앱 배포

메트릭 포트는 앱 코드가 연다. 이 변경이 main에 병합돼 prod 배포가 나가야 9464·9465가
열린다. develop 병합으로 dev에 먼저 나가고, main 병합은 사용자가 한다(CLAUDE.md).
dev에는 모니터링 EC2가 없으니 dev 인스턴스는 포트만 열고 아무도 안 긁는 상태가 된다.
그것으로 문제는 없다.

## 4. 확인

SSM 세션으로 모니터링 EC2에 들어간다(콘솔 → 인스턴스 → 연결 → Session Manager, 또는 아래 CLI).

```bash
sudo docker ps                                        # prometheus·grafana 두 컨테이너 Up
curl -s localhost:9090/api/v1/targets | python3 -m json.tool | grep -E '"job"|"health"'
```

세 잡(`plick-front-mobile`·`plick-front-web`·`plick-main`) 모두 `health: up`이면 끝이다. 그라파나에서 데이터 소스 → CloudWatch → Save & test가
통과하면 3.1의 CloudWatch 권한도 맞은 것이다. `activeTargets`에 프론트 잡이 없으면 3.1 권한이나
Name 태그 값을 의심한다(`sudo docker logs prometheus`에 UnauthorizedOperation이 찍힌다). 타깃은 있는데
down이면 3.2 보안그룹 규칙이거나 아직 앱 배포가 안 나간 것이다. 프론트 인스턴스의
프라이빗 IP로 직접 확인할 수 있다:

```bash
curl -s http://<프론트 프라이빗 IP>:9464/metrics | head
```

## 5. 그라파나 보기 (SSM 포트 포워딩)

노트북에 한 번만 설치한다. 자격 증명은 콘솔에서 만든 IAM 사용자 액세스 키를
`aws configure`로 넣는다.

```bash
brew install awscli session-manager-plugin
```

```bash
aws ssm start-session --region ap-northeast-2 --target <모니터링 인스턴스 ID> \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3000"],"localPortNumber":["3000"]}'
```

세션이 열린 동안 http://localhost:3000 이 그라파나다. 첫 로그인은 admin / admin이고
바로 비밀번호를 바꾸라고 한다. 프로메테우스 UI는 같은 방법으로 9090을 포워딩한다.

## 6. 설정 갱신

스크레이프 잡이나 대시보드를 바꿨을 때. 인스턴스를 새로 만들지 않아도 된다.

```bash
# 노트북: 새 페이로드를 만들어 SSM 세션에 붙여 넣기 좋은 한 줄로 뽑는다
COPYFILE_DISABLE=1 tar -C infra/monitoring -cf - . | gzip -9 | base64 | pbcopy
```

```bash
# 모니터링 EC2(SSM 세션): 붙여 넣어 풀고 재기동
cd /srv/monitoring && echo '<붙여넣기>' | base64 -d | sudo tar -xzf - -C /srv/monitoring
sudo docker compose up -d --force-recreate prometheus   # 프로메테우스 설정 반영
sudo docker compose up -d                                # compose·그라파나 변경 반영
```

슬랙 웹훅을 바꾸거나 이미 떠 있는 인스턴스에 처음 넣을 때는 user data가 다시 안 도니
`.env`를 손으로 쓴다. 값은 세션에 직접 붙여 넣지 말고 인스턴스 안에서 SSM으로 읽는다.

```bash
# 모니터링 EC2(SSM 세션)
cd /srv/monitoring && printf 'SLACK_WEBHOOK_URL=%s\n' "$(aws ssm get-parameter --region ap-northeast-2 \
  --name /plick/frontend/monitoring/prod/slack-webhook --with-decryption \
  --query Parameter.Value --output text)" | sudo tee .env >/dev/null && sudo chmod 600 .env
sudo docker compose up -d --force-recreate grafana
```

`curl -X POST localhost:9090/-/reload`로는 안 된다. `prometheus.yml`이 파일 단위 bind
mount라 tar 풀기나 `sed -i`처럼 파일을 새로 쓰는 편집은 inode가 바뀌어 컨테이너가 옛 파일을
계속 본다. 컨테이너를 다시 만들어야 새 파일을 문다(지표는 named volume이라 남는다).
대시보드 JSON은 프로비저닝 폴더째 마운트라 30초 안에 자동 반영된다. 그라파나 UI에서 고친 대시보드는
JSON을 내보내 리포 파일에 되돌려 놓아야 인스턴스 재생성에서 살아남는다.

## 7. 함정

- 메트릭 포트가 안 열려도 앱은 뜬다. `startMetricsServer`가 listen 에러를 경고로만
  남긴다. 로컬 dev에서 두 dev 서버를 띄우면 mobile과 web이 다른 포트라 충돌은 없다
- BE 호출 카운터는 서버 프로세스가 부른 것만 잡힌다. 브라우저의 `/be` 프록시 fetch는
  Next 리라이트라 apiFetch를 안 지나서 여기 없다. 페이지 요청 수·5xx·지연 같은
  HTTP 레벨 지표는 대시보드 위쪽 ALB 패널(CloudWatch)로 본다
- ALB 패널의 대상 그룹 차원 값(`targetgroup/tg-front-…/<해시>`)은 대시보드 JSON에 박혀
  있다. 대상 그룹을 다시 만들면 해시가 바뀌니 `aws elbv2 describe-target-groups`로
  다시 받아 JSON을 고친다
- 클라 에러 보고 라우트는 인증이 없다. 본문 형태가 어긋나면 `other`로 접고, 라벨 값
  가짓수는 프로세스당 32개까지만 받는다. 새 경계 이름을 많이 늘리면 상한을 같이 올린다
- 로컬 검증에서 그라파나를 브라우저 패널로 열면 TanStack 쿼리가 `paused`로 멈추는 것과
  별개로 패널이 "Loading plugin panel"에 오래 머문다. 값 확인은 `/api/ds/query`로 한다
- `plick_be_request_total`의 path 라벨은 숫자·UUID 세그먼트를 `:id`로 접는다.
  새 엔드포인트가 다른 형태의 ID를 쓰면 `normalizePath`에 규칙을 더한다
- 인스턴스 안에서 손으로 고친 건 재생성하면 사라진다. 남길 변경은 리포 파일 → user data다
- user data 16KB 제한. `build-user-data.sh` 출력 크기를 확인한다

## 8. 알림

규칙과 수신처는 `infra/monitoring/grafana/provisioning/alerting/`에 있고 그라파나 UI에서
못 고친다(파일 프로비저닝은 읽기 전용). 바꾸려면 파일을 고쳐 6절 절차로 반영한다.

| 규칙                 | 식                                                | 조건                 | 지속 |
| -------------------- | ------------------------------------------------- | -------------------- | ---- |
| BE 호출 에러율       | 30분 창 5xx·0 비율, 같은 창 요청 20건 이상일 때만 | 5% 초과              | 5분  |
| 스크레이프 타깃 down | `up{job=~"plick-.*"} == 0`                        | 시리즈가 있으면 발화 | 3분  |

초기값은 2026-09-09 prod 실측(40시간)에서 잡았다. 그때 트래픽이 mobile 0.03 req/s, web
0.09 req/s라 5분 창 비율은 요청 한 건 실패에도 튀었고, 30분 창에 요청 20건 조건을 함께 걸었다.
밤에는 30분에 20건이 안 돼 비율 알림이 꺼진다. 그 시간대 장애는 타깃 down 규칙이 받는다.
타깃 down 식은 `plick-front-.*`가 아니라 `plick-.*`다. 프런트 두 잡뿐 아니라 메인 API 잡도
같이 받으려고 넓혔다(KAN-473). 메인 API가 죽어도 이 슬랙 채널로 온다.
며칠 분포를 더 보고 임계값을 조정한다.

`or … * 0`은 web처럼 5xx 시리즈가 한 번도 안 생긴 앱을 0%로 만들기 위한 것이다. 없으면
나눗셈 결과 자체가 비어 영원히 NoData가 된다. NoData는 OK로 둔다.

Contact point는 슬랙 웹훅 하나(`slack-plick-frontend`)다. 웹훅 URL은 3.1.1의 SSM
파라미터에서 온다. 그라파나 Alerting → Contact points → Test로 전송을 확인한다.
