# 0068. 배포 v2 착수 — AWS 밑작업과 배포 명세 작성 (KAN-344)

[0067](0067-deploy-v2-plan.md)에서 세운 계획([deploy-v2.md](../deploy-v2.md))을 실제로 실행하기 시작했다.
이 세션에서 한 건 크게 둘이다. AWS 콘솔에서 서비스 영향이 없는 밑작업(Parameter Store,
IAM, Launch Template)을 진행했고, 리포에 CodeDeploy 배포 명세(appspec.yml, 훅 스크립트,
deploy.yml 전면 교체)를 넣었다. ASG 생성부터는 다음 세션이다. 계획서가 "ASG 생성과 첫
배포는 같은 날 잇는다"고 못 박아 둔 구간이라, 리포 PR이 준비된 뒤에 몰아서 하기로 했다.

## 콘솔 밑작업 세 단계

계획서 진행 순서대로 Parameter Store → IAM → Launch Template을 콘솔에서 진행했다.
전부 기존 서비스에 영향이 없는 단계다. 트래픽은 여전히 v1 인스턴스로만 나간다.

Parameter Store에는 `/plick/frontend/web/env`와 `/plick/frontend/mobile/env` 두 개를
SecureString으로 만들었다. 값은 현행 EC2에 SSM 세션으로 들어가 `cat`으로 꺼낸 .env
전문을 그대로 붙여 넣었다. 옮겨 적다 오타 내는 걸 막으려는 계획서의 지시였는데, 실제로
해 보니 이게 맞다. `HOSTNAME=0.0.0.0` 같은 값은 눈으로 옮기다 놓치기 딱 좋다.

IAM은 역할 세 건이다. 인스턴스용 `plick-frontend-ec2-role`(SSM 관리 + CodeDeploy
번들 읽기 + 파라미터 읽기 인라인), CodeDeploy 서비스용 롤, 그리고 기존 GitHub Actions
OIDC 롤에 codedeploy 권한 Statement 추가. v1의 SSM Run Command 권한은 지우지 않고
남겨 뒀다. 전환이 틀어지면 v1로 되돌아갈 수 있어야 해서, 제거는 안정화 후(15단계)로
미룬다.

Launch Template은 계획서 그대로 만들었다. Ubuntu 24.04 x86_64, 현행과 같은 인스턴스
타입, 키 페어 없음, 현행 Next EC2의 보안그룹 재사용, user data에 Node 22 + pm2 +
CodeDeploy 에이전트 설치 스크립트. 스토리지는 기본 8GB 대신 현행 인스턴스에 맞춰
30GB gp3로 잡았다.

## 파라미터 네이밍을 BE와 맞출 뻔한 이야기

Parameter Store 콘솔을 열어 보니 BE 팀 파라미터가 이미 잔뜩 있었다. `/plick/prod/DB_URL`,
`/plick/prod/OAUTH_KAKAO_CLIENT_ID` 같은 식으로, 변수 하나가 파라미터 하나다. 우리도
이름을 맞출까 고민이 됐다.

결론은 계획서 원안대로 "앱당 파라미터 하나, .env 파일 통째"로 갔다. 이유는 두 가지다.

먼저 스크립트 단순성이다. 변수별로 쪼개면 앱당 8개, 두 앱이면 파라미터 16개가 되고,
배포 훅이 `get-parameters-by-path`로 받아서 `KEY=VALUE`로 조립하는 파싱 로직을 가져야
한다. 지금 방식이면 `get-parameter` 한 번에 파일로 저장하면 끝이다. 배포 스크립트는
단순할수록 실패 지점이 준다. BE(Spring)는 변수를 개별 주입받는 구조라 쪼개는 게
자연스럽지만, 우리는 최종 산출물이 어차피 .env 파일 하나다. 파일이 단위인데 쪼갰다
다시 합칠 이유가 없다.

다음은 IAM 경계다. BE 인스턴스 롤은 `/plick/prod/*` 읽기 권한을 갖고 있을 것이다.
우리 파라미터를 `/plick/prod/frontend/...` 아래 넣으면 BE 서버가 프론트 파라미터까지
읽을 수 있게 된다. `/plick/frontend/*`로 분리하면 BE 롤은 BE 것만, 프론트 롤은 프론트
것만 읽는다. `/plick` 최상위를 공유하니 한 서비스 소속이라는 그룹핑은 이미 되고, 그
아래에서 팀별로 갈라지는 구조가 오히려 깔끔하다.

## CodeDeploy 서비스 롤 이름에 frontend를 붙였다

계획서에는 `plick-codedeploy-role`이었는데 BE도 곧 CodeDeploy를 쓸 예정이라
`plick-frontend-codedeploy-role`로 바꿨다. 이름 구분 때문만은 아니고, 이 롤의 인라인
`iam:PassRole`이 `plick-frontend-ec2-role` 하나로 좁혀져 있는 게 핵심이다. 롤을 BE와
공유하면 나중에 BE 인스턴스 롤의 PassRole까지 여기 얹으면서 프론트 배포가 BE 롤을
넘길 수 있는 권한을 갖게 된다. 팀별 서비스 롤 분리가 PassRole 경계를 그대로 유지한다.
계획서의 해당 절도 바뀐 이름으로 고쳐 뒀다.

PassRole은 처음 보면 낯선 권한인데, "CodeDeploy가 새 EC2 인스턴스를 만들 때 그
인스턴스에 IAM 역할을 붙여도 되는가"를 통제한다. 이게 없으면 Green 인스턴스 기동이
소리 없이 실패한다고 계획서 함정 목록에도 올라 있다. 역할을 넘겨주는(pass) 행위 자체가
권한 상승 통로가 될 수 있어서 AWS가 별도 권한으로 끊어 둔 것이다.

## 리포 변경 — 배포 명세가 코드로 들어왔다

v1은 release.sh 하나가 서버에서 다운로드·압축 해제·심볼릭 링크 교체·기동·헬스체크·
롤백을 다 했다. v2는 이 몸통이 CodeDeploy 훅 다섯 개로 쪼개진다. appspec.yml이 번들
루트에서 "어느 시점에 어느 스크립트를 누구 권한으로 돌릴지"를 선언하고, 에이전트가
그 순서대로 실행한다.

훅 순서는 `ApplicationStop → BeforeInstall → (파일 복사) → AfterInstall →
ApplicationStart → ValidateService`다. 파일 복사, 그러니까 번들을 `/srv/plick/bundle`에
푸는 건 에이전트가 훅 사이에서 직접 한다. S3에서 번들을 내려받는 것도 에이전트 몫이다.
v1 release.sh에 있던 `aws s3 cp`가 스크립트에서 사라진 이유다.

각 훅을 짜면서 신경 쓴 지점들.

- `application_stop.sh`는 사실상 보험이다. Blue/Green의 Green은 매번 새 인스턴스라
  멈출 프로세스가 없고, 이전 리비전이 없는 인스턴스에서는 CodeDeploy가 이 훅 자체를
  건너뛴다. 그래도 in-place로 돌릴 일이 생길 수 있어 pm2 stop을 넣어 뒀다
- `before_install.sh`는 앱 디렉터리를 지우고 다시 만든다. Green은 어차피 비어 있지만
  재배포 상황에서도 같은 결과가 나오게 멱등하게 짰다
- `after_install.sh`가 핵심이다. tarball을 풀고 Parameter Store에서 .env를 만든다.
  `--with-decryption`이 SecureString을 평문으로 복호화해 주는 옵션이고, 이 호출이
  되려면 인스턴스 롤의 인라인 정책이 필요하다. 파일은 `chmod 600`으로 잠근다
- `application_start.sh`에서 .env 소싱을 앱마다 서브셸 `( ... )`로 감쌌다. `set -a`로
  읽은 web의 환경변수가 셸에 남은 채 mobile을 기동하면 값이 새어 들어갈 수 있다.
  두 .env가 같은 키 집합이라 실제로는 다 덮어써지긴 하는데, 키가 어긋나는 순간
  터지는 조용한 폭탄이라 격리해 두는 게 맞다. `set -a`는 이후 선언되는 변수를 전부
  export로 만드는 옵션이다. 이게 없으면 .env를 소싱해도 현재 셸 변수로만 남고 pm2가
  띄우는 자식 프로세스(server.js)에는 안 넘어간다
- `validate_service.sh`는 3000·3001 각각 `/api/health`가 200을 줄 때까지 최대 60초
  기다린다. 여기서 실패하면 CodeDeploy가 배포를 Failed로 끝내고, 트래픽 재라우팅
  전이라 Blue가 그대로 서비스 중이다. v1처럼 스크립트가 직접 심볼릭 링크를 되돌리는
  롤백 코드가 필요 없어졌다. 실패의 뒷정리를 스크립트가 아니라 배포 시스템이 하는
  구조로 바뀐 것이다

v1 release.sh에서 안 가져간 것들도 계획서 그대로다. flock 직렬화는 배포가 번들 1건이
됐고 에이전트가 인스턴스당 배포를 하나씩만 돌리므로 경합 자체가 없다. releases/
심볼릭 링크와 릴리스 보관은 롤백 단위가 "릴리스 디렉터리"에서 "인스턴스"로 바뀌어
필요가 없다. 되돌리기는 이전 sha의 bundle.zip으로 배포를 다시 만드는 것이다.

release.sh 자체는 아직 지우지 않았다. 기존 EC2가 전환 완료까지 v1 경로로 서비스
중이고, 되돌아갈 가능성이 있는 동안은 v1 배포가 돌아가야 한다. 삭제는 15단계다.

## deploy.yml — matrix 2잡에서 단일 잡으로

v1은 web과 mobile이 matrix로 각자 빌드하고 각자 SSM 명령을 쏘는 2잡이었다. v2는
단일 잡이다. Blue/Green에서 인스턴스가 통째로 교체되는데 앱별로 배포 2건을 만들면
한 ASG를 두 배포가 서로 복제하고 종료하며 싸운다. 그래서 배포 단위가 "두 앱을 담은
번들 1건"이 됐고, 잡도 하나로 합쳐졌다.

빌드와 standalone 조립 스텝은 v1 것을 그대로 가져왔다. 러너(x86_64)에서 빌드해야
sharp 같은 네이티브 바이너리가 EC2에서 도는 것도, standalone에 `.next/static`과
`public`을 채워 넣어야 하는 것도 달라지지 않았다.

번들 조립에서 계획서가 경고한 함정 하나를 그대로 조심했다. appspec.yml이 zip의
루트에 있어야 한다. `zip -r bundle.zip bundle/`처럼 디렉터리를 바깥에서 zip하면
`bundle/appspec.yml`로 한 겹 싸여서 에이전트가 appspec을 못 찾는다. `(cd bundle &&
zip -r ../bundle.zip .)`로 안에 들어가서 zip했다.

배포 생성과 대기는 `aws deploy create-deployment` + `aws deploy wait
deployment-successful` 두 줄이다. v1의 send-command 폴링 루프 40줄이 이걸로 줄었다.
wait는 15초 간격으로 최대 30분 기다리다 배포가 실패로 끝나면 non-zero로 빠져 잡이
빨간불이 된다. 대신 훅 스크립트의 stdout이 러너로 안 오는 건 v1 대비 후퇴라, 실패 시
`get-deployment`로 어느 훅에서 죽었는지 요약을 찍는 스텝을 뒤에 달았다. deployment id는
`GITHUB_OUTPUT`으로 스텝 간에 넘긴다. 상세 로그가 필요하면 CodeDeploy 콘솔의 배포
상세 → 이벤트로 가야 한다.

## 다음 세션에서 할 것

여기까지가 "언제 해도 되는" 구간이다. 다음은 서비스에 인접한 구간이라 순서와 타이밍이
중요하다.

1. 이 브랜치 PR → develop 병합
2. 하루 잡아서: ASG 생성 → CodeDeploy 앱·배포 그룹 생성 → main 병합으로 첫 배포
3. 첫 배포 검증 후 기존 EC2 deregister → 중지 (컷오버)
4. 두 번째 배포로 진짜 Blue/Green과 실패 시나리오 검증

ASG를 만드는 순간부터 빈 인스턴스 2대가 대상 그룹에 unhealthy로 등록된다. 기존 EC2가
healthy라 ALB는 그쪽으로만 보내니 서비스 영향은 없지만, 이 상태에서 기존 EC2까지
unhealthy가 되면 ALB가 fail-open으로 전 대상에 트래픽을 뿌리는 위험 구간이라 길게
끌지 않는다.
