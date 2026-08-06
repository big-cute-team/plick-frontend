# 배포 전략 v2 계획 — Launch Template + ASG + CodeDeploy Blue/Green (KAN-343)

현행 배포(v1, [deploy.md](deploy.md))는 프라이빗 EC2 한 대에 pm2로 두 앱을 띄우고,
GitHub Actions가 S3에 산출물을 올린 뒤 SSM Run Command로 서버 쪽 release.sh를
실행하는 구조다. 이걸 [devops-3-tier-practice(backend-cicd)](https://github.com/hojun121/devops-3-tier-practice/tree/backend-cicd)
의 구조를 따라 Launch Template + Auto Scaling Group + CodeDeploy Blue/Green으로
바꾼다. 이 문서는 그 전환의 계획서다. 아래 단계 순서대로 진행한다.

v1 문서가 "다 만든 뒤의 기록"이라면 이 문서는 "만들기 전의 설계"다. 실제 작업하며
달라지는 건 이 문서를 고치고, 시행착오 회고는 세션 ADR에 남긴다.

## 0. 왜 바꾸나 — v1의 한계

v1은 동작하지만 구조적 한계가 있다.

- 서버가 pet이다. Node·pm2·디렉터리·.env를 전부 손으로 세팅했고, 인스턴스가
  죽으면 deploy.md를 보며 처음부터 다시 세워야 한다. 재현이 문서에 의존한다
- 단일 인스턴스라 SPOF다. AZ 하나가 흔들리거나 인스턴스가 죽으면 서비스 전체가
  내려간다. 스케일 아웃도 불가능하다
- 배포가 in-place다. pm2 restart 순간 짧은 순단이 있고, 새 릴리스가 절반쯤
  풀린 상태에서 실패하면 스크립트 롤백에 의존한다. 검증이 끝나기 전에 이미
  기존 프로세스를 죽인 상태다
- 배포 대상이 인스턴스 ID 하나에 박혀 있다(`EC2_INSTANCE_ID` 시크릿).
  인스턴스가 바뀌면 시크릿을 바꿔야 한다

v2가 해결하는 것.

- Launch Template + user data로 서버 셋업이 코드가 된다. 인스턴스는 cattle이다
- ASG가 2개 AZ에 인스턴스를 유지한다. 죽으면 알아서 다시 띄운다
- Blue/Green이라 새 버전을 별도 인스턴스에서 먼저 검증하고 트래픽을 넘긴다.
  검증에 실패하면 기존(Blue)이 그대로 서비스 중이라 무중단 롤백이다
- 배포 대상이 "배포 그룹"이라는 논리 이름이 된다. 인스턴스가 몇 대든 어느
  ID든 워크플로는 모른다

## 1. 전체 그림 (Blueprint Overview)

### before (v1)

```
GitHub Actions (main 푸시)
  ├─ web·mobile 각각 빌드 → tar.gz + release.sh를 S3에 업로드
  └─ SSM send-command → EC2 한 대가 내려받아 심볼릭 링크 교체·pm2 재기동
```

### after (v2)

```
GitHub Actions (main 푸시)
  ├─ web·mobile 빌드 → appspec.yml + 스크립트 + tar.gz 두 개를 bundle.zip 하나로
  ├─ S3 업로드 (plick-deploy/frontend/<sha>/bundle.zip)
  └─ aws deploy create-deployment (Blue/Green)
        │
        ▼
CodeDeploy
  ① 현재 ASG를 복제해 Green 인스턴스 기동 (user data가 Node·pm2·agent 설치)
  ② Green에 번들 배포 (appspec 훅: 압축 해제 → .env 생성 → pm2 기동)
  ③ ValidateService — 3000·3001 /api/health 검증
  ④ 성공 시 Green을 tg-front-web·tg-front-mobile에 등록, Blue 제외
  ⑤ 유예 후 Blue 인스턴스 종료
```

트래픽 경로는 v1과 같다. 퍼블릭 ALB가 호스트 헤더로 `plick.co.kr → tg-front-web(:3000)`,
`m.plick.co.kr → tg-front-mobile(:3001)`을 분기하고, 인스턴스는 프라이빗 서브넷에서
내부 ALB를 거쳐 BE로 나간다. 바뀌는 건 "과녁 뒤의 인스턴스가 어떻게 태어나고
교체되는가"뿐이다. ALB·리스너 규칙·Route 53·ACM은 손대지 않는다.

한 인스턴스에 두 앱(web :3000, mobile :3001)이 같이 뜨는 것도 유지한다. 그래서
배포 단위가 v1의 "앱별 2건"에서 "두 앱을 담은 번들 1건"으로 바뀐다. Blue/Green에서
인스턴스가 통째로 교체되는데 앱별로 따로 배포하면 한 ASG를 두 배포가 서로
복제·종료하며 싸우기 때문이다. 배포 그룹 하나, 배포 한 번, 검증은 두 포트 모두다.

### 참조 구조와 다른 점

참조 README는 백엔드(Express 단일 앱) 실습이라 그대로 못 옮기는 지점이 있다.
미리 적어 둔다.

| 항목             | 참조                                 | PLick v2                               |
| ---------------- | ------------------------------------ | -------------------------------------- |
| 앱               | backend 1개(:8080)                   | web(:3000)·mobile(:3001) 2개 한 번들   |
| 타겟그룹         | 1개                                  | 2개(배포 그룹에 둘 다 등록)            |
| .env             | Launch Template user data에 하드코딩 | SSM Parameter Store에서 배포 훅이 생성 |
| 프론트 정적 서빙 | CloudFront + S3                      | Next standalone이 직접(변경 없음)      |
| 인프라 생성      | CloudFormation 스택                  | 기존 VPC·ALB 재사용, 콘솔 수작업       |

.env를 user data에 안 박는 이유: OAuth client id 같은 값이 Launch Template
평문에 남고, 값 하나 바꿀 때마다 템플릿 버전을 새로 파야 한다. Parameter Store에
두면 값 변경이 파라미터 수정 + 재배포로 끝난다.

## 2. 사전 준비물

시작 전에 이미 있어야 하는 것. 전부 v1에서 만든 그대로 재사용한다.

- VPC, 프라이빗 서브넷 × 2AZ, NAT, S3 게이트웨이 엔드포인트
- 퍼블릭 ALB + HTTPS 리스너(호스트 헤더 규칙 2개) + ACM 인증서
- 대상 그룹 `tg-front-web`(3000)·`tg-front-mobile`(3001), 헬스체크 `/api/health`
  - 등록 취소 지연(deregistration delay)은 기본 300초에서 30초로 낮췄다(KAN-373).
    ALB는 진행 중 요청이 없어도 이 시간을 다 채우고서야 드레이닝을 끝내서,
    Blue/Green의 Blue 제거 단계가 배포마다 고정 5분을 먹고 있었다. CloudFront의
    오리진 응답 타임아웃이 30초라 그보다 오래 사는 요청은 어차피 504로 끊기므로
    30초면 이론상 최장 요청까지 덮는다
- 내부 ALB(BE)와 보안그룹 체인
- S3 버킷 `plick-deploy` (BE와 공용, 프론트 접두사 `frontend/`)
- GitHub OIDC ID 제공업체(`token.actions.githubusercontent.com`)
- Route 53 레코드

그리고 v1 인스턴스는 전환이 끝날 때까지 계속 서비스한다. 이 계획의 1~10단계는
전부 기존 서비스에 영향이 없고, 트래픽이 실제로 옮겨 가는 건 11단계다.

작업 중 계속 쓰는 값을 먼저 적어 둔다: 계정 ID(12자리), VPC ID, 프라이빗 서브넷
ID 2개, Next EC2 보안그룹 ID(재사용), 두 대상 그룹 ARN, 내부 ALB DNS 이름.

## 3. S3 아티팩트 버킷 — 재사용

새로 만들 것 없다. `plick-deploy` 버킷의 `frontend/` 접두사를 그대로 쓴다.
키만 바뀐다.

- v1: `frontend/<sha>/{web,mobile}.tar.gz` + `release.sh`
- v2: `frontend/<sha>/bundle.zip` 하나

수명 주기 규칙(접두사 `frontend/` 만료 7일)도 그대로 유효하다.

## 4. SSM Parameter Store — .env의 새 집

ASG에서 인스턴스는 수시로 태어나고 죽는다. v1처럼 `shared/.env`를 손으로 만들어
두는 방식은 성립하지 않는다. 런타임 환경변수를 Parameter Store로 옮기고, 배포 훅
(AfterInstall)이 매번 내려받아 `.env`를 만든다.

콘솔 → Systems Manager → Parameter Store → 파라미터 생성. 앱당 하나,
SecureString(기본 aws/ssm 키)으로 .env 파일 내용 통째를 값으로 넣는다.

`/plick/frontend/web/env`

```
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
KAKAO_CLIENT_ID=<카카오 client_id>
GOOGLE_CLIENT_ID=<구글 client_id>
OAUTH_REDIRECT_URI=https://plick.co.kr/oauth/callback
API_BASE_URL=http://<BE 내부 ALB DNS 이름>
```

`/plick/frontend/mobile/env`

```
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
KAKAO_CLIENT_ID=<카카오 client_id>
GOOGLE_CLIENT_ID=<구글 client_id>
OAUTH_REDIRECT_URI=https://m.plick.co.kr/oauth/callback
API_BASE_URL=http://<BE 내부 ALB DNS 이름>
```

값은 현행 EC2의 `/srv/plick-web/shared/.env`·`/srv/plick-mobile/shared/.env`에서
그대로 복사해 온다. 옮겨 적다 오타 내지 말고 SSM 세션에서 cat 한 걸 붙여 넣는다.

⚠️ v1의 함정이 그대로 승계된다. `HOSTNAME=0.0.0.0`이 빠지면 대상 그룹이 전부
unhealthy가 되고, `API_BASE_URL`은 여전히 두 시점에 읽힌다(빌드 때 GitHub 시크릿
→ `/be` 프록시 목적지로 산출물에 굳고, 실행 때 이 파라미터 → 서버 컴포넌트
fetch). 값이 바뀌면 시크릿과 파라미터 양쪽을 고치고 재배포한다.

`NEXT_PUBLIC_SITE_URL`(KAN-346)은 여기 넣지 않는다. NEXT*PUBLIC* 접두사라 빌드
시점에 산출물로 굳는 순수 빌드 타임 값이고, 비밀이 아닌 공개 도메인이라 시크릿도
아니다. deploy.yml의 앱별 빌드 스텝에 상수로 박혀 있다(web `https://plick.co.kr`,
mobile `https://m.plick.co.kr`). ⚠️ 이 값이 틀리면 canonical과 sitemap이 통째로
엉뚱한 도메인을 가리키므로, 도메인이 바뀌면 deploy.yml을 고치고 재배포한다.

## 5. IAM 역할 3개

참조 README와 같은 3역할 구조다. 기존 역할을 부수지 않고 새로 만들거나 정책을
추가하는 방식으로 간다. v1 경로(SSM Run Command)는 전환이 끝난 뒤 15단계에서
정리한다.

### ① plick-frontend-ec2-role (인스턴스용, 신규)

Green 인스턴스가 태어날 때마다 붙는 역할. IAM → 역할 생성 → AWS 서비스 → EC2.

관리형 정책 2개:

- `AmazonSSMManagedInstanceCore` — SSM 세션 접속·에이전트 통신
- `AmazonEC2RoleforAWSCodeDeploy` — CodeDeploy 에이전트가 S3에서 번들을
  내려받는 읽기 권한

인라인 정책 1개 (`plick-frontend-params-read`) — 배포 훅이 Parameter Store를
읽는 권한:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter", "ssm:GetParametersByPath"],
      "Resource": "arn:aws:ssm:ap-northeast-2:<계정ID>:parameter/plick/frontend/*"
    }
  ]
}
```

파라미터 ARN의 서비스가 iam이 아니라 ssm인 것에 주의한다. SecureString을
aws/ssm 기본 키로 만들었으면 별도 kms 권한은 필요 없다.

역할을 만들면 같은 이름의 인스턴스 프로파일이 같이 생긴다. Launch Template에서
이 프로파일을 고른다.

### ② plick-frontend-codedeploy-role (CodeDeploy 서비스용, 신규)

BE도 CodeDeploy를 쓸 예정이라 서비스 롤 이름에 frontend를 넣어 구분한다. PassRole이
프론트 인스턴스 롤 하나로 좁혀져 있어 팀별 롤 분리가 IAM 경계도 깔끔하게 유지한다.

CodeDeploy가 Blue/Green에서 ASG를 복제하고 인스턴스를 만들고 지우는 권한.
IAM → 역할 생성 → AWS 서비스 → CodeDeploy(EC2/온프레미스용).

- `AWSCodeDeployRole` (기본으로 붙는다)
- `AmazonEC2FullAccess` — Green ASG·인스턴스 생성용. 참조 README와 동일
- 인라인 정책 (`plick-frontend-codedeploy-passrole`) — 새 인스턴스에 ①번 역할을 붙일
  권한. 이게 없으면 Green 기동에서 조용히 실패한다:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::<계정ID>:role/plick-frontend-ec2-role"
    }
  ]
}
```

### ③ plick-frontend-deploy (GitHub Actions용, 기존 역할 수정)

v1에서 만든 OIDC 역할을 재사용한다. 신뢰 정책(조직 `big-cute-team`, 리포
`plick-frontend`, 브랜치 `main`)은 그대로 두고 권한만 바꾼다.

기존 인라인 정책 `plick-frontend-deploy-policy`에서 `ssm:SendCommand`·
`ssm:GetCommandInvocation` 부분을 CodeDeploy 권한으로 교체한다. 단, 전환 기간에
v1으로 되돌아갈 수 있게 교체가 아니라 "추가"로 넣고, SSM 쪽 제거는 15단계에서
한다.

추가할 Statement:

```json
{
  "Effect": "Allow",
  "Action": [
    "codedeploy:CreateDeployment",
    "codedeploy:GetDeployment",
    "codedeploy:GetDeploymentConfig",
    "codedeploy:GetApplicationRevision",
    "codedeploy:RegisterApplicationRevision"
  ],
  "Resource": [
    "arn:aws:codedeploy:ap-northeast-2:<계정ID>:application:plick-frontend",
    "arn:aws:codedeploy:ap-northeast-2:<계정ID>:deploymentgroup:plick-frontend/*",
    "arn:aws:codedeploy:ap-northeast-2:<계정ID>:deploymentconfig:*"
  ]
}
```

`s3:PutObject`(`arn:aws:s3:::plick-deploy/frontend/*`)는 그대로 쓴다.

## 6. Launch Template

인스턴스의 출생 신고서. EC2 → Launch Templates → 시작 템플릿 생성.

- 이름: `plick-frontend-lt`
- AMI: Ubuntu Server 24.04 LTS (x86_64) — 러너(ubuntu x86_64) 빌드 산출물과
  아키텍처를 맞춘다. ⚠️ arm(Graviton)을 고르면 sharp 같은 네이티브 바이너리가
  깨진다. 바꾸려면 러너와 세트로 바꿔야 한다
- 인스턴스 유형: 현행 인스턴스와 같은 타입 (콘솔에서 확인해 맞춘다)
- 키 페어: 없음 (SSH 안 쓴다)
- 서브넷: 템플릿에는 지정하지 않는다 (ASG가 정한다)
- 보안그룹: 현행 Next EC2에 붙어 있는 그 SG. 퍼블릭 ALB SG에서 3000·3001
  인바운드가 이미 뚫려 있으므로 재사용이 맞다
- IAM 인스턴스 프로파일: `plick-frontend-ec2-role`
- 고급 세부 정보 → 사용자 데이터:

```bash
#!/bin/bash
set -euxo pipefail

# Node 22 + pm2 (NodeSource는 인터넷이 필요하다 — NAT 경유)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs ruby-full
npm install -g pm2

# CodeDeploy 에이전트 (리전 버킷은 S3 게이트웨이 엔드포인트로 닿는다)
cd /tmp
curl -O https://aws-codedeploy-ap-northeast-2.s3.ap-northeast-2.amazonaws.com/latest/install
chmod +x ./install
./install auto
systemctl enable codedeploy-agent

# 배포 훅이 Parameter Store를 읽을 때 쓰는 aws CLI
snap install aws-cli --classic

# 앱 루트. 배포 훅이 ubuntu로 실행되므로 소유자를 맞춘다
mkdir -p /srv/plick
chown -R ubuntu:ubuntu /srv/plick

# 재부팅 시 pm2 자동 기동. root user data라 생성된 명령을 손으로 복사할 필요 없이
# 바로 유닛이 등록된다 (v1에서 출력 복사를 빼먹던 함정이 사라진다)
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

v1의 "1단계. SSM 세션으로 들어가서 서버 준비"가 통째로 이 스크립트로 바뀐다.
손 세팅이 사라지는 게 v2의 핵심 이득이다.

⚠️ user data는 첫 부팅에 한 번만 돈다. 스크립트를 고치면 템플릿 새 버전을 만들고
ASG의 템플릿 버전을 올린 뒤 인스턴스 갱신(또는 다음 Blue/Green)으로 반영한다.

⚠️ ASG가 참조할 버전을 `Latest`로 할지 `Default`로 할지 정하고 일관되게 간다.
`Default`로 두고 검증된 버전만 기본으로 승격하는 쪽이 사고가 적다.

## 7. Auto Scaling Group

EC2 → Auto Scaling 그룹 → 생성.

- 이름: `plick-frontend-asg`
- 시작 템플릿: `plick-frontend-lt` (버전 `Default`)
- 네트워크: 기존 VPC, 프라이빗 서브넷 2개(2AZ)
- 로드 밸런싱: 기존 대상 그룹 연결 — `tg-front-web`, `tg-front-mobile` 둘 다
- 상태 확인: EC2 (⚠️ ELB 아님 — 아래 이유)
- 상태 확인 유예 기간: 300초
- 규모: Desired 2, Min 2, Max 4

상태 확인을 EC2로 두는 이유는 참조 README와 같다. 갓 태어난 인스턴스에는 앱이
없어서 ELB 헬스체크가 반드시 실패하는데, ELB 기준이면 ASG가 "unhealthy네" 하고
인스턴스를 죽이고 새로 만들기를 무한 반복한다. 앱은 CodeDeploy가 나중에 얹는
구조라 첫 배포 전까지는 EC2 기준(인스턴스 살아 있음)으로 버텨야 한다.
운영이 안정된 뒤 ELB 기준 + 충분한 유예로 바꾸는 건 선택지로 남긴다.

⚠️ ASG를 만들면 빈 인스턴스 2대가 대상 그룹에 unhealthy로 등록된다. 기존 EC2가
healthy로 버티고 있으므로 ALB는 트래픽을 기존 쪽으로만 보낸다. 서비스 영향은
없지만, 이 상태에서 기존 EC2까지 unhealthy가 되면 ALB는 fail-open으로 전 대상에
뿌리므로 이 구간을 길게 끌지 않는다. ASG 생성과 첫 배포(10단계)는 같은 날 잇는다.

비용 메모: Desired 2는 현행(1대) 대비 인스턴스가 한 대 늘고, 배포 순간에는
Green까지 최대 4대가 잠깐 뜬다. 비용을 못 늘리면 Desired 1 / Min 1 / Max 2로
시작해도 구조는 같다. 단 그 경우 AZ 이중화는 없다.

## 8. CodeDeploy 애플리케이션 + 배포 그룹

CodeDeploy → 애플리케이션 생성.

- 이름: `plick-frontend`, 컴퓨팅 플랫폼: EC2/온프레미스

배포 그룹 생성.

- 이름: `plick-frontend-dg`
- 서비스 역할: `plick-frontend-codedeploy-role`
- 배포 유형: 블루/그린
- 환경 구성: "Auto Scaling 그룹을 자동으로 복사" → `plick-frontend-asg`
- 배포 설정: `CodeDeployDefault.AllAtOnce`
- 로드 밸런서: 대상 그룹에 `tg-front-web`·`tg-front-mobile` 둘 다 지정.
  ⚠️ 하나만 걸면 나머지 도메인은 Blue가 죽은 뒤 과녁이 비어 503이 난다.
  배포 그룹은 대상 그룹을 여러 개(최대 10) 받을 수 있다
- 트래픽 재라우팅: 즉시
- 원본 인스턴스(Blue) 종료: 대기 5분 후 종료. 참조는 1분인데, 전환 직후 이상을
  발견했을 때 Blue가 살아 있는 시간을 조금 벌어 둔다

⚠️ Blue/Green이 돌면 `CodeDeploy_plick-frontend-dg_<배포ID>` 이름의 ASG가 새로
생기고 이게 다음 배포의 "현재 ASG"가 된다. 원래 만든 `plick-frontend-asg`는 첫
배포 후 빈 껍데기로 남는데, 지우지 말고 둔다(참조 README의 정리 절차에서도
CodeDeploy\_\* ASG와 별도로 언급되는 지점이다). 콘솔에서 ASG 목록이 낯설어져도
당황하지 않는다.

## 9. 리포지토리 변경

배포 명세가 리포에 들어온다. 참조 README의 `backend/` 구조를 모노레포에 맞게
옮긴다.

```
plick/
├── .github/workflows/deploy.yml      (전면 교체)
├── appspec.yml                       (신규 — 번들 루트에 있어야 해서 리포 루트)
└── scripts/deploy/
    ├── application_stop.sh           (신규)
    ├── before_install.sh             (신규)
    ├── after_install.sh              (신규)
    ├── application_start.sh          (신규)
    ├── validate_service.sh           (신규)
    └── release.sh                    (전환 완료 후 삭제 — 15단계)
```

### appspec.yml

```yaml
version: 0.0
os: linux
files:
  - source: /
    destination: /srv/plick/bundle
file_exists_behavior: OVERWRITE
hooks:
  ApplicationStop:
    - location: scripts/deploy/application_stop.sh
      timeout: 60
      runas: ubuntu
  BeforeInstall:
    - location: scripts/deploy/before_install.sh
      timeout: 60
      runas: ubuntu
  AfterInstall:
    - location: scripts/deploy/after_install.sh
      timeout: 300
      runas: ubuntu
  ApplicationStart:
    - location: scripts/deploy/application_start.sh
      timeout: 120
      runas: ubuntu
  ValidateService:
    - location: scripts/deploy/validate_service.sh
      timeout: 180
      runas: ubuntu
```

훅 순서는 참조 README 그대로 `ApplicationStop → BeforeInstall → (파일 복사) →
AfterInstall → ApplicationStart → ValidateService`다. Blue/Green의 Green은 매번
새 인스턴스라 ApplicationStop이 실제로 할 일은 거의 없지만(이전 리비전이 없으면
건너뛴다), in-place로 돌릴 일이 생겨도 안전하게 pm2 stop을 넣어 둔다.

`runas: ubuntu`가 v1의 `sudo -u ubuntu -H` 곡예를 대체한다. 에이전트는 root로
돌지만 훅을 ubuntu로 내려 주므로 pm2 데몬 유저 꼬임(v1 함정)이 원천 차단된다.

### 훅 스크립트 계획

`application_stop.sh` — pm2 프로세스가 있으면 stop. 없으면 조용히 통과.

`before_install.sh` — `/srv/plick/{web,mobile}` 앱 디렉터리를 비우고 다시 만든다.
Green은 새 인스턴스라 보통 비어 있지만 멱등하게 짠다.

`after_install.sh` — 핵심 훅. v1 release.sh의 몸통이 여기로 온다.

```bash
#!/usr/bin/env bash
set -euo pipefail

# 번들의 tarball을 앱 디렉터리에 푼다
tar -xzf /srv/plick/bundle/web.tar.gz -C /srv/plick/web
tar -xzf /srv/plick/bundle/mobile.tar.gz -C /srv/plick/mobile

# Parameter Store에서 .env 생성 (인스턴스 롤 권한)
aws ssm get-parameter --region ap-northeast-2 \
  --name /plick/frontend/web/env --with-decryption \
  --query Parameter.Value --output text > /srv/plick/web/.env
aws ssm get-parameter --region ap-northeast-2 \
  --name /plick/frontend/mobile/env --with-decryption \
  --query Parameter.Value --output text > /srv/plick/mobile/.env
chmod 600 /srv/plick/web/.env /srv/plick/mobile/.env
```

`application_start.sh` — 앱별로 `.env`를 소싱하고 pm2로 기동, `pm2 save`.
v1의 "소싱 없이 restart하면 옛 값" 함정이 그대로 적용되므로 `set -a; . .env;
set +a` 순서를 지킨다. 시작 경로는 `/srv/plick/<app>/apps/<app>/server.js`
(standalone 산출물 구조는 v1과 동일).

`validate_service.sh` — v1 release.sh의 헬스체크 루프를 두 포트로. 3000과 3001
각각 `/api/health`가 200을 줄 때까지 최대 60초 대기, 하나라도 실패하면 exit 1.
여기서 실패하면 CodeDeploy가 배포를 Failed 처리하고 트래픽은 Blue에 남는다.
v1처럼 스크립트가 직접 롤백할 필요가 없어진다.

v1 release.sh에서 안 가져가는 것들과 그 이유:

- flock 직렬화 — 배포가 번들 1건이 됐고 CodeDeploy 에이전트는 인스턴스당 한
  번에 하나의 배포만 실행한다. 경합 자체가 없다
- releases/ 심볼릭 링크와 이전 릴리스 보관 — 롤백 단위가 "릴리스 디렉터리"에서
  "인스턴스"로 바뀐다. 되돌리기는 CodeDeploy 재배포(이전 sha 번들)로 한다
- S3 다운로드 — 에이전트가 번들을 알아서 내려받는다

### deploy.yml (전면 교체)

트리거(`main` 푸시 + workflow_dispatch), concurrency(줄 세우기), OIDC 권한은
v1 그대로 두고 잡 구조를 바꾼다. matrix 2잡 → 단일 잡.

1. checkout, pnpm/Node 셋업, `pnpm install --frozen-lockfile`
2. `API_BASE_URL` 시크릿과 앱별 `NEXT_PUBLIC_SITE_URL` 상수(KAN-346)를 물려
   web·mobile 순서로 빌드
3. 앱별 standalone 조립(`.next/static`·`public` 채워 tar) — v1 스텝 재사용
4. 번들 조립: `appspec.yml`, `scripts/deploy/*.sh`, `web.tar.gz`, `mobile.tar.gz`를
   한 디렉터리에 모아 zip. ⚠️ appspec.yml이 zip 루트에 있어야 한다. 디렉터리를
   통째로 zip하면 한 겹 싸여서 에이전트가 appspec을 못 찾는다. `cd bundle && zip -r`
5. OIDC로 롤 assume
6. `aws s3 cp bundle.zip s3://plick-deploy/frontend/<sha>/bundle.zip`
7. 배포 생성과 대기:

```bash
DEPLOYMENT_ID=$(aws deploy create-deployment \
  --application-name plick-frontend \
  --deployment-group-name plick-frontend-dg \
  --s3-location bucket=plick-deploy,key=frontend/$SHA/bundle.zip,bundleType=zip \
  --description "deploy $SHA" \
  --query deploymentId --output text)

aws deploy wait deployment-successful --deployment-id "$DEPLOYMENT_ID"
```

`wait deployment-successful`은 15초 간격 120회(30분)까지 기다리고, 실패로 끝나면
non-zero로 빠져 잡이 빨간불이 된다. v1의 send-command 폴링 루프 40줄이 이 한
줄로 줄어든다. 실패 시 `aws deploy get-deployment`로 에러 정보를 로그에 찍는
스텝을 뒤에 둔다. 훅 스크립트의 stdout까지 러너에서 보고 싶으면 콘솔의 배포
상세 → 이벤트 로그를 봐야 한다는 점은 v1 대비 후퇴인데, 배포 이벤트 요약
(`get-deployment` 출력)으로 어느 훅에서 죽었는지는 알 수 있다.

ci.yml(PR의 format·lint·types·build)은 손대지 않는다.

## 10. GitHub 시크릿·변수 정리

| 항목                  | 처리                                               |
| --------------------- | -------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN` | 유지 (같은 롤 재사용)                              |
| `API_BASE_URL`        | 유지 (빌드 시점 값, Parameter Store와 같은 값으로) |
| `EC2_INSTANCE_ID`     | 15단계에서 삭제 (v1 전용)                          |

CodeDeploy 앱·그룹 이름은 참조 README처럼 변수로 뺄 수도 있지만 리포 하나에
배포 대상 하나라 deploy.yml env에 상수로 둔다.

## 11. 첫 배포와 트래픽 전환

여기가 실제 컷오버다. 순서가 중요하다.

1. ASG 인스턴스 2대가 running이고 SSM 플릿 매니저에 관리형으로 보이는지 확인.
   안 보이면 user data 실패다. 인스턴스의 시스템 로그(콘솔 → 모니터링 및 문제
   해결 → 시스템 로그)에서 cloud-init 출력을 본다
2. 9단계 변경을 담은 브랜치를 PR → develop 병합 → main 병합. main 푸시로
   새 deploy.yml이 돈다
3. Actions에서 배포 진행을 보면서 CodeDeploy 콘솔의 배포 상세를 같이 연다.
   훅 단계별 진행과 실패 지점이 여기 보인다
4. 배포 성공 후 두 대상 그룹의 대상 탭 확인: ASG 인스턴스들이 healthy, 기존
   EC2도 여전히 healthy로 공존한다. 이 시점에 트래픽은 기존 EC2와 새 인스턴스에
   섞여 나간다. ⚠️ 코드가 같아도 빌드가 다르면 Next 청크 해시가 달라서, HTML을
   준 인스턴스와 정적 자산 요청이 떨어진 인스턴스가 어긋나면 `_next/static` 404가
   난다(실제 첫 배포에서 겪었다). 페이지가 죽지는 않지만 이 공존 구간은 확인
   즉시 5번으로 넘어가 짧게 끝낸다
5. 새 인스턴스만으로 서비스가 되는지 확인: 기존 EC2를 두 대상 그룹에서
   Deregister (종료 아님). draining이 끝나면 트래픽은 전부 ASG 쪽이다
6. 브라우저에서 `https://plick.co.kr`·`https://m.plick.co.kr` 전 화면 확인
   (13단계 체크리스트)
7. 이상 없으면 기존 EC2는 "중지"만 해 두고 최소 며칠 관찰한다. 문제가 생기면
   기동 + TG 재등록으로 몇 분 안에 v1로 돌아갈 수 있는 안전핀이다

⚠️ 첫 Blue/Green에서 Blue는 "앱 없는 빈 인스턴스 2대"다. CodeDeploy는 이들을
복제해 Green을 만들고 배포 후 빈 Blue를 종료한다. 빈 인스턴스가 죽는 건 정상
동작이니 놀라지 않는다.

## 12. 두 번째 배포로 Blue/Green 검증

첫 배포는 "빈 Blue → Green"이라 반쪽 검증이다. 사소한 변경(버전 문자열 등)을
하나 넣고 다시 main에 태워 진짜 Blue/Green을 본다.

- 배포 중 다른 터미널에서 `while true; do curl -s https://m.plick.co.kr/api/health;
sleep 1; done` 루프를 돌려 무중단인지 본다
- CodeDeploy 콘솔에서 트래픽 재라우팅 → Blue 종료 대기 → 종료 흐름을 확인한다
- 실패 시나리오도 한 번 만든다: validate_service.sh가 실패하도록 임시 커밋을
  태우고, 배포가 Failed로 끝나며 트래픽이 Blue에 그대로 남는 걸 확인한 뒤 되돌린다

## 13. 확인 체크리스트

- 두 도메인 전 화면 로드 (홈·피드·릴스·상세·마이페이지)
- 서버 컴포넌트 화면(홈 핫이슈·기사 상세)에 데이터가 있다 — 비면
  `API_BASE_URL` 파라미터 문제, v1 문서 12단계 증상과 동일
- 클라 fetch 화면(피드 무한스크롤·릴스)이 돈다 — 안 되면 `/be` 프록시,
  빌드 시크릿 문제
- OAuth 로그인·로그아웃 (카카오·구글, 두 도메인 각각)
- 새로고침을 반복하며 두 인스턴스로 분산되는지 (응답 헤더나 pm2 로그로 확인)
- 인스턴스 한 대를 콘솔에서 강제 종료 → ASG가 새 인스턴스를 띄우고, 새
  인스턴스는 다음 배포 전까지 빈 상태로 unhealthy 대기라는 것 확인
  (⚠️ 이게 v2 구조의 알려진 구멍이다. ASG가 스스로 만든 인스턴스에는 앱이
  없어서 배포를 다시 돌려야 서비스에 낀다. Desired 2 유지가 이 구멍의 완충이고,
  근본 해결은 나중에 "AMI에 앱 굽기"나 EventBridge 자동 재배포로 확장한다)

## 14. 운영 (v2 기준)

- 재배포: Actions → Deploy → Run workflow. 같은 커밋이 새 Green으로 나간다
- 롤백: 직전 커밋 sha의 bundle.zip이 S3에 있으므로, CodeDeploy 콘솔에서 해당
  리비전으로 배포를 새로 만들거나 Actions에서 이전 커밋 기준 re-run. S3 수명
  주기가 7일이라 그 안의 리비전만 가능하다
- 환경변수 변경: Parameter Store 값 수정 → 재배포. 인스턴스에 들어가 .env를
  만질 일이 없어진다 (`API_BASE_URL`만 시크릿도 같이)
- 서버 접속: v1과 같이 SSM 세션. 단 인스턴스가 언제든 교체되므로 서버 안에
  수동 변경을 남기지 않는다. 남기고 싶은 변경은 전부 user data나 훅 스크립트로
- 로그: `pm2 logs`는 인스턴스 로컬이라 교체되면 사라진다. 당장은 감수하고,
  CloudWatch Logs 에이전트 추가를 후속 과제로 둔다
- 정적 자산: `_next/static`과 `public`을 인스턴스의 Node 서버가 직접 서빙한다.
  트래픽 재라우팅의 겹침 1~2분 동안 구·신 세대가 대상 그룹에 공존해 세대 간
  청크 404가 나는 근본 원인이다(11단계 참고). 완전히 없애려면 정적 자산을
  S3 + CloudFront로 분리(`assetPrefix`)해야 하고, 후속 과제로 둔다

## 15. 구 배포 경로 정리 (전환 안정화 후)

기존 EC2를 중지 상태로 며칠 관찰해 문제가 없으면:

1. 기존 EC2 인스턴스 종료
2. OIDC 롤 인라인 정책에서 `ssm:SendCommand`·`ssm:GetCommandInvocation`
   Statement 제거
3. GitHub 시크릿 `EC2_INSTANCE_ID` 삭제
4. 리포에서 `scripts/deploy/release.sh` 삭제
5. [deploy.md](deploy.md) 서두에 v2 문서로의 안내를 달고, 운영 절(배포 다시
   돌리기·롤백·환경변수)을 v2 기준으로 갱신

## 예상 함정 목록 (미리 적어 두는 것)

v1 문서의 "자주 막히는 곳"에 대응하는, v2에서 새로 생길 만한 지점들.

- CodeDeploy 에이전트가 안 뜸 — user data에서 ruby 설치 누락이거나 리전 버킷
  다운로드 실패. 인스턴스 시스템 로그와 `/var/log/aws/codedeploy-agent/` 확인
- 배포가 Create deployment에서 즉시 실패 — OIDC 롤에 codedeploy 권한 누락,
  또는 애플리케이션·그룹 이름 오타
- Green 인스턴스가 안 생김 — 서비스 롤의 `iam:PassRole` 누락이 일 순위
- AfterInstall 실패 — 파라미터 이름 오타, 인스턴스 롤의 ssm:GetParameter 누락,
  또는 appspec이 zip 루트에 없음
- ValidateService 실패 — `.env`의 `HOSTNAME`·`PORT` 누락, standalone 경로
  (`apps/<app>/server.js`) 어긋남
- 배포는 성공인데 한 도메인만 503 — 배포 그룹에 대상 그룹을 하나만 등록한 것
- 다음 배포에서 "ASG를 못 찾음" — CodeDeploy\_\* ASG로 세대가 교체된 상태에서
  원본 ASG를 지웠거나 Launch Template 버전 참조가 깨진 것

## 진행 순서 요약

| 순서 | 단계                                            | 서비스 영향                       |
| ---- | ----------------------------------------------- | --------------------------------- |
| 1    | Parameter Store 파라미터 2개 생성 (§4)          | 없음                              |
| 2    | IAM 역할 2개 신규 + OIDC 롤 정책 추가 (§5)      | 없음                              |
| 3    | Launch Template 생성 (§6)                       | 없음                              |
| 4    | ASG 생성 (§7)                                   | 없음 (빈 인스턴스 unhealthy 등록) |
| 5    | CodeDeploy 앱·배포 그룹 생성 (§8)               | 없음                              |
| 6    | appspec·훅 스크립트·deploy.yml 작성, PR (§9·10) | 없음                              |
| 7    | main 병합 → 첫 배포 (§11)                       | 없음 (트래픽 공존)                |
| 8    | 기존 EC2 deregister → 중지 (§11)                | 컷오버                            |
| 9    | 두 번째 배포로 Blue/Green·롤백 검증 (§12·13)    | 없음                              |
| 10   | 구 경로 정리, 문서 갱신 (§15)                   | 없음                              |
