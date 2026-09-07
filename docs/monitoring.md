# 모니터링 (프로메테우스 + 그라파나, prod)

prod 프론트 EC2(ASG)의 Node 서버 지표를 프로메테우스가 긁고 그라파나로 본다.
판단 근거와 시행착오는 [ADR 0130](adr/0130-prometheus-grafana-monitoring.md)에 있다.
여기는 만들고 운영하는 절차만 둔다. 현재 prod에만 적용한다.

## 1. 구성

```
프론트 EC2 (ASG, front-sg-prod)             모니터링 EC2 (front-monitoring-sg-prod)
  pm2 plick-mobile :3001 ─┐                   docker compose
     └─ /metrics :9464 ◄──┼── scrape ◄──── prometheus :9090 (127.0.0.1)
  pm2 plick-web    :3000 ─┤                     └─ ec2_sd (태그로 인스턴스 자동 발견)
     └─ /metrics :9465 ◄──┘                   grafana :3000 (127.0.0.1)
                                                 ▲
                                    노트북 ── SSM 포트 포워딩
```

- 앱 쪽: 각 앱 `instrumentation.ts`의 `register()`가 Node 런타임에서
  `@plick/core/metrics`의 `startMetricsServer`를 불러 Next와 별도 포트에 `/metrics`를
  연다. 포트는 mobile 9464, web 9465(`METRICS_PORT`로 덮어쓸 수 있다). ALB 대상
  그룹에 없는 포트라 인터넷에서 닿지 않는다
- 수집 지표: Node 기본(CPU, 메모리, 이벤트루프 지연, GC), `plick_be_request_total`과
  `plick_be_request_duration_seconds`(서버 프로세스의 apiFetch BE 호출),
  `plick_request_error_total`(Next `onRequestError`)
- 모니터링 EC2: [infra/monitoring/](../infra/monitoring/)의 compose와 설정을 user data로
  실어 첫 부팅에 `docker compose up -d`한다. 프로메테우스는 `ec2_sd_configs`로
  `Name=plick-frontend-asg-prod` 태그의 인스턴스를 60초마다 다시 찾는다.
  `aws:autoscaling:groupName`은 CodeDeploy Blue/Green이 배포마다 ASG를 복제하며
  `CodeDeploy_…_d-<배포ID>`로 바꿔 달아서 필터로 못 쓴다. Blue/Green으로 인스턴스가 통째로 바뀌어도 설정을 안 건드린다
- 그라파나: 데이터 소스와 `PLick Frontend (prod)` 대시보드가 프로비저닝으로 자동 등록된다

## 2. 리포 파일

| 경로                                         | 역할                                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| `packages/core/src/metrics.ts`               | 레지스트리, 카운터·히스토그램, `/metrics` HTTP 서버         |
| `packages/core/src/client.ts`                | `setApiFetchObserver`: apiFetch 결과를 메트릭으로 넘기는 훅 |
| `apps/{mobile,web}/instrumentation.ts`       | 서버 기동 시 메트릭 서버 시작, `onRequestError` 카운트      |
| `infra/monitoring/docker-compose.yml`        | 프로메테우스 + 그라파나                                     |
| `infra/monitoring/prometheus/prometheus.yml` | 스크레이프 잡(ec2_sd)                                       |
| `infra/monitoring/grafana/`                  | 데이터 소스·대시보드 프로비저닝                             |
| `scripts/monitoring/build-user-data.sh`      | 위 폴더를 묶어 EC2 user data 스크립트를 출력                |

## 3. 처음 만들기 (콘솔, prod)

리전은 ap-northeast-2, VPC는 plick-vpc-prod다. 이름 규칙은 ADR 0084를 따른다.

### 3.1 IAM 롤 `plick-front-monitoring-role-prod`

- 신뢰 엔터티: EC2
- 관리형 정책: `AmazonSSMManagedInstanceCore`
- 인라인 정책 `prometheus-ec2-sd` (프로메테우스가 인스턴스 목록을 읽는 권한):

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

### 3.2 보안그룹

- `front-monitoring-sg-prod` 생성 (VPC plick-vpc-prod): 인바운드 없음, 아웃바운드 전체.
  그라파나·프로메테우스는 127.0.0.1에만 바인딩돼 있고 SSM 포트 포워딩으로만 본다
- `front-sg-prod` 인바운드 규칙 추가: TCP 9464-9465, 소스 `front-monitoring-sg-prod`,
  설명 `prometheus scrape`. 이 한 줄이 프라이빗 서브넷 문제의 전부다

### 3.3 user data 만들기

```bash
scripts/monitoring/build-user-data.sh > /tmp/monitoring-user-data.sh
```

출력 파일(약 6KB, 제한 16KB)을 그대로 붙여 넣는다. 안에 infra/monitoring/ 전체가
tar+gzip+base64로 들어 있다.

### 3.4 EC2 생성 `front-monitoring-prod`

- AMI: Ubuntu Server 24.04 LTS (x86_64)
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

두 잡 모두 `health: up`이면 끝이다. `activeTargets`에 프론트 잡이 없으면 3.1 권한이나
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
  HTTP 레벨 지표는 ALB CloudWatch가 정확하고, 그라파나에 CloudWatch 데이터 소스를
  붙이는 건 후속 과제다
- `plick_be_request_total`의 path 라벨은 숫자·UUID 세그먼트를 `:id`로 접는다.
  새 엔드포인트가 다른 형태의 ID를 쓰면 `normalizePath`에 규칙을 더한다
- 인스턴스 안에서 손으로 고친 건 재생성하면 사라진다. 남길 변경은 리포 파일 → user data다
- user data 16KB 제한. `build-user-data.sh` 출력 크기를 확인한다
