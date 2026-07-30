# 프론트엔드 배포 운영 문서 (프라이빗 EC2 + ALB + SSM)

web과 mobile을 프라이빗 서브넷의 EC2 한 대에 올리고, 사용자는 퍼블릭 ALB로만 들어오고,
BE 통신은 내부 ALB로만 나가는 구성이다. EC2에 퍼블릭 IP가 없어서 SSH 배포가 불가능하고,
배포와 관리 접속 모두 SSM을 쓴다. 이 문서는 그걸 처음부터 세우는 순서와, 세운 뒤에
운영하는 방법을 담는다. EC2를 한 대 더 세울 때 이 문서만 보고 따라 할 수 있게 쓴다.

초기 구축(퍼블릭 EC2 + SSH 배포 시절)의 배경과 판단은 [ADR 0059](adr/0059-mobile-ec2-deploy.md),
프라이빗 전환과 SSM 배포 전환의 기록은 [ADR 0064](adr/0064-private-ec2-ssm-deploy.md)에 있다.
여기는 "무엇을 어떤 순서로 하는가"만 다룬다.

## 전체 그림

```
브라우저
  │  https://plick.co.kr        https://m.plick.co.kr
  ▼
퍼블릭 ALB (인터넷 노출, ACM 인증서로 TLS 종료)
  │  호스트 헤더로 분기
  ├─ plick.co.kr    → plick-web-tg    → EC2:3000  (pm2 plick-web)
  └─ m.plick.co.kr  → plick-mobile-tg → EC2:3001  (pm2 plick-mobile)
                                          │
                                          │  Next EC2 (프라이빗 서브넷, 퍼블릭 IP 없음)
                                          │  서버 컴포넌트 fetch
                                          │  브라우저 /be/* 프록시
                                          ▼
                                    내부 ALB (프라이빗)
                                          │
                                          ▼
                                    BE EC2 (Spring)
```

배포와 관리 접속에는 SSH가 없다.

```
GitHub Actions
  │ OIDC로 배포 롤 assume (액세스 키 없음)
  ├─ 산출물 tar.gz + release.sh를 S3에 업로드
  └─ SSM send-command → EC2가 S3에서 내려받아 릴리스 교체·헬스체크·롤백
관리 셸은 Session Manager(SSM 세션)로 연다
```

브라우저는 BE를 직접 부르지 않는다. 서버 컴포넌트든 브라우저 fetch든 BE로 나가는 요청의
출발지는 항상 Next EC2다. 그래서 BE는 인터넷에 노출할 필요가 없고 CORS 설정도 필요 없다.

| 앱     | 포트 | 디렉터리            | pm2 이름       | 도메인          |
| ------ | ---- | ------------------- | -------------- | --------------- |
| web    | 3000 | `/srv/plick-web`    | `plick-web`    | `plick.co.kr`   |
| mobile | 3001 | `/srv/plick-mobile` | `plick-mobile` | `m.plick.co.kr` |

## 0단계. 네트워크 전제

시작 전에 갖춰져 있어야 하는 것들이다.

- Next EC2는 프라이빗 서브넷에 있다. 퍼블릭 IP를 붙이지 않는다
- SSM으로 접속이 돼야 한다. EC2에 SSM 에이전트(우분투 AMI 기본 포함)와
  `AmazonSSMManagedInstanceCore` 정책이 붙은 IAM 역할이 필요하고, 프라이빗 서브넷에서
  SSM 엔드포인트에 닿는 경로(NAT 또는 ssm·ssmmessages·ec2messages 인터페이스 엔드포인트)가
  있어야 한다
- Node 설치 같은 아웃바운드 인터넷이 필요하다. NAT 게이트웨이가 그 경로다.
  SSM이 붙는다고 인터넷이 되는 건 아니다. `curl -sI https://deb.nodesource.com | head -1`로
  확인한다
- S3 게이트웨이 엔드포인트를 프라이빗 서브넷의 라우트 테이블에 붙인다(2단계에서 만든다).
  배포 아티팩트를 NAT 요금 없이 내려받는 경로다

## 1단계. DNS를 Route 53으로 옮긴다

가장 먼저 시작해야 한다. 전파에 시간이 걸려서 다른 작업과 병행하는 게 좋다.
이미 옮겨져 있으면 건너뛴다.

### 왜 옮기나

`m.plick.co.kr`은 서브도메인이라 CNAME으로 ALB를 가리키면 끝이다. 문제는 `plick.co.kr`이다.

도메인의 꼭대기를 apex(또는 zone apex)라고 부르는데, DNS 규격상 apex에는 CNAME을 둘 수 없다.
apex에는 SOA와 NS 레코드가 반드시 있어야 하고, CNAME은 같은 이름에 다른 레코드가 있으면
공존하지 못한다는 규칙이 있기 때문이다.

그렇다고 A 레코드에 IP를 박을 수도 없다. ALB는 고정 IP를 주지 않고, 뒤에 있는 IP는 AWS가
스케일이나 장애 조치 과정에서 예고 없이 바꾼다.

Route 53에는 Alias라는 AWS 전용 확장 레코드가 있다. 겉으로는 A 레코드처럼 동작하면서 값으로
ALB를 직접 지정할 수 있다. apex에도 걸리고, ALB의 IP가 바뀌어도 알아서 따라간다. 조회 요금도
없다. apex를 ALB로 보내는 사실상 유일한 정공법이다.

### "옮긴다"가 정확히 무슨 뜻인가

도메인 이전(registrar transfer)이 아니다. 도메인 소유권과 등록기관은 지금 산 곳에 그대로 둔다.
바꾸는 건 네임서버 지정뿐이다.

1. Route 53 → 호스팅 영역 생성 → 도메인 이름 `plick.co.kr`, 유형 퍼블릭
2. 만들어지면 NS 레코드에 네임서버 주소 4개가 나온다. 이걸 복사해 둔다
3. **기존 DNS에 있던 레코드를 Route 53에 먼저 다 옮겨 넣는다.** 메일을 쓰고 있다면 MX,
   각종 소유권 확인용 TXT, 기존에 쓰던 서브도메인 A/CNAME 전부다. 이 단계를 건너뛰면 다음
   단계에서 그 레코드들이 통째로 사라진다. 메일이 안 오는 사고가 여기서 난다
4. 도메인을 산 곳의 콘솔에서 네임서버를 위 4개로 변경한다
5. 전파를 기다린다. 보통 수십 분, 길면 하루 이틀 걸린다

전파 확인은 이렇게 한다.

```bash
dig NS plick.co.kr +short
```

`awsdns`가 들어간 주소 4개가 나오면 넘어간 것이다.

## 2단계. S3와 IAM

배포 경로(러너 → S3 → EC2)의 재료들이다. 전부 콘솔 작업이다.

### 아티팩트 버킷

- S3 → 버킷 만들기, 리전 `ap-northeast-2`, 이름 `plick-deploy-artifacts`
- 글로벌 네임스페이스, ACL 비활성화, 퍼블릭 액세스 전체 차단, 나머지 기본값

버킷 이름을 다르게 지으면 `deploy.yml`의 `DEPLOY_BUCKET` env도 같이 고쳐야 한다.

### S3 게이트웨이 엔드포인트

- VPC → 엔드포인트(엔드포인트 서비스가 아니다) → 엔드포인트 생성
- 서비스 `com.amazonaws.ap-northeast-2.s3` 중 유형이 `Gateway`인 것
- EC2가 있는 VPC 선택, 프라이빗 서브넷의 라우트 테이블 체크

만들면 라우트 테이블에 S3 경로가 자동으로 추가되고, EC2가 NAT 없이 S3에 닿는다. 무료다.

### EC2 인스턴스 역할에 S3 읽기 추가

EC2가 배포 때 tarball을 내려받는 권한이다. 인스턴스에 이미 붙어 있는 역할(SSM용)에
인라인 정책으로 추가한다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::plick-deploy-artifacts/*"
    }
  ]
}
```

### GitHub OIDC 자격 증명 공급자

GitHub Actions가 장수 액세스 키 없이 AWS 롤을 빌려 쓰는 신뢰 연결이다. 계정에 하나만 있으면
되므로, IAM → ID 제공업체 목록에 `token.actions.githubusercontent.com`이 이미 있으면 건너뛴다.

- IAM → ID 제공업체 → 공급자 추가 → OpenID Connect
- 공급자 URL `https://token.actions.githubusercontent.com`, 대상 `sts.amazonaws.com`

### 배포용 롤

- IAM → 역할 생성 → 웹 자격 증명 → 공급자 `token.actions.githubusercontent.com`,
  Audience `sts.amazonaws.com`
- GitHub 조직 `big-cute-team`, 리포지토리 `plick-frontend`, 브랜치 `main`.
  배포가 main에서만 돌므로 main으로 제한한다
- 역할 이름 `plick-frontend-deploy`, 권한은 아래 인라인 정책으로

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::plick-deploy-artifacts/*"
    },
    {
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ec2:ap-northeast-2:<계정ID>:instance/<인스턴스ID>",
        "arn:aws:ssm:ap-northeast-2::document/AWS-RunShellScript"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "ssm:GetCommandInvocation",
      "Resource": "*"
    }
  ]
}
```

`SendCommand`를 인스턴스와 문서 둘 다에 걸어야 한다. SSM은 대상 인스턴스 ARN과 실행 문서
ARN 양쪽에 권한을 요구한다. 만든 역할의 ARN을 복사해 둔다. 다음 단계 시크릿 값이다.

## 3단계. GitHub 시크릿 등록

리포 Settings → Secrets and variables → Actions → Repository secrets.

| 이름                  | 값                                                                 |
| --------------------- | ------------------------------------------------------------------ |
| `AWS_DEPLOY_ROLE_ARN` | 배포용 롤 ARN (`arn:aws:iam::<계정ID>:role/plick-frontend-deploy`) |
| `EC2_INSTANCE_ID`     | 프라이빗 EC2 인스턴스 ID (`i-...`)                                 |
| `API_BASE_URL`        | BE 내부 ALB DNS 이름. 아직 없으면 비워 둔다                        |

예전 SSH 배포 시절의 `EC2_HOST`, `EC2_SSH_KEY`는 더 이상 쓰지 않는다. 남아 있으면 지운다.

`API_BASE_URL`이 비어 있어도 워크플로는 돈다. `next.config.js`에서 빈 문자열이면
`http://localhost:8080`으로 폴백하게 해 뒀다. BE를 부르지 않는 화면은 정상으로 뜬다.

`API_BASE_URL`은 두 군데서 두 시점에 읽힌다는 점이 중요하다.

- 브라우저 fetch가 타는 `/be` 프록시(rewrites)의 목적지: 빌드 때 시크릿 값이
  산출물(`routes-manifest.json`)에 문자열로 굳는다. 바꾸려면 시크릿을 고치고 재배포
- 서버 컴포넌트 fetch의 base: 실행 시점에 EC2의 환경(`shared/.env`)에서 읽는다.
  `.env`에 없으면 `localhost:8080` 폴백이라 기사 상세 같은 서버 fetch 화면이 빈다

그래서 시크릿과 `shared/.env` 양쪽에 같은 값을 넣어야 한다. `.env` 쪽은 4단계에서 넣는다.

## 4단계. EC2에 앱 자리 만들기

접속은 SSM 세션으로 한다. 콘솔 → EC2 → 인스턴스 → 연결 → Session Manager.
(로컬 CLI라면 `aws ssm start-session --target <인스턴스ID>`)

세션은 `ssm-user`로 열리므로 먼저 ubuntu로 전환한다. 이후 작업 전부 ubuntu로 한다.

```bash
sudo su - ubuntu
```

### 런타임 설치

Node 22, pm2, aws CLI 세 가지다. aws CLI는 릴리스 스크립트가 S3에서 tarball을 내려받는 데
쓴다. 우분투에는 기본으로 없다.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo snap install aws-cli --classic
```

### 디렉터리

앱마다 같은 구조를 하나씩 만든다.

```bash
sudo mkdir -p /srv/plick-web/releases /srv/plick-web/shared && sudo chown -R ubuntu:ubuntu /srv/plick-web
sudo mkdir -p /srv/plick-mobile/releases /srv/plick-mobile/shared && sudo chown -R ubuntu:ubuntu /srv/plick-mobile
```

`ubuntu` 소유로 두는 게 중요하다. 릴리스 스크립트가 ubuntu로 실행되며 sudo 없이 파일을 쓴다.

### 환경변수

`/srv/plick-web/shared/.env`

```
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
KAKAO_CLIENT_ID=<카카오 client_id>
GOOGLE_CLIENT_ID=<구글 client_id>
OAUTH_REDIRECT_URI=https://plick.co.kr/oauth/callback
API_BASE_URL=http://<BE 내부 ALB DNS 이름>
```

`/srv/plick-mobile/shared/.env`

```
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
KAKAO_CLIENT_ID=<카카오 client_id>
GOOGLE_CLIENT_ID=<구글 client_id>
OAUTH_REDIRECT_URI=https://m.plick.co.kr/oauth/callback
API_BASE_URL=http://<BE 내부 ALB DNS 이름>
```

`HOSTNAME=0.0.0.0`이 빠지면 127.0.0.1에만 묶여서 ALB가 접속하지 못한다. 헬스체크가 전부
실패하는데 원인이 잘 안 보이니 주의한다.

`API_BASE_URL`은 서버 컴포넌트 fetch가 실행 시점에 읽는 값이다(3단계 참고). 시크릿에
넣은 것과 같은 값을 여기에도 넣는다. 빠지면 `localhost:8080` 폴백이라 기사 상세처럼
서버에서 그리는 화면이 빈다.

### pm2 부팅 자동 기동

```bash
pm2 startup systemd
```

출력으로 나오는 `sudo env PATH=...` 한 줄을 그대로 다시 실행해야 등록이 끝난다.

## 5단계. 첫 배포

배포는 main 푸시에 걸려 있다. develop에서 main으로 병합하면 Deploy 워크플로가 돌면서
두 앱을 동시에 빌드하고, S3에 올리고, SSM으로 EC2에 릴리스한다.

Actions 탭에서 두 잡(`Deploy web`, `Deploy mobile`)이 다 초록인지 확인한다. 실패하면
`Release` 스텝 로그에 서버 쪽 출력이 그대로 찍혀 있다. 헬스체크 실패면 스크립트가 직전
릴리스로 되돌린 뒤 종료하고, 그 사실도 같은 로그에 나온다.

## 6단계. ALB 없이 먼저 확인

EC2에 퍼블릭 IP가 없으므로 밖에서 직접 두드릴 수 없다. SSM 세션 안에서 확인한다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/health
```

둘 다 200이면 빌드부터 릴리스까지 파이프라인 전체가 검증된 것이다. `pm2 list`로 두 프로세스가
online인지도 본다.

이 시점에는 브라우저 확인이 안 된다. ALB와 도메인이 붙은 뒤에 한다.

## 7단계. ACM 인증서

리전은 ALB와 같아야 한다. 서울이면 ap-northeast-2다. CloudFront용으로 us-east-1에 받는 것과
헷갈리지 않는다.

- 도메인 이름: `plick.co.kr`
- 대체 이름(SAN): `*.plick.co.kr` 또는 `m.plick.co.kr`
- 검증 방법: DNS 검증

인증서 하나에 두 이름을 담으면 리스너에 인증서를 하나만 붙이면 된다. 와일드카드
`*.plick.co.kr`은 `m.plick.co.kr`을 커버하지만 apex는 포함하지 않으므로 `plick.co.kr`이
같이 들어 있어야 한다.

Route 53을 쓰고 있으면 검증용 CNAME을 콘솔 버튼 한 번으로 넣을 수 있다. 몇 분이면 발급된다.
호스팅 영역의 `_xxxx.plick.co.kr` CNAME이 그 검증 레코드다. 자동 갱신에 계속 쓰이므로
지우면 안 된다.

## 8단계. 대상 그룹과 퍼블릭 ALB

대상 그룹 두 개를 만든다. 유형은 Instances, 프로토콜은 HTTP. 인스턴스가 프라이빗 서브넷에
있어도 같은 VPC면 그대로 등록된다.

| 이름              | 포트 | 헬스체크 경로 |
| ----------------- | ---- | ------------- |
| `plick-web-tg`    | 3000 | `/api/health` |
| `plick-mobile-tg` | 3001 | `/api/health` |

헬스체크 경로를 `/`로 두면 안 된다. `/`는 서버 컴포넌트가 BE로 fetch를 나가는 화면이라,
BE가 잠깐 흔들려 500이 나오면 ALB가 인스턴스를 대상에서 내려 버린다. BE 장애가 프론트 전면
503으로 번진다. `/api/health`는 BE를 부르지 않고 200만 돌려주도록 만들어 둔 경로다.

로드밸런서는 Application Load Balancer, internet-facing으로 만든다. ALB 자체는 퍼블릭
서브넷에 둔다(서로 다른 AZ 두 개 이상, ALB의 하드 요구사항이다). 대상이 프라이빗 서브넷이어도
상관없다.

리스너 443(HTTPS)에 위 인증서를 붙이고 규칙을 건다.

- Host header = `plick.co.kr` → `plick-web-tg`
- Host header = `m.plick.co.kr` → `plick-mobile-tg`
- 기본 동작: 404 고정 응답

기본 동작을 404로 두면 등록하지 않은 호스트로 들어온 요청이 엉뚱한 앱에 닿지 않는다.

리스너 80(HTTP)은 443으로 리다이렉트한다. 전달이 아니라 리다이렉트다.

`X-Forwarded-Proto`는 ALB가 자동으로 붙여 주므로 따로 설정할 게 없다.

## 9단계. 도메인 연결

Route 53 호스팅 영역에서 레코드 두 개를 만든다. ALB를 다시 만들었으면 기존 레코드를 새 ALB로
수정한다.

- `plick.co.kr` — A 레코드, Alias 켜기, 대상은 퍼블릭 ALB
- `m.plick.co.kr` — A 레코드 Alias(권장) 또는 CNAME으로 ALB DNS 이름

서브도메인은 CNAME도 되지만 Alias로 통일하는 게 관리하기 편하다.

## 10단계. OAuth 콘솔 등록

카카오와 구글 콘솔에 리다이렉트 URI를 등록한다. 도메인이 다르면 별개 URI라 각각 필요하다.

- `https://plick.co.kr/oauth/callback`
- `https://m.plick.co.kr/oauth/callback`

한 글자라도 다르면 프로바이더가 거절한다. 구글은 localhost를 뺀 `http://` URI를 애초에
등록받지 않으므로 HTTPS가 붙은 뒤에 해야 한다. 도메인이 그대로면 재등록할 필요 없다.

여기까지 하면 로그인을 실제로 밟아 볼 수 있다.

## 11단계. 보안그룹

소스는 IP 대역이 아니라 보안그룹 ID로 지정한다. 그래야 인스턴스가 늘거나 IP가 바뀌어도
규칙을 손댈 일이 없다.

| 대상        | 인바운드    | 소스           |
| ----------- | ----------- | -------------- |
| 퍼블릭 ALB  | 80, 443     | `0.0.0.0/0`    |
| Next EC2    | 3000, 3001  | 퍼블릭 ALB SG  |
| BE 내부 ALB | 리스너 포트 | Next EC2 SG    |
| BE EC2      | 8080        | BE 내부 ALB SG |

22번 포트 규칙은 없다. 접속은 SSM이 맡고, SSM은 EC2에서 밖으로 나가는 연결이라 인바운드를
열 필요가 없다. Next EC2 인바운드는 퍼블릭 ALB SG의 3000·3001 두 줄이 전부다.

## BE 내부 ALB가 생기면

1. GitHub 시크릿 `API_BASE_URL`에 내부 ALB의 DNS 이름을 넣는다.
   `http://internal-<이름>-<숫자>.ap-northeast-2.elb.amazonaws.com` 형태다
2. 포트는 ALB 리스너 포트다. BE 앱이 8080이어도 리스너가 80이면 포트를 붙이지 않는다
3. 두 앱의 `shared/.env`에도 같은 값을 넣고 `pm2 restart <앱> --update-env` 한다
4. Actions → Deploy → Run workflow로 재실행한다

프라이빗 IP를 박으면 안 된다. 내부 ALB의 IP도 AWS가 예고 없이 바꾼다. 반드시 DNS 이름을 쓴다.
그 이름은 VPC 안에서만 풀리므로 Actions 러너에서 접속되지 않는 게 정상이다. 빌드 때는 문자열로
박히기만 하고 실제 호출은 EC2에서 일어난다.

## 운영

접속이 필요한 작업은 전부 SSM 세션에서 한다. 세션을 열면 `sudo su - ubuntu`부터 한다.
ssm-user 상태로 pm2를 부르면 ubuntu의 pm2 데몬이 안 보여서 프로세스가 없는 것처럼 나온다.

### 배포 다시 돌리기

Actions → Deploy → Run workflow. 코드 변경 없이 같은 커밋으로 다시 나간다.

### 로그 보기

```bash
pm2 logs plick-mobile --lines 100
```

### 상태 보기

```bash
pm2 list
```

### 수동 롤백

배포는 `releases/<커밋sha>`를 쌓고 `current` 심볼릭 링크를 갈아끼우는 방식이다. 최근 5개가
남아 있으므로 링크만 되돌리면 된다.

```bash
ls -1dt /srv/plick-mobile/releases/*/
```

```bash
ln -sfn /srv/plick-mobile/releases/<되돌릴sha> /srv/plick-mobile/current && pm2 restart plick-mobile --update-env
```

헬스체크 실패로 인한 롤백은 배포 스크립트가 자동으로 한다. 수동 롤백은 배포는 성공했는데
기능이 잘못됐을 때 쓴다.

### 환경변수 바꾸기

런타임 값(`OAUTH_REDIRECT_URI` 등)은 `shared/.env`를 고치고 pm2를 재기동하면 된다.

```bash
pm2 restart plick-mobile --update-env
```

`API_BASE_URL`은 반쪽만 바뀐다. 서버 컴포넌트 fetch는 `.env` + 재기동으로 따라오지만,
`/be` 프록시 목적지는 빌드 산출물에 굳어 있어 시크릿을 고치고 재배포해야 한다. 값이
바뀌면 둘 다 한다.

### 오래된 아티팩트 정리

배포마다 `deploy/<sha>/` 아래 tarball이 S3에 쌓인다. 버킷 관리 → 수명 주기 규칙에서
`deploy/` 접두사에 만료 7일을 걸어 두면 알아서 지워진다. 없어도 동작에는 문제없고
저장 요금만 조금씩 는다.

## 자주 막히는 곳

**Configure AWS credentials 스텝에서 AssumeRole 실패** — 셋 중 하나다. 워크플로에
`permissions: id-token: write`가 있는지, 배포 롤 신뢰 정책의 조직·리포·브랜치가
`big-cute-team/plick-frontend`의 `main`과 정확히 일치하는지, ID 제공업체 Audience가
`sts.amazonaws.com`인지 순서대로 본다.

**Release 스텝에서 SSM 명령이 Failed** — 스텝 로그에 서버 stdout·stderr가 같이 찍힌다.
`aws: command not found`면 EC2에 aws CLI가 없는 것이고(`sudo snap install aws-cli --classic`),
S3 403이면 인스턴스 역할에 `s3:GetObject`가 없거나 버킷 이름이 다른 것이다.

**SSM 명령이 Pending에서 안 넘어감** — EC2의 SSM 에이전트가 매니저에 안 붙어 있는 것이다.
Systems Manager → 플릿 매니저에서 인스턴스가 관리형으로 보이는지, 프라이빗 서브넷에서 SSM
엔드포인트로 나가는 경로(NAT나 인터페이스 엔드포인트)가 살아 있는지 본다.

**pm2 프로세스가 안 보이거나 이중으로 뜸** — root로 pm2를 건드린 것이다. 배포는 ubuntu의
pm2 데몬을 쓴다. SSM 세션에서 `sudo su - ubuntu`를 빼먹고 pm2를 실행하면 ssm-user나 root
쪽에 데몬이 하나 더 생긴다. `sudo pm2 kill`로 엉뚱한 데몬을 정리하고 ubuntu로 다시 본다.

**대상 그룹이 계속 unhealthy** — `HOSTNAME=0.0.0.0`이 `.env`에 있는지, 보안그룹에서 ALB SG가
3000/3001에 들어올 수 있는지, 헬스체크 경로가 `/api/health`인지 순서대로 본다.

**CSS와 이미지가 전부 404** — standalone 산출물에 `.next/static`과 `public`이 안 들어간
것이다. 워크플로의 `Assemble standalone` 스텝을 확인한다.

**서버에서 그리는 화면(기사 상세 등)만 비어 있음** — `shared/.env`에 `API_BASE_URL`이
없어 `localhost:8080` 폴백으로 도는 것이다. 클라 fetch 화면(피드·릴스)은 `/be` 프록시라
멀쩡해서 더 헷갈린다. `.env`에 넣고 pm2를 재기동한다.

**BE 데이터 화면이 전부 비어 있음** — Next EC2에서 BE 내부 ALB로 못 닿는 것이다. SSM
세션에서 직접 curl로 확인한다. 열에 아홉은 BE ALB 보안그룹에 Next EC2 SG가 안 들어가
있다.

**로그인 성공인데 계속 로그아웃 상태** — http로 접근 중일 가능성이 높다. 인증 쿠키가
프로덕션에서 `secure: true`라 https가 아니면 브라우저가 버린다.

**배포는 성공인데 옛날 코드가 보임** — 브라우저 캐시이거나 `current` 링크가 안 바뀐 것이다.
`readlink /srv/plick-mobile/current`로 확인한다.

**ACM 인증서 발급이 안 끝남** — 검증용 CNAME이 실제 DNS에 반영됐는지 확인한다. Route 53으로
옮기는 중이라면 네임서버 전파가 먼저 끝나야 한다.
