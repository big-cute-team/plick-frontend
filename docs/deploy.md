# 프라이빗 EC2에 Next.js 프론트 배포하기 (ALB + SSM + GitHub Actions)

> ⚠️ 이 문서는 배포 v1의 기록이다. 지금 운영 중인 배포는 Launch Template + ASG +
> CodeDeploy Blue/Green의 v2이고, 현행 구조와 운영 절차는
> [deploy-v2.md](deploy-v2.md)를 본다. v1 경로(단일 EC2 + SSM Run Command)는
> 2026-08-03에 정리했다. 인스턴스는 종료했고 release.sh는 리포에서 삭제했으며
> OIDC 롤의 SSM 권한과 `EC2_INSTANCE_ID` 시크릿도 제거했다. 이 글은 ALB·대상
> 그룹·ACM·Route 53·보안그룹처럼 v2가 그대로 물려받은 기반의 세팅 기록이자,
> 프라이빗 EC2 한 대에 처음부터 세우는 절차의 참고 자료로 남긴다.

프리미어리그 이적 루머 서비스 PLick의 프론트엔드(web + mobile, Next.js 두 앱)를
프라이빗 서브넷의 EC2 한 대에 올린 전 과정을 기록한다. 사용자는 퍼블릭 ALB로만
들어오고, 백엔드 통신은 내부 ALB로만 나가고, EC2에는 퍼블릭 IP도 SSH도 없다.
배포와 관리 접속은 전부 SSM으로 한다.

이 글은 "프라이빗 EC2 인스턴스를 띄운 직후"에서 시작한다. VPC, 서브넷, NAT,
퍼블릭 ALB와 내부 ALB, 그리고 인스턴스 자체는 이미 있다고 전제한다.
같은 구성을 EC2 한 대에 또 세워야 해서, 이 글만 보고 처음부터 끝까지 따라 할 수
있게 하는 게 목표다. 중간에 실제로 막혔던 지점들은 그 자리에 함정으로 표시했다.

작업 배경과 판단, 시행착오의 회고는 [ADR 0059](adr/0059-mobile-ec2-deploy.md)(초기
퍼블릭 EC2 시절)와 [ADR 0064](adr/0064-private-ec2-ssm-deploy.md)(프라이빗 전환)에 있다.

## 전체 그림

먼저 완성된 모습부터.

```
브라우저
  │  https://plick.co.kr        https://m.plick.co.kr
  ▼
퍼블릭 ALB (인터넷 노출, ACM 인증서로 TLS 종료)
  │  호스트 헤더로 분기
  ├─ plick.co.kr    → tg-front-web    → EC2:3000  (pm2 plick-web)
  └─ m.plick.co.kr  → tg-front-mobile → EC2:3001  (pm2 plick-mobile)
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

배포는 이렇게 흐른다. SSH가 어디에도 없다.

```
GitHub Actions (main 푸시)
  │ OIDC로 배포 롤 assume — 액세스 키 없음
  ├─ 두 앱을 빌드해 tar.gz + release.sh를 S3에 업로드
  └─ SSM send-command → EC2가 S3에서 내려받아 릴리스 교체·헬스체크·롤백
관리 셸이 필요하면 Session Manager(SSM 세션)로 연다
```

왜 이 모양인가.

- EC2가 프라이빗이니 러너가 ssh/scp로 닿을 방법이 없다. 배스천을 두는 방법도
  있지만 지키고 패치할 서버만 한 대 늘어난다. SSM은 에이전트가 EC2 안에서 밖으로
  나가 붙는 구조라 인바운드 포트를 하나도 안 열고 명령을 넣을 수 있다
- 브라우저는 BE를 직접 부르지 않는다. 서버 컴포넌트 fetch든 브라우저 fetch(`/be`
  프록시)든 BE로 나가는 요청의 출발지는 항상 Next EC2다. 그래서 BE는 인터넷에
  노출할 필요가 없고 CORS 설정도 필요 없다

| 앱     | 포트 | 디렉터리            | pm2 이름       | 도메인          |
| ------ | ---- | ------------------- | -------------- | --------------- |
| web    | 3000 | `/srv/plick-web`    | `plick-web`    | `plick.co.kr`   |
| mobile | 3001 | `/srv/plick-mobile` | `plick-mobile` | `m.plick.co.kr` |

## 준비물 확인

시작 전에 이미 있어야 하는 것들. 하나라도 없으면 여기서 먼저 채운다.

- 프라이빗 서브넷의 EC2 (우분투, 퍼블릭 IP 없음)
- 인스턴스에 IAM 역할이 붙어 있고 `AmazonSSMManagedInstanceCore` 정책이 있다.
  콘솔 → EC2 → 인스턴스 → 인스턴스 선택 → 보안 탭 → IAM 역할에서 확인한다.
  이 역할 이름을 적어 둔다 (뒤에서 권한을 추가한다)
- 프라이빗 서브넷에서 SSM으로 나가는 경로 (NAT 또는 ssm·ssmmessages·ec2messages
  인터페이스 엔드포인트). 콘솔에서 인스턴스 → 연결 → Session Manager 버튼이
  활성화돼 있으면 붙는 것이다
- 퍼블릭 ALB와 내부 ALB
- Route 53 호스팅 영역 (도메인 네임서버가 Route 53을 보고 있는 상태)

인스턴스 ID(`i-...`)도 지금 복사해 둔다. EC2 → 인스턴스 목록에서 퍼블릭 IPv4
주소가 비어 있는 게 프라이빗 인스턴스다.

> 📷 EC2 인스턴스 상세 — 보안 탭의 IAM 역할

## 1단계. SSM 세션으로 들어가서 서버 준비

### 세션 열기

콘솔 → EC2 → 인스턴스 → 인스턴스 선택 → 우상단 "연결" → Session Manager 탭 →
연결. 브라우저에 터미널이 뜬다. (로컬에 AWS CLI가 있으면
`aws ssm start-session --target i-xxxx`도 같다.)

> 📷 Session Manager 연결 화면

⚠️ 세션은 `ssm-user`로 열린다. 배포 관련 파일과 pm2는 전부 `ubuntu` 소유로 갈
것이므로, 들어가자마자 전환한다. 이걸 잊고 ssm-user나 root로 pm2를 만지면
pm2 데몬이 유저별로 하나씩 더 떠서 "분명 배포했는데 pm2 list에 아무것도 없는"
사고가 난다.

```bash
sudo su - ubuntu
```

이후 서버에서 하는 모든 작업은 이 상태(ubuntu)가 기준이다.

### 아웃바운드 인터넷 확인

⚠️ SSM이 붙는 것과 인터넷이 되는 건 별개다. SSM은 VPC 엔드포인트로도 붙을 수
있어서, Node 설치 같은 아웃바운드는 NAT가 따로 있어야 한다. 제일 먼저 확인한다.

```bash
curl -sI --max-time 5 https://deb.nodesource.com | head -1
```

`HTTP/2 200` 류가 나오면 통과. 타임아웃이면 NAT부터 해결해야 다음이 없다.

### 런타임 설치

Node 22, pm2, aws CLI 세 가지. aws CLI는 릴리스 스크립트가 S3에서 산출물을
내려받는 데 쓴다. 우분투에 기본으로 없어서 깜빡하기 쉽다.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo snap install aws-cli --classic
node -v && pm2 -v && aws --version
```

### 앱 디렉터리

앱마다 같은 구조를 만든다. `releases/`에 배포본이 쌓이고 `shared/`에 환경변수가
산다. 배포는 `releases/<커밋sha>`를 만들고 `current` 심볼릭 링크를 갈아끼우는
방식이라, 롤백이 링크 되돌리기 한 줄이 된다.

```bash
sudo mkdir -p /srv/plick-web/releases /srv/plick-web/shared && sudo chown -R ubuntu:ubuntu /srv/plick-web
sudo mkdir -p /srv/plick-mobile/releases /srv/plick-mobile/shared && sudo chown -R ubuntu:ubuntu /srv/plick-mobile
```

`ubuntu` 소유가 중요하다. 릴리스 스크립트가 ubuntu로 실행되며 sudo 없이 파일을 쓴다.

### 환경변수 파일

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

여기서 함정 둘.

⚠️ `HOSTNAME=0.0.0.0`이 빠지면 Next가 127.0.0.1에만 묶여서 ALB가 접속하지 못한다.
나중에 대상 그룹 헬스체크가 전부 unhealthy로 뜨는데 원인이 잘 안 보인다.

⚠️ `API_BASE_URL`은 두 자리에서 두 시점에 읽힌다. 이걸 몰라서 실제로 반나절을 썼다.

- 브라우저 fetch가 타는 `/be` 프록시(next.config의 rewrites) 목적지: 빌드 때
  GitHub 시크릿 값이 산출물(`routes-manifest.json`)에 문자열로 굳는다. 바꾸려면
  시크릿을 고치고 재배포
- 서버 컴포넌트 fetch의 base: 실행 시점에 EC2 환경(`shared/.env`)에서 읽는다.
  여기 없으면 `localhost:8080` 폴백으로 돌아서, 클라 fetch 화면(피드)은 멀쩡한데
  서버에서 그리는 화면(홈 핫이슈, 기사 상세)만 비는 반쪽 장애가 난다

그래서 시크릿과 `.env` 양쪽에 같은 값이 있어야 한다. 내부 ALB의 DNS 이름은
콘솔 → EC2 → 로드 밸런서 → 내부 ALB 선택 → 세부 정보의 "DNS 이름"이다.
`internal-...ap-northeast-2.elb.amazonaws.com` 형태이고, 앞에 `http://`를 붙이고
끝에 슬래시는 붙이지 않는다. 포트는 내부 ALB 리스너 포트 기준이다 (BE 앱이
8080이어도 리스너가 80이면 포트를 안 붙인다). 프라이빗 IP를 박으면 안 된다.
내부 ALB의 IP도 AWS가 예고 없이 바꾼다.

### pm2 부팅 자동 기동

인스턴스가 재부팅돼도 앱이 스스로 뜨게 등록한다.

```bash
pm2 startup systemd
```

⚠️ 이 명령의 출력 마지막에 `sudo env PATH=... pm2 startup systemd -u ubuntu ...`
한 줄이 나온다. 그걸 그대로 복사해 다시 실행해야 등록이 끝난다. 출력만 보고
넘어가면 등록이 안 된 것이다.

## 2단계. S3와 IAM — 배포 경로의 재료

배포는 "러너 → S3 → EC2" 순서로 흐른다. 그 경로의 재료를 콘솔에서 만든다.
이 단계에서 계정 ID가 계속 필요하니 콘솔 우상단 계정 메뉴에서 12자리 숫자를
복사해 둔다.

### 아티팩트 버킷

배포 산출물이 사는 곳이다. 우리는 BE와 버킷 하나(`plick-deploy`)를 같이 쓰고 팀별로
최상위 접두사를 나눈다. 프론트 몫이 `frontend/`이고, 키는
`frontend/<커밋sha>/{web,mobile}.tar.gz`와 `release.sh`다. S3의 폴더는 실제 디렉터리가
아니라 키 접두사라, 버킷에 폴더를 미리 만들 필요는 없다. 첫 업로드가 곧 폴더다.

버킷이 이미 있으면 이 단계는 접두사 합의로 끝이다. 새로 만든다면 콘솔 검색창에
S3 → 버킷 만들기:

- 리전: `ap-northeast-2` (서울)
- 버킷 네임스페이스: "글로벌 네임스페이스" 선택. ⚠️ 요즘 콘솔은 "계정 리전
  네임스페이스(권장)"를 권하는데, 그쪽은 버킷 주소와 ARN 형식이 달라서 아래
  IAM 정책의 `arn:aws:s3:::버킷명` 표기나 `s3://버킷명/...` CLI 경로와 안 맞는다.
  클래식(글로벌)으로 간다
- 이름: `plick-deploy` (글로벌 유일이라 누가 선점했으면 다르게 짓고, 이후 모든
  정책과 워크플로의 버킷 이름을 같이 바꾼다)
- 객체 소유권 "ACL 비활성화됨(권장)", 퍼블릭 액세스 전체 차단 유지, 나머지 기본값

버킷 이름과 접두사는 `deploy.yml`의 `DEPLOY_BUCKET`·`DEPLOY_PREFIX` env가 단일
출처다. 바꾸면 IAM 정책 두 개(아래)의 Resource도 같이 바꾼다.

> 📷 버킷 만들기 — 네임스페이스 선택 화면

### S3 게이트웨이 엔드포인트

프라이빗 EC2가 NAT를 거치지 않고 S3에 직접 닿는 통로다. 무료고, 배포마다
tarball이 NAT를 통과하며 나가는 처리 요금을 아낀다.

콘솔 검색창에 VPC → 왼쪽 메뉴 "엔드포인트" → 우상단 "엔드포인트 생성".

⚠️ 왼쪽 메뉴에 "엔드포인트 서비스"라는 비슷한 이름이 바로 옆에 있다. 그건 내
서비스를 다른 계정에 노출하는 PrivateLink 판매자용 화면이라 전혀 다른 물건이다.
로드밸런서를 고르라는 화면이 나오면 잘못 들어온 것이다.

- 이름 태그: `plick-s3-gateway`
- 서비스 검색에 `s3` → `com.amazonaws.ap-northeast-2.s3` 중 유형이 `Gateway`인 것
  (Interface짜리 말고)
- VPC: EC2가 있는 VPC
- 라우트 테이블: 프라이빗 서브넷에 연결된 것 체크. 어느 게 프라이빗 것인지
  헷갈리면 EC2 → 인스턴스 → 네트워킹 탭에서 서브넷 ID를 보고, VPC → 서브넷에서
  그 서브넷의 라우트 테이블 탭을 열면 ID가 나온다
- 정책 "전체 액세스" 기본값 → 생성

> 📷 엔드포인트 생성 — Gateway 유형 s3 선택

### EC2 인스턴스 역할에 S3 읽기 추가

배포 때 EC2가 버킷에서 산출물을 내려받는 권한이다.

콘솔 검색창에 IAM → 왼쪽 "역할" → 준비물에서 적어 둔 EC2의 역할 검색 → 클릭 →
권한 탭 → 권한 추가 → 인라인 정책 생성 → JSON 탭:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::plick-deploy/frontend/*"
    }
  ]
}
```

정책 이름 `plick-deploy-s3-read` → 생성.

### GitHub OIDC 자격 증명 공급자

GitHub Actions가 장수 액세스 키 없이 AWS 롤을 빌려 쓰게 하는 신뢰 연결이다.
워크플로가 돌 때마다 GitHub이 서명한 단기 토큰을 STS에 내밀고 몇 분짜리 자격을
받아 온다. 키를 시크릿에 박아 두는 방식은 유출되면 끝이라 처음부터 배제했다.

⚠️ 한국어 콘솔에서 이 메뉴 이름은 "자격 증명 공급자"가 아니라 IAM 왼쪽 메뉴의
"ID 제공업체"다. 이름 때문에 못 찾고 헤맸다.

IAM → ID 제공업체 → 목록에 `token.actions.githubusercontent.com`이 이미 있으면
이 단계는 건너뛴다. 없으면 "공급자 추가":

- 공급자 유형: OpenID Connect
- 공급자 URL: `https://token.actions.githubusercontent.com`
- 대상(Audience): `sts.amazonaws.com`

### 배포용 롤

IAM → 역할 → 역할 생성.

- 신뢰할 수 있는 엔터티 유형: 웹 자격 증명(Web identity)
- 자격 증명 공급자: `token.actions.githubusercontent.com`, Audience: `sts.amazonaws.com`
- GitHub 조직: `big-cute-team`, 리포지토리: `plick-frontend`, 브랜치: `main`
  (배포가 main 푸시에만 걸려 있으니 main으로 제한)

⚠️ 리포지토리 이름은 지금 GitHub에 보이는 이름이어야 한다. 우리는 리포가
`frontend`에서 `plick-frontend`로 개명된 상태였는데 로컬 git remote가 옛 이름을
물고 있어서 신뢰 정책에 옛 이름을 넣을 뻔했다. OIDC 토큰의 sub 클레임은 현재
이름으로 나오므로, 옛 이름으로 만들면 Configure AWS credentials 스텝에서
AssumeRole이 실패한다.

- 권한 정책은 붙이지 말고 넘어가서 역할 이름 `plick-frontend-deploy`로 생성
- 만든 역할 → 권한 탭 → 인라인 정책 생성 → JSON (`<계정ID>`, `<인스턴스ID>` 교체):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::plick-deploy/frontend/*"
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

`SendCommand`의 Resource가 두 줄인 게 눈에 밟히는데, SSM은 "누구에게"(인스턴스
ARN)와 "무엇을"(실행 문서 ARN) 양쪽에 권한을 요구한다. 하나만 걸면 거부된다.

정책 이름 `plick-frontend-deploy-policy` → 생성. 역할 요약 화면 상단의
ARN(`arn:aws:iam::<계정ID>:role/plick-frontend-deploy`)을 복사해 둔다.

> 📷 배포 롤 — 신뢰 관계 탭의 조건(sub 클레임)

## 3단계. GitHub 시크릿

리포 Settings → Secrets and variables → Actions → Repository secrets.

| 이름                  | 값                                                                  |
| --------------------- | ------------------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN` | 위에서 복사한 배포 롤 ARN                                           |
| `EC2_INSTANCE_ID`     | 프라이빗 EC2 인스턴스 ID (`i-...`)                                  |
| `API_BASE_URL`        | BE 내부 ALB DNS 이름 (`.env`에 넣은 것과 같은 값). 없으면 비워 둔다 |

예전 SSH 배포 시절의 `EC2_HOST`, `EC2_SSH_KEY`가 남아 있으면 지운다.

`API_BASE_URL`이 비어 있어도 워크플로는 돈다. `next.config.js`에서 빈 문자열이면
`localhost:8080` 폴백이라 BE를 부르지 않는 화면은 정상으로 뜬다. 참고로 폴백 처리가
`??`가 아니라 `||`인 이유가 있다. GitHub Actions는 없는 시크릿을 undefined가 아니라
빈 문자열로 넘긴다.

## 4단계. 배포 파이프라인 이해하기

이 시점에 리포에는 이미 워크플로(`.github/workflows/deploy.yml`)와 릴리스
스크립트(`scripts/deploy/release.sh`)가 있다. 새로 세우는 입장에서는 시크릿만
채우면 되지만, 무엇이 왜 그렇게 생겼는지는 알아야 문제가 생겼을 때 손을 댈 수 있다.

러너 쪽(deploy.yml) 흐름:

1. main 푸시에 트리거. web과 mobile 두 잡이 매트릭스로 동시에 돈다
2. 러너(ubuntu x86_64)에서 빌드한다. 산출물에 sharp 같은 플랫폼 종속 네이티브
   바이너리가 딸려 들어가서, 맥에서 빌드한 걸 올리면 EC2에서 깨진다
3. standalone 산출물에 `.next/static`과 `public/`을 손으로 채워 tar로 만다.
   standalone은 CDN 배포를 전제로 이 둘을 안 담기 때문에, 빠뜨리면 CSS와 이미지가
   전부 404다
4. OIDC로 배포 롤을 assume한다 (`aws-actions/configure-aws-credentials`).
   워크플로에 `permissions: id-token: write`가 있어야 토큰이 발급된다
5. tarball과 release.sh를 `s3://plick-deploy/frontend/<커밋sha>/`에 올린다. 스크립트도 매번
   같이 올리므로 EC2에 미리 둘 필요가 없고, 항상 그 커밋의 스크립트가 실행된다
6. `aws ssm send-command`로 EC2에 명령을 넣는다. 명령 내용은 "S3에서 release.sh를
   받아 ubuntu로 실행해라"
7. `send-command`는 비동기라 CommandId만 돌려주고 끝난다. 그래서
   `get-command-invocation`을 5초 간격으로 폴링해 끝날 때까지 기다리고, 서버
   stdout을 스텝 로그에 그대로 찍고, Success가 아니면 stderr까지 찍고 exit 1 한다.
   이게 없으면 서버에서 헬스체크가 실패해 롤백이 돌아도 Actions는 초록불이다

서버 쪽(release.sh) 흐름:

1. flock으로 릴리스 전체를 직렬화한다 (아래 함정 참고)
2. S3에서 tarball을 내려받아 `releases/<sha>`에 푼다
3. `shared/.env`를 소싱하고 `current` 링크를 새 릴리스로 바꾼다
4. pm2로 재기동하고, `/api/health`가 200을 줄 때까지 최대 40초 기다린다
5. 실패하면 `current`를 직전 릴리스로 되돌리고 exit 1 (자동 롤백)
6. 성공하면 releases를 최근 5개만 남기고 정리한다

여기 녹아 있는 함정이 셋인데, 전부 실제로 밟은 것들이다.

⚠️ SSM Run Command는 root로 실행된다. pm2 데몬과 `/srv`는 ubuntu 소유라, 워크플로가
`sudo -u ubuntu -H env APP=... bash release.sh`로 내려서 돌린다. `-H`가 HOME을
`/home/ubuntu`로 잡아 줘야 pm2가 자기 데몬 소켓(`~/.pm2`)을 찾는다.

⚠️ `AWS-RunShellScript` 문서는 commands 배열을 셸 스크립트 하나로 이어 붙여
실행하고 종료 코드는 마지막 명령 것만 본다. 첫 줄에 `set -e`가 없으면 중간의 S3
다운로드가 실패해도 전체가 Success로 찍힌다. 배포가 터졌는데 초록불이 뜨는 최악의
조합이다. 그리고 기본 executionTimeout이 3600초라, 명령이 매달리면 한 시간 동안
InProgress로 남는다. 우리는 420초로 줄여서 hang이 폴링 한도(450초) 안에 "명령
실패"로 확정되게 했다.

⚠️ pm2 데몬 스폰 경합. 첫 배포에서 web 잡은 17초 만에 끝났는데 mobile 잡은 SSM
명령이 9분 넘게 InProgress에 매달렸다. 두 잡이 같은 초에 같은 인스턴스로 명령을
보냈고, pm2 클라이언트는 데몬이 없으면 자기가 띄우는데 두 클라이언트가 동시에 그
구간에 들어가면 한쪽이 소켓을 기다리며 영원히 매달릴 수 있다. release.sh 첫머리의
flock이 그 재발 방지다. 릴리스가 십몇 초라 직렬화해도 손해가 없다.

## 5단계. 첫 배포

develop에서 main으로 병합하면 Deploy 워크플로가 돈다.

⚠️ Deploy 잡은 PR 화면의 체크 목록에는 안 나온다. 거기 보이는 건 PR 이벤트에 걸린
CI(Lint·Types·Build)와 Vercel뿐이고, Deploy는 main에 푸시가 일어난 뒤 리포 상단
Actions 탭에서 별도 워크플로로 돈다. "병합했는데 Deploy web/mobile이 안 보인다"면
Actions 탭을 봐야 한다.

Actions → Deploy → 두 잡(`Deploy web`, `Deploy mobile`)이 초록인지 확인한다.
실패하면 Release 스텝 로그에 서버 쪽 stdout·stderr가 그대로 찍혀 있다.

> 📷 Actions — Deploy 워크플로 두 잡 성공 화면

배포가 초록이면 SSM 세션에서 실제로 떠 있는지 확인한다. EC2에 퍼블릭 IP가 없어서
밖에서 직접 두드릴 수 없으니, 검증도 세션 안에서 한다.

```bash
sudo su - ubuntu
pm2 list
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/health
```

둘 다 200이면 빌드 → S3 → SSM → 릴리스 → 헬스체크 파이프라인 전체가 검증된 것이다.

## 6단계. ACM 인증서

ALB에 붙일 HTTPS 인증서다. 콘솔 검색창에 Certificate Manager.

⚠️ 우상단 리전이 서울(ap-northeast-2)인지부터 본다. 리전이 다르면 목록이 비어
보인다. us-east-1에 받는 건 CloudFront용이라 ALB에 못 쓴다.

이미 발급된 인증서가 있으면 클릭해서 "도메인" 섹션을 본다. `plick.co.kr`과
`*.plick.co.kr`이 한 장에 담겨 있으면 그대로 재사용하면 된다. 와일드카드가
`m.plick.co.kr`을 커버하고, apex(`plick.co.kr`)는 와일드카드에 포함되지 않아서
따로 들어 있어야 한다.

없으면 "인증서 요청" → 퍼블릭 인증서:

- 도메인 이름: `plick.co.kr`, 대체 이름 추가: `*.plick.co.kr`
- 검증 방법: DNS 검증
- 요청 후 인증서 상세에서 "Route 53에서 레코드 생성" 버튼을 누르면 검증용 CNAME이
  자동으로 들어간다. 몇 분이면 "발급됨"이 된다

⚠️ 호스팅 영역에 생기는 `_xxxx.plick.co.kr` CNAME이 그 검증 레코드다. 인증서 자동
갱신에 계속 쓰이므로 청소한다고 지우면 안 된다.

> 📷 ACM 인증서 상세 — 도메인 두 개와 발급 상태

## 7단계. 대상 그룹

ALB가 트래픽을 넘길 과녁이다. EC2 → 왼쪽 메뉴 맨 아래 "로드 밸런싱" 섹션 →
대상 그룹 → 대상 그룹 생성.

| 이름              | 포트 | 프로토콜 | 헬스체크 경로 |
| ----------------- | ---- | -------- | ------------- |
| `tg-front-web`    | 3000 | HTTP     | `/api/health` |
| `tg-front-mobile` | 3001 | HTTP     | `/api/health` |

각각:

- 대상 유형 Instances, VPC는 EC2가 있는 그 VPC
- 상태 검사 경로를 `/api/health`로 바꾼다. ⚠️ 기본값 `/`로 두면 안 된다. `/`는
  서버 컴포넌트가 BE로 fetch를 나가는 화면이라, BE가 잠깐 흔들려 500이 나오면
  ALB가 프론트 인스턴스를 통째로 내려 버린다. BE 장애가 프론트 전면 503으로
  번지는 구조다. `/api/health`는 BE를 부르지 않고 200만 돌려주는 전용 라우트다
- 다음 화면에서 인스턴스 체크 → "아래에 보류 중인 것으로 포함" → 생성

인스턴스가 프라이빗 서브넷에 있어도 같은 VPC면 그대로 등록된다.

만든 뒤 각 대상 그룹 → 대상 탭에서 상태가 healthy로 바뀌는지 본다 (1~2분).
unhealthy로 남으면 십중팔구 다음 단계의 보안그룹이다.

> 📷 대상 그룹 — 대상 탭 healthy 상태

## 8단계. 보안그룹

원칙: 소스는 IP 대역이 아니라 보안그룹 ID로 지정한다. 그래야 인스턴스가 늘거나
IP가 바뀌어도 규칙을 손댈 일이 없다.

| 대상        | 인바운드    | 소스           |
| ----------- | ----------- | -------------- |
| 퍼블릭 ALB  | 80, 443     | `0.0.0.0/0`    |
| Next EC2    | 3000, 3001  | 퍼블릭 ALB SG  |
| BE 내부 ALB | 리스너 포트 | Next EC2 SG    |
| BE EC2      | 8080        | BE 내부 ALB SG |

22번 포트 규칙이 어디에도 없다는 게 이 구성의 특징이다. 접속은 SSM이 맡고, SSM은
EC2에서 밖으로 나가는 연결이라 인바운드가 필요 없다.

확인하는 곳:

- Next EC2: EC2 → 인스턴스 → 보안 탭. 3000·3001의 소스가 sg-로 시작하는지, 그
  sg가 퍼블릭 ALB에 붙은 것과 같은지 본다 (ALB 쪽은 로드 밸런서 → 보안 탭)
- 퍼블릭 ALB: 로드 밸런서 → 보안 탭 → 보안그룹 클릭 → 인바운드에 80, 443이
  `0.0.0.0/0`인지. 오픈 전까지 내 IP(`x.x.x.x/32`)로 좁혀 두는 것도 방법이다.
  그 상태로도 내 브라우저에서의 검증과 OAuth 로그인은 다 된다 (OAuth는 브라우저가
  카카오·구글에 갔다가 돌아오는 구조라 프로바이더가 ALB에 직접 들어올 일이 없다).
  단 다른 사람은 타임아웃이니, 서비스 공개 때 `0.0.0.0/0`으로 바꾼다

## 9단계. 퍼블릭 ALB 리스너

EC2 → 로드 밸런서 → 퍼블릭 ALB → "리스너 및 규칙" 탭.

HTTPS:443 리스너 (없으면 "리스너 추가"):

- 기본 작업: 고정 응답 반환, 상태 코드 404. 등록 안 된 호스트로 들어온 요청이
  엉뚱한 앱에 닿지 않게 하는 바닥이다
- 인증서: 6단계의 인증서 선택
- 리스너의 규칙에 두 개 추가:
  - 호스트 헤더 = `plick.co.kr` → `tg-front-web`으로 전달
  - 호스트 헤더 = `m.plick.co.kr` → `tg-front-mobile`로 전달

HTTP:80 리스너:

- 기본 작업: URL로 리디렉션 → HTTPS, 포트 443, 상태 코드 301. 전달이 아니라
  리다이렉트다

`X-Forwarded-Proto`는 ALB가 자동으로 붙여 주므로 따로 설정할 게 없다.

> 📷 리스너 및 규칙 — 443 규칙 목록

## 10단계. Route 53 레코드

콘솔 검색창에 Route 53 → 왼쪽 "호스팅 영역" → `plick.co.kr` 클릭.

(대시보드에서 "도메인 등록 오류" 같은 빨간 배너가 떠도 무시한다. 도메인을 Route
53에서 산 게 아니면 대시보드 위젯이 원래 투덜댄다.)

apex 레코드:

- `plick.co.kr` A 레코드가 이미 있으면 체크 → 레코드 편집. 없으면 레코드 생성
- 별칭(Alias) 켜기 → "Application/Classic Load Balancer에 대한 별칭" → 리전
  서울 → 목록에서 퍼블릭 ALB 선택 (`dualstack.` 접두사가 붙어 보여도 정상) → 저장

왜 별칭인가: apex에는 DNS 규격상 CNAME을 둘 수 없고(SOA·NS와 공존 불가), ALB는
고정 IP를 안 줘서 A 레코드에 IP를 박을 수도 없다. Alias는 A 레코드처럼 동작하면서
ALB를 직접 가리키는 Route 53 전용 확장으로, apex에 ALB를 붙이는 사실상 유일한
정공법이다.

서브도메인:

- 레코드 생성 → 이름 `m` (뒤 `.plick.co.kr`은 자동) → 유형 A → 별칭 켜기 → 같은
  ALB → 생성

반영 확인:

```bash
dig +short plick.co.kr
dig +short m.plick.co.kr
```

IP가 나오면 붙은 것이다 (ALB라 여러 개 나오는 게 정상). 브라우저에서
`https://plick.co.kr`, `https://m.plick.co.kr`을 연다.

> 📷 브라우저 — 두 도메인 접속 화면

## 11단계. OAuth 리다이렉트 URI

카카오·구글 개발자 콘솔에 리다이렉트 URI를 등록해야 로그인이 된다.

- `https://plick.co.kr/oauth/callback`
- `https://m.plick.co.kr/oauth/callback`

도메인이 다르면 별개 URI라 둘 다 필요하고, 한 글자라도 다르면 프로바이더가
거절한다. 구글은 localhost를 뺀 `http://` URI를 애초에 등록받지 않으므로 HTTPS가
붙은 다음에야 할 수 있는 작업이다.

로그인이 도는지 실제로 밟아 본다. ⚠️ 로그인은 성공하는데 계속 로그아웃 상태라면
http로 접근 중일 가능성이 높다. 인증 쿠키가 프로덕션에서 `secure: true`라 https가
아니면 브라우저가 버린다.

## 12단계. 마지막 관문 — 200인데 화면이 빈다면

우리는 여기서 한 번 더 막혔다. 접속도 되고 네트워크 탭도 200인데 홈 핫이슈와
기사 상세만 비어 있었다.

먼저 "에러인데 200"부터. Next는 응답을 스트리밍으로 먼저 열고(이때 상태 코드가
확정된다) 서버 렌더 중 터진 에러를 본문에 실어 에러 바운더리로 그린다. 서버 렌더
실패를 status로는 거를 수 없다는 뜻이다.

증상이 "클라 fetch 화면(피드·릴스)은 멀쩡, 서버에서 그리는 화면만 빈다"면 1단계
함정에서 설명한 `API_BASE_URL`의 두 시점 문제다. `shared/.env`에 값이 있는지 보고,
있는데도 그러면 재기동을 이렇게 했는지 본다.

⚠️ `pm2 restart --update-env`는 `.env` 파일을 읽는 옵션이 아니다. 명령을 실행한
셸의 현재 환경을 프로세스에 넣는 동작이라, 파일만 고치고 restart하면 프로세스는
옛 값 그대로다. 소싱이 먼저다.

```bash
set -a; . /srv/plick-web/shared/.env; set +a; pm2 restart plick-web --update-env
set -a; . /srv/plick-mobile/shared/.env; set +a; pm2 restart plick-mobile --update-env
```

적용됐는지는 프로세스에 실제 들어간 값으로 확인한다.

```bash
pm2 list
pm2 env <프로세스 id> | grep API_BASE_URL
```

BE까지 실제로 닿는지도 세션 안에서 바로 확인할 수 있다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://<내부 ALB DNS>/api/v1/articles/hot
```

여기서 타임아웃이면 내부 ALB 보안그룹에 Next EC2 SG가 인바운드로 안 들어간 것이다.

참고로 이 장애를 쫓다가 "홈이 빌드 때 정적으로 구워져 실패 화면이 박제된 것
아닌가" 하는 가설로 `force-dynamic`을 붙일 뻔했다. 아니었다. Next 15부터 fetch
기본이 no-store고, 캐시 안 된 fetch를 쓰는 라우트는 자동으로 동적 렌더로 빠진다.
빌드 라우트 표에서 해당 라우트가 ƒ(Dynamic)면 박제는 없다. 오진 과정은
[ADR 0064](adr/0064-private-ec2-ssm-deploy.md)에 있다.

여기까지 확인되면 끝이다. 이후는 운영이다.

## 운영

> ⚠️ 이 절부터는 v1 기준이라 더 이상 유효하지 않다. 현행 운영(재배포, 롤백,
> 환경변수 변경, 로그)은 [deploy-v2.md](deploy-v2.md)의 14절을 본다. v2에서는
> 릴리스 디렉터리와 심볼릭 링크가 없고, 롤백은 이전 sha의 bundle.zip 재배포,
> 환경변수는 Parameter Store 수정 + 재배포다. 아래는 기록으로만 남긴다.

접속이 필요한 작업은 전부 SSM 세션에서 하고, 세션을 열면 `sudo su - ubuntu`부터
한다. ssm-user 상태로 pm2를 부르면 ubuntu의 pm2 데몬이 안 보여서 프로세스가 없는
것처럼 나온다.

### 배포 다시 돌리기

Actions → Deploy → Run workflow. 코드 변경 없이 같은 커밋으로 다시 나간다.
`API_BASE_URL` 시크릿을 바꿨을 때도 이걸로 재빌드한다.

### 로그와 상태

```bash
pm2 logs plick-mobile --lines 100
pm2 list
```

### 수동 롤백

`releases/`에 최근 5개가 남아 있으므로 링크만 되돌리면 된다.

```bash
ls -1dt /srv/plick-mobile/releases/*/
ln -sfn /srv/plick-mobile/releases/<되돌릴sha> /srv/plick-mobile/current && pm2 restart plick-mobile --update-env
```

헬스체크 실패 롤백은 배포 스크립트가 자동으로 한다. 수동 롤백은 배포는 성공했는데
기능이 잘못됐을 때 쓴다.

### 환경변수 바꾸기

런타임 값은 `shared/.env`를 고치고, 12단계에서 설명한 소싱 + 재기동으로 반영한다.
가장 확실한 방법은 Actions 재실행이다. release.sh가 `.env`를 소싱해서 재기동한다.

`API_BASE_URL`은 반쪽만 바뀐다. 서버 컴포넌트 fetch는 `.env` + 재기동으로
따라오지만, `/be` 프록시 목적지는 빌드 산출물에 굳어 있어 시크릿을 고치고
재배포해야 한다. 값이 바뀌면 둘 다 한다.

### 오래된 아티팩트 정리

배포마다 S3 `frontend/<sha>/`에 tarball이 쌓인다. 버킷 → 관리 탭 → 수명 주기 규칙
생성 → 접두사 `frontend/`에 만료 7일을 걸어 두면 알아서 지워진다 (공용 버킷이라
접두사 없이 걸면 BE 몫까지 지워지니 주의). 없어도 동작에는
문제없고 저장 요금만 조금씩 는다.

## 자주 막히는 곳 총정리

**Configure AWS credentials 스텝에서 AssumeRole 실패** — 셋 중 하나다. 워크플로에
`permissions: id-token: write`가 있는지, 배포 롤 신뢰 정책의 조직·리포·브랜치가
현재 리포 이름(`big-cute-team/plick-frontend`)의 `main`과 정확히 일치하는지(리포
개명에 특히 주의), ID 제공업체 Audience가 `sts.amazonaws.com`인지 순서대로 본다.

**Release 스텝에서 SSM 명령이 Failed** — 스텝 로그에 서버 stdout·stderr가 같이
찍힌다. `aws: command not found`면 EC2에 aws CLI가 없는 것이고(`sudo snap install
aws-cli --classic`), S3 403이면 인스턴스 역할에 `s3:GetObject`가 없거나 버킷
이름이 다른 것이다.

**SSM 명령이 InProgress에서 안 끝남** — pm2 데몬 스폰 경합이거나(flock이 있으면
재발하지 않는다), 에이전트가 매니저에 안 붙은 것이다. Systems Manager → 플릿
매니저에서 인스턴스가 관리형으로 보이는지, SSM 엔드포인트로 나가는 경로가
살아 있는지 본다. executionTimeout(420초)이 걸려 있어 hang은 7분 안에 실패로
확정된다.

**pm2 프로세스가 안 보이거나 이중으로 뜸** — root나 ssm-user로 pm2를 건드린
것이다. 배포는 ubuntu의 pm2 데몬을 쓴다. `sudo pm2 kill`로 엉뚱한 유저의 데몬을
정리하고 ubuntu로 다시 본다.

**대상 그룹이 계속 unhealthy** — `.env`에 `HOSTNAME=0.0.0.0`이 있는지, EC2
보안그룹에서 퍼블릭 ALB SG가 3000/3001로 들어올 수 있는지, 헬스체크 경로가
`/api/health`인지 순서대로 본다.

**CSS와 이미지가 전부 404** — standalone 산출물에 `.next/static`과 `public`이 안
들어간 것이다. 워크플로의 `Assemble standalone` 스텝을 확인한다.

**서버에서 그리는 화면(홈 핫이슈·기사 상세 등)만 비어 있음** — `shared/.env`에
`API_BASE_URL`이 없거나, 소싱 없이 restart만 해서 프로세스에 안 들어간 것이다.
12단계 절차대로 재기동하고 `pm2 env`로 확인한다.

**BE 데이터 화면이 전부 비어 있음** — Next EC2에서 BE 내부 ALB로 못 닿는 것이다.
SSM 세션에서 직접 curl로 확인한다. 열에 아홉은 BE ALB 보안그룹에 Next EC2 SG가 안
들어가 있다.

**로그인 성공인데 계속 로그아웃 상태** — http로 접근 중일 가능성이 높다. 인증
쿠키가 프로덕션에서 `secure: true`라 https가 아니면 브라우저가 버린다.

**배포는 성공인데 옛날 코드가 보임** — 브라우저 캐시이거나 `current` 링크가 안
바뀐 것이다. `readlink /srv/plick-mobile/current`로 확인한다.

**ACM 인증서 발급이 안 끝남** — 검증용 CNAME이 실제 DNS에 반영됐는지 확인한다.
네임서버를 Route 53으로 옮기는 중이라면 그 전파가 먼저 끝나야 한다.
