# 0067. 배포 전략 v2 계획 수립 — CodeDeploy Blue/Green으로 가는 설계 (KAN-343)

이번 세션에서는 코드를 짜지 않았다. 대신 배포 전략을 갈아엎는 계획 문서
([deploy-v2.md](../deploy-v2.md))를 썼다. KAN-343 티켓의 목표는 지금의 "EC2 한 대 +
pm2 + SSM Run Command" 배포([deploy.md](../deploy.md), ADR
[0059](0059-mobile-ec2-deploy.md)·[0064](0064-private-ec2-ssm-deploy.md))를
참조 저장소 [devops-3-tier-practice의 backend-cicd 브랜치](https://github.com/hojun121/devops-3-tier-practice/tree/backend-cicd)
구조, 그러니까 Launch Template + Auto Scaling Group + CodeDeploy Blue/Green으로
바꾸는 것이다. 실제 인프라 작업 전에 순서와 판단을 먼저 문서로 굳혔다.

## 참조 구조를 읽으며 정리한 것

참조 README는 백엔드 실습용이라 그대로 베낄 수는 없었다. 뼈대는 같다. GitHub
Actions가 번들을 S3에 올리고 CodeDeploy가 ASG를 복제해 Green 인스턴스를 만들고,
appspec.yml의 훅(ApplicationStop → BeforeInstall → AfterInstall →
ApplicationStart → ValidateService)으로 배포한 뒤 헬스체크가 통과하면 트래픽을
넘긴다. IAM은 역할 세 개(인스턴스용, CodeDeploy 서비스용, GitHub OIDC용)로
나뉜다. 여기까지는 우리도 똑같이 간다.

다른 지점이 네 개 있었고, 각각 판단이 필요했다.

## 판단 1. 두 앱을 배포 한 건으로 묶는다

우리는 한 인스턴스에 web(3000)과 mobile(3001)이 같이 뜬다. v1은 앱별로 matrix
2잡이 각자 SSM 명령을 보냈다. 처음에는 v2도 앱별로 CodeDeploy 애플리케이션을
두 개 만들까 생각했는데, 금방 접었다. Blue/Green은 인스턴스를 통째로 교체하는
방식이라, 같은 ASG를 놓고 두 배포가 각자 복제와 종료를 돌리면 서로의 Green을
죽이는 그림이 된다. 배포 단위를 "두 앱을 담은 번들 1건"으로 바꾸는 게 맞다.
appspec 훅이 tarball 두 개를 풀고 pm2 프로세스 두 개를 띄우고, ValidateService가
두 포트를 다 본다. 대신 한 앱만 고쳐도 둘 다 다시 나가는데, 어차피 v1도 main
푸시마다 두 앱이 다 나갔으니 잃는 게 없다.

이 결정에 딸려 오는 게 대상 그룹 문제다. 트래픽이 호스트 헤더로 tg-front-web과
tg-front-mobile 두 과녁에 갈리는데, 배포 그룹에 하나만 등록하면 나머지 도메인은
Blue가 죽는 순간 과녁이 비어 503이 난다. CodeDeploy 배포 그룹은 대상 그룹을
여러 개 받을 수 있어서 둘 다 등록하는 것으로 계획에 못 박았다.

## 판단 2. .env는 user data가 아니라 Parameter Store

참조 실습은 .env를 Launch Template user data에서 만든다. 따라 하면 OAuth client
id 같은 값이 템플릿 평문에 남고, 값 하나 바꿀 때마다 템플릿 버전을 새로 파야
한다. 무엇보다 v1에서 이미 "인스턴스는 언제든 죽을 수 있고 .env는 손으로 만든
파일"이라는 조합이 위험하다는 걸 알고 있었다. ASG로 가면 인스턴스가 정말로
수시로 태어나므로, 런타임 환경변수를 SSM Parameter Store(SecureString, 앱당
파라미터 하나에 .env 내용 통째)로 옮기고 AfterInstall 훅이 매번 내려받아 .env를
만드는 걸로 정했다. 값 변경이 "파라미터 수정 + 재배포"로 끝난다.

API_BASE_URL의 두 시점 문제(빌드 때 시크릿이 /be 프록시 목적지로 굳고, 실행 때
파라미터가 서버 컴포넌트 fetch를 정한다)는 v2에서도 그대로라, 계획서에 승계
함정으로 다시 적어 뒀다. 이건 구조를 바꿔도 Next 빌드 모델이 그대로인 한 따라온다.

## 판단 3. ASG 헬스체크는 EC2 기준으로 시작

참조 README가 강조하는 지점인데 처음 읽을 때 이유가 바로 와닿지 않았다. 갓 뜬
인스턴스에는 앱이 없다. 앱은 CodeDeploy가 나중에 얹는다. 그래서 ELB 기준으로
두면 ASG가 빈 인스턴스를 unhealthy로 판정해 죽이고 새로 만들기를 무한 반복한다.
EC2 기준(인스턴스 살아 있음)으로 둬야 첫 배포 전의 빈 상태를 버틴다.

대신 구멍이 생긴다. 운영 중 인스턴스가 죽어 ASG가 새로 띄우면, 그 인스턴스는
다음 배포 전까지 앱 없이 unhealthy로 논다. v1의 "죽으면 서비스 전체가 내려간다"
보다는 낫지만(남은 인스턴스가 받는다), 완전하지는 않다. 근본 해결은 앱을 AMI에
굽거나 EventBridge로 스케일 이벤트에 자동 재배포를 거는 건데, 이번 범위에서는
빼고 계획서에 알려진 구멍으로 명시했다. Desired 2가 그 완충이다.

## 판단 4. 컷오버 순서 — 기존 EC2를 안전핀으로

계획에서 제일 공을 들인 부분이다. 참조 실습은 맨땅에 세우는 거라 순서 고민이
없지만, 우리는 서비스 중인 v1 인스턴스가 있다. 준비 단계(파라미터, IAM, LT,
ASG, CodeDeploy, 리포 변경)는 전부 기존 서비스와 무관하게 옆에 세울 수 있다는
걸 확인했고, 트래픽이 실제로 움직이는 순간을 "기존 EC2를 대상 그룹에서
deregister하는 한 동작"으로 좁혔다.

중간 상태도 따져 봤다. ASG를 만들면 빈 인스턴스가 대상 그룹에 unhealthy로
들어오는데, 기존 EC2가 healthy인 동안 ALB는 healthy에만 보내니 무해하다. 다만
ALB는 healthy가 0이 되면 전 대상에 fail-open으로 뿌리므로, 이 어정쩡한 구간을
길게 끌지 말고 ASG 생성과 첫 배포를 같은 날 잇기로 했다. 첫 배포가 성공하면
기존 EC2와 새 인스턴스가 같은 코드로 공존하며 트래픽을 나눠 받고, deregister로
컷오버한 뒤에도 기존 EC2는 종료가 아니라 중지로 며칠 보관한다. 문제가 터지면
기동 + 재등록으로 몇 분 안에 v1으로 돌아가는 안전핀이다. v1 경로의 해체(SSM
권한 제거, EC2_INSTANCE_ID 시크릿 삭제, release.sh 삭제)는 그 관찰 기간이 끝난
뒤로 미뤘다.

## v1에서 가져가지 않는 것들

release.sh를 다시 읽으면서, v1에서 애써 만든 장치 중 v2에서 필요 없어지는 걸
추렸다. flock 직렬화는 배포가 번들 1건이 되고 에이전트가 인스턴스당 배포를
하나씩만 돌리니 경합 자체가 사라진다. releases/ 심볼릭 링크와 최근 5개 보관도
롤백 단위가 릴리스 디렉터리에서 인스턴스로 바뀌어 의미가 없다. 되돌리기는 이전
sha의 bundle.zip으로 CodeDeploy 배포를 다시 만드는 것이다. sudo -u ubuntu -H
곡예는 appspec의 runas: ubuntu가 대체한다. v1의 함정들을 하나씩 "구조가
없애 주는 것"과 "그대로 승계되는 것"으로 갈라 계획서에 반영한 게 이번 문서
작업의 실속이었다고 생각한다.

## 남은 것

- 계획서 순서대로 실제 인프라 작업 (콘솔 작업이라 사람 손)
- appspec.yml, 훅 스크립트 5개, deploy.yml 전면 교체를 담은 브랜치와 PR
- 첫 배포와 컷오버, 두 번째 배포로 Blue/Green·롤백 검증
- 안정화 후 deploy.md를 v2 기준으로 갱신하고 구 경로 정리
- 후속 과제로 CloudWatch Logs 수집과 스케일 이벤트 자동 재배포
