# 0084. prod VPC에 프론트엔드 스택 복제 (KAN-377)

날짜: 2026-08-07

## 배경

ADR 0083에서 기존 환경을 dev로 확정하고 도메인과 배포 트리거를 옮겼다. 이제 그
후속으로, 백엔드 팀이 만들어 둔 prod VPC에 프론트엔드 스택을 복제한다. deploy-v2.md가
절차서고, 네이밍은 기존 무접미사(=dev)를 그대로 두고 prod 쪽에 -prod 접미사를 붙인다.
백엔드가 이미 이 규칙으로 가고 있다(plick-alb-pub-prod, plick-alb-pri-prod가 확인됨).

## 실사부터 했다: 생각보다 훨씬 많이 만들어져 있었다

바로 리소스를 만들기 시작하지 않고 prod VPC(plick-vpc-prod, vpc-052684451c095e582)에
뭐가 있는지부터 콘솔에서 전수 확인했다. 보안그룹과 대상 그룹, 서브넷은 VPC에 종속이라
dev 것을 하나도 재사용할 수 없어서, deploy-v2.md §2의 "사전 준비물" 목록을 prod 기준으로
다시 채워야 했기 때문이다.

결과가 예상 밖이었다. "우리 EC2만 없을 것"이라고 갔는데 실제로는 프론트 몫의 주변
리소스까지 거의 다 깔려 있었다.

- 대상 그룹 tg-front-web-prod(3000), tg-front-mobile-prod(3001)이 이미 있고
  헬스체크도 /api/health로 잡혀 있었다. 등록 취소 지연도 30초(KAN-373과 동일)
- 퍼블릭 ALB 리스너에 호스트 규칙(plick.co.kr→web, m.plick.co.kr→mobile,
  admin.plick.co.kr→admin)이 이미 걸려 있었다
- FE EC2용 보안그룹 front-sg-prod까지 있었다. 인바운드가 pub-alb-sg-prod 소스로
  TCP 3000-3001 범위라 web·mobile 둘 다 커버한다
- 프라이빗 서비스 서브넷 pri-svc-a-prod(2a)·pri-svc-c-prod(2c), NAT(plick-nat-prod),
  라우팅 테이블 pri-rt-prod도 전부 있었다
- Route 53의 main.plick.co.kr → 내부 ALB(plick-alb-pri-prod) 별칭 레코드도 BE가
  이미 만들어 뒀다. origin.plick.co.kr도 어느새 plick-alb-pub-prod를 가리키고 있었다
- CloudFront 배포 2개(plick web prod, plick mobile prod)와 정적 버킷
  plick-static-prod, 버킷 정책(OAC + 배포 ARN 2개)까지 완성돼 있었다

결국 이번 세션에서 실제로 만든 AWS 리소스는 S3 게이트웨이 엔드포인트(s3-ep-prod),
Parameter Store 파라미터 2개, IAM 역할 2개, Launch Template, ASG, CodeDeploy
애플리케이션·배포 그룹이 전부다. 실사를 먼저 한 덕에 이중 생성 없이 빈 곳만 채웠다.
티켓에 적어 둔 "매 순간 네이밍이 필요할 땐 기존 백엔드의 네이밍을 확인하고 참고한다"가
말 그대로 진행 방식이 됐다.

## prod의 오리진 보안 패턴은 dev와 다르다

제일 큰 발견이었다. dev는 CloudFront가 오리진(퍼블릭 ALB)에 HTTPS로 붙는다. SNI가
origin.plick.co.kr이라 ALB에 와일드카드 인증서를 단 443 리스너가 필요했다. 그런데
prod ALB에는 443 리스너가 아예 없고 80 하나뿐이었다. 처음에는 "HTTPS 리스너를 우리가
추가해야겠네"라고 판단했는데, 리스너 규칙을 열어 보니 다른 그림이었다.

prod는 세 겹으로 오리진을 잠근다.

1. CloudFront가 ALB에 HTTP:80으로 붙는다. 인증서가 아예 필요 없다
2. pub-alb-sg-prod 인바운드가 CloudFront 관리형 프리픽스 리스트(pl-22a6434b,
   CloudFront origin-facing IP 대역 전체)만 허용한다. CloudFront를 거치지 않은
   직접 접근은 SG에서 끊긴다
3. 리스너 규칙마다 X-Origin-Verify 커스텀 헤더의 시크릿 값을 AND 조건으로 검사한다.
   CloudFront 오리진 설정이 이 헤더를 넣어 주므로, 프리픽스 리스트 안에서 오는
   요청이라도(즉 남의 CloudFront 배포가 우리 ALB를 오리진으로 잡아도) 헤더가 없으면
   기본 규칙의 404로 떨어진다

viewer↔CloudFront 구간은 어차피 ACM 인증서로 HTTPS고, CloudFront↔ALB 구간은 AWS
백본 안이라 HTTP여도 감수할 만하다는 트레이드오프다. 이 패턴 덕에 prod에서는 ALB
인증서도, origin용 별칭 레코드도 필수가 아니게 됐다(레코드는 BE가 만들어 둬서 그대로
오리진 도메인으로 쓴다). 대신 prod CloudFront를 만들 때 커스텀 헤더를 빠뜨리면 전부
404가 나는 함정이 생기는데, BE가 배포까지 다 만들어 놔서 검증만 하고 지나갔다.

호스트 헤더 규칙이 동작하려면 뷰어의 Host가 ALB까지 그대로 가야 한다는 건 dev와
같다. 오리진 요청 정책 Managed-AllViewer가 그 역할이다.

## 우리가 만든 것들

deploy-v2.md 순서를 그대로 밟되 이름만 -prod로 갔다. 값은 실사에서 수집한 것들이다.

- S3 게이트웨이 엔드포인트 s3-ep-prod: prod VPC에 유일하게 빠져 있던 네트워크 조각.
  pri-rt-prod에 연결했다. CodeDeploy 에이전트 설치와 번들 다운로드가 NAT 요금 없이
  이 경로로 나간다
- Parameter Store: /plick/frontend/web/prod/env, /plick/frontend/mobile/prod/env.
  경로 얘기는 아래 절에서
- IAM: plick-frontend-ec2-role-prod(인스턴스 롤. SSM 코어 + CodeDeploy S3 읽기 +
  파라미터 읽기 인라인)와 plick-frontend-codedeploy-role-prod(서비스 롤.
  AWSCodeDeployRole + AmazonEC2FullAccess + PassRole 인라인). 파라미터 읽기 정책의
  Resource를 parameter/plick/frontend/\*/prod/env로 좁혀서 prod 인스턴스는 prod
  파라미터만 읽는다. 중간에 BE의 CodeDeploy 롤(plick-codedeploy-role)을 같이 쓸까
  검토했다. BE 롤 목록을 보니 서비스별 bluegreen 롤까지 따로 파는 구조라 잠깐
  그쪽으로 기울었는데, 결국 원래 계획(우리 전용 롤 분리)으로 돌아왔다. PassRole
  경계가 팀별로 좁게 유지되는 쪽이 낫다
- Launch Template plick-frontend-lt-prod: dev와 동일(Ubuntu 24.04 x86_64, t3.small,
  30GB gp3, 키 페어 없음, user data 동일)에 보안그룹만 front-sg-prod, 프로파일만
  prod 롤. user data는 환경 의존 값이 하나도 없어서 그대로 복사했다
- ASG plick-frontend-asg-prod: pri-svc-a/c-prod 2AZ, 대상 그룹 2개 연결, 상태 확인
  EC2(ELB 아님 — 갓 태어난 인스턴스에는 앱이 없어서 ELB 기준이면 무한 재생성),
  유예 300초, 2/2/4. 비용 아끼려고 1/1/2로 시작하는 안도 얘기했지만 실서비스
  원칙대로 dev와 같은 2/2/4로 갔다. 빈 인스턴스 2대가 unhealthy로 등록되는 건
  dev 때와 같은 정상 상태고, prod는 아직 트래픽 자체가 없어서 부담도 없다
- CodeDeploy: 애플리케이션 plick-frontend-prod, 배포 그룹 plick-frontend-dg-prod.
  Blue/Green, ASG 자동 복사, AllAtOnce, 대상 그룹 2개 모두 지정(하나만 걸면 나머지
  도메인이 배포 후 503 나는 dev 때 함정), 재라우팅 즉시, Blue 종료 대기 5분.
  콘솔 기본값이 Blue 종료 대기 1시간으로 잡혀 있어서 5분으로 줄였다

## 파라미터 경로: BE 규칙에 맞추고 훅이 환경을 판별한다

Parameter Store를 열어 보니 BE는 /plick/<서비스>/<환경>/env 구조였다
(/plick/main/prod/env, /plick/fastapi/dev/env). 우리 dev 파라미터
(/plick/frontend/web/env)만 환경 세그먼트가 없는 구식이었다. prod 파라미터는 BE
규칙을 따라 /plick/frontend/<앱>/prod/env로 만들었다. frontend 아래 앱이 둘(web,
mobile)이라 세그먼트가 하나 더 있는 것만 다르다.

그러면 배포 훅(after_install.sh)이 어느 경로를 읽을지 환경마다 갈라야 한다. 번들
하나가 dev와 prod에 똑같이 나가기 때문에 스크립트 안에서 판별해야 하는데, CodeDeploy
에이전트가 훅 프로세스에 DEPLOYMENT_GROUP_NAME 환경변수를 넣어 준다는 걸 이용했다.
배포 그룹 이름은 dev가 plick-frontend-dg, prod가 plick-frontend-dg-prod라 -prod
접미사 여부로 갈리고, 스크립트는 그걸로 DEPLOY_ENV를 정해
/plick/frontend/<앱>/$DEPLOY_ENV/env를 읽는다.

이 방식의 대가로 dev 파라미터도 /plick/frontend/<앱>/dev/env로 옮겨야 한다. 새 이름의
파라미터를 만들어 두고(값은 기존 것 복사), 이 변경이 develop에 병합되면 그때부터 dev
배포가 새 경로를 읽는다. dev 인스턴스 롤(plick-frontend-ec2-role)의 파라미터 정책이
/plick/frontend/\*라 새 경로도 이미 커버한다. 옛 이름 파라미터는 바로 지우면 안 된다.
S3에 남아 있는 옛 번들(7일 수명)로 롤백하면 그 번들 안의 옛 스크립트가 옛 이름을
읽기 때문에, 옛 번들이 다 만료된 뒤에 지운다.

## deploy.yml: 브랜치-환경 매핑을 GitHub Environments로

ADR 0083에서 "prod를 구축하면 GitHub Environments로 브랜치-환경 매핑을 만들면서
main을 되살린다"고 남겨 둔 그 작업이다.

트리거를 branches: [develop, main]으로 되살리고, 잡에
environment: ${{ github.ref_name == 'main' && 'prod' || 'dev' }}를 걸었다.
GitHub Environments는 시크릿을 환경 단위로 스코프하는 기능인데, 잡이 environment를
선언하면 그 환경의 시크릿이 같은 이름의 리포 시크릿을 덮는다. API_BASE_URL이 dev는
http://dev-main.plick.co.kr, prod는 http://main.plick.co.kr로 갈리는 걸 이걸로 풀었다.
gh api로 환경 2개를 만들고 gh secret set --env로 환경별 값을 넣었다.

환경마다 다른 나머지 값들(사이트 URL 2개, CodeDeploy 앱·그룹 이름, 정적 버킷, 배포
접두사)은 시크릿이 아니라 공개 상수라서 Environments의 variables로 빼는 대신 잡 env의
삼항 분기로 파일 안에 남겼다. 값이 워크플로 파일에 그대로 보여야 리뷰와 diff에서
실수를 잡기 쉽다는 판단이다. NEXT_PUBLIC_SITE_URL이 틀리면 canonical과 sitemap이
통째로 엉뚱한 도메인을 가리키는 값이라 특히 그렇다.

배포 아티팩트 키는 frontend/<sha>/bundle.zip에서 frontend/<env>/<sha>/bundle.zip으로
바꿨다. develop과 main의 sha가 다르니 같은 접두사를 써도 보통은 안 부딪히지만,
fast-forward 병합처럼 같은 sha가 두 환경에 배포되는 경우 서로 덮어쓴다. 사이트 URL이
빌드에 박혀서 두 환경의 번들은 내용이 다르므로, 같은 sha라도 키가 갈려야 롤백이
안전하다. frontend/\* 기준인 OIDC 롤의 s3 권한과 버킷 수명 주기 규칙(7일)이 새 키도
그대로 덮어서 AWS 쪽 손질은 없다.

concurrency 그룹도 deploy-dev/deploy-prod로 갈라서 두 환경의 배포가 서로를 기다리지
않게 했다. workflow_dispatch는 실행 ref를 따라간다. develop에서 돌리면 dev, main에서
돌리면 prod다.

정적 자산은 prod가 plick-static-prod 버킷의 <앱>/\_next/static으로 올라간다. dev와
버킷을 가른 건 dev 배포가 prod 자산을 건드릴 일을 없애고 접근 정책(OAC의 배포 ARN)을
환경별로 잠그기 위해서다. 이 때문에 OIDC 배포 롤에 plick-static-prod에 대한 s3 권한을
추가해야 한다(아래 남은 것).

## 남은 것

첫 prod 배포 전에 해야 하는 것.

- Parameter Store에 dev 파라미터 새 경로 2개 생성: /plick/frontend/web/dev/env,
  /plick/frontend/mobile/dev/env (값은 기존 /plick/frontend/<앱>/env 복사).
  이 PR이 develop에 병합되면 dev 배포가 바로 새 경로를 읽으므로 병합 전에 있어야 한다
- OIDC 롤(plick-frontend-deploy) 인라인 정책에 추가: prod CodeDeploy 리소스
  (application:plick-frontend-prod, deploymentgroup:plick-frontend-prod/\*)와
  plick-static-prod 버킷의 s3:PutObject·ListBucket. 신뢰 정책의 main 브랜치는
  v1 때부터 있어서 손댈 게 없다
- develop 병합으로 dev 배포가 새 경로·새 키로 정상 도는 것 확인 → main 병합으로
  첫 prod 배포

컷오버와 그 후.

- 첫 prod 배포 성공과 검증(13단계 체크리스트) 후 Route 53에 실도메인 A 별칭 생성:
  plick.co.kr → plick web prod 배포, m.plick.co.kr → plick mobile prod 배포.
  이전 세션에서 "죽은 레코드를 남겨 둔다"고 했었는데 그 사이 정리돼서 새로 만들면 된다
- OAuth prod 앱 분리(카카오·구글)와 prod 파라미터의 client id 교체. 지금은 dev와
  같은 앱을 쓰고 리다이렉트 URI만 실도메인이다
- 옛 dev 파라미터(/plick/frontend/<앱>/env) 삭제는 옛 번들 만료(7일) 후
- CLAUDE.md와 배포 문서의 도메인 표기 갱신, deploy-v2.md에 환경 이원화 반영

## OIDC가 두 번 발목을 잡았다: environment sub와 BE 롤 개편

PR을 병합하자 첫 dev 배포가 AssumeRoleWithWebIdentity 거부로 죽었다. 원인은 두 겹이었고
푸는 데 시행착오를 꽤 썼다.

첫째는 GitHub OIDC의 동작이다. 잡에 environment:를 선언하면 OIDC 토큰의 sub 클레임이
ref:refs/heads/develop 형태에서 repo:<org>/<repo>:environment:dev 형태로 바뀐다.
신뢰 정책은 브랜치 형태만 허용하고 있었으니 거부가 맞다. Environments를 도입하는 쪽이
신뢰 정책도 environment 형태로 같이 바꿔야 한다는 걸 이번에 몸으로 배웠다.

둘째가 진짜 함정이었다. 신뢰 정책을 고쳐도 계속 같은 에러가 났다. 알고 보니 BE 팀원이
같은 날 IAM 롤 체계를 새 네이밍(plick-front-\*-<env>)으로 엎는 중이었고, GitHub 리포
시크릿 AWS_DEPLOY_ROLE_ARN을 이미 새 롤(plick-front-github-role-dev)로 바꿔 둔
상태였다. 우리는 옛 롤(plick-frontend-deploy)의 신뢰 정책을 열심히 고치고 있었는데
워크플로는 그 롤을 쳐다보지도 않았던 것이다. 롤 목록의 "마지막 활동"이 실패한 assume은
기록하지 않는다는 것도 이때 알았다. 진단 단서는 "정책을 고쳤는데도 증상이 그대로"와
"옛 롤에 활동이 안 찍힘"의 조합이었다.

정리는 이렇게 했다. dev/prod 환경 시크릿에 AWS_DEPLOY_ROLE_ARN을 각각 넣어 리포
시크릿 의존을 끊었다(환경 시크릿이 같은 이름의 리포 시크릿을 덮는다). BE가 만든 dev
롤은 신뢰 정책만 environment:dev로 고쳐 쓰고, prod 롤(plick-front-github-role-prod)은
우리가 같은 패턴으로 만들었다. sub에 와일드카드가 없으니 StringLike 대신 StringEquals로
넣어 콘솔 경고도 없앴다. S3 아티팩트 권한은 dev 롤이 frontend/*인 것과 달리 prod 롤은
frontend/prod/*로 좁혀서 prod 롤이 dev 번들 자리를 못 건드리게 했다.

## 첫 prod 배포: 성공했는데 Green이 1대뿐이었다

main 병합으로 첫 prod 배포가 돌았고 워크플로는 성공으로 끝났다. curl로 CloudFront에
직접 붙어(--connect-to로 Host는 실도메인인 채 d2yzxywg4wxdrt.cloudfront.net에 연결)
홈 200, /api/health 200, 모바일 canonical이 https://plick.co.kr, \_next/static 청크가
S3 오리진에서 immutable 헤더로 나오는 것까지 확인했다. DNS 컷오버 전에 실도메인 Host로
검증하는 이 방법은 기억해 둘 만하다. CloudFront 기본 도메인으로 그냥 접근하면 Host가
d\*.cloudfront.net이라 ALB 호스트 규칙에 안 걸려 404가 나기 때문에, Host를 유지한 채
연결만 배포로 보내야 한다.

그런데 CodeDeploy 콘솔의 배포 상세를 보니 대체(Green) 인스턴스가 1/2이었다. 한 대는
BeforeInstall에서 실패했는데 배포 전체는 성공. CodeDeployDefault.AllAtOnce의 최소 정상
인스턴스 기준이 0이라 한 대만 살아도 배포가 성공 처리되는 것이었다. 실패한 인스턴스는
EC2로는 "실행 중"이지만 앱이 없고 대상 그룹에서 unhealthy로 트래픽을 안 받는 좀비가
된다. ASG 상태 확인이 EC2 기준이라 교체도 안 된다.

실패 원인은 user data와 CodeDeploy 에이전트의 경주였다. user data 순서가 "Node·pm2 →
에이전트 설치 → aws CLI(snap) → /srv/plick 생성"인데, 에이전트는 설치되는 순간부터
배포를 받을 수 있다. 에이전트가 배포를 먼저 받아버리면 /srv/plick이 아직 없고, 훅은
ubuntu로 도는데 /srv는 root 소유라 mkdir -p가 권한 거부로 죽는다. Green 두 대 중
한 대는 user data가 먼저 끝나 성공했고 한 대는 경주에서 졌다. dev에서 여태 안 터진
건 순전히 운이었다. 실패 인스턴스가 SSM 관리형으로도 등록되지 않은 것(managed: false)이
부팅이 깨끗하게 안 끝났다는 방증이었다.

해법은 user data에서 에이전트 설치를 맨 마지막으로 옮기는 것. 에이전트가 뜨는 시점에는
/srv/plick과 aws CLI가 이미 준비돼 있게 된다. deploy-v2.md의 user data도 같은 순서로
고쳐야 한다(dev LT에도 같은 폭탄이 숨어 있다).

## IAM 롤 이름 통일 (plick-front-\*-<env>)

BE의 개편에 맞춰 프론트 쪽 IAM도 plick-front-\* + 환경 접미사로 통일하기로 했다. IAM
롤은 개명이 안 되므로 전부 "새로 만들고 → 참조 바꾸고 → 옛것 삭제"다. BE가 이미 dev를
끝냈고(옛 plick-frontend-ec2-role은 삭제됨) prod는 우리 몫이었다.

- plick-front-ec2-role-prod: BE가 만들어 둔 것에 관리형 2개는 이미 있었고, 파라미터
  읽기 인라인 정책의 Resource가 /plick/front/prod/_로 미리 적혀 있어서 실제 경로
  (/plick/frontend/_/prod/env)로 고쳤다. BE는 파라미터 경로까지 front로 바꿀 생각으로
  쓴 듯한데, 경로 개명은 파라미터 재생성 + 훅 수정 + 재배포가 한 세트라 따로 합의해서
  하기로 하고 이번엔 롤 이름까지만 갔다
- plick-front-codedeploy-role-prod: 신규 생성 (AWSCodeDeployRole + AmazonEC2FullAccess
  - PassRole → plick-front-ec2-role-prod)
- Launch Template 새 버전에 프로파일 교체와 user data 순서 수정을 같이 담아 Default로
  승격, 배포 그룹 서비스 롤도 교체. 재배포 한 번으로 검증한다
- 옛 롤 삭제는 반드시 새 프로파일로 인스턴스가 다 교체된 뒤에 한다. 살아 있는
  인스턴스가 쓰는 인스턴스 롤을 먼저 지우면 SSM 접속과 롤백이 깨진다

## dev 리소스도 -dev 접미사로: 스택 재구축

롤 정리를 하다 보니 dev 리소스들만 무접미사로 남는 게 걸렸다. "무접미사 = dev"라는
암묵 규칙은 prod가 생긴 순간부터 혼동의 씨앗이라, 우리 이름이 들어가는 모든 곳에
-dev를 붙이기로 했다. 네이밍은 IAM만 BE의 plick-front-_를 따르고 나머지는 쓰던
frontend를 유지한다(prod가 이미 plick-frontend-_-prod라 dev만 맞추면 대칭이 된다).

문제는 AWS에서 이름 변경이 되는 리소스가 거의 없다는 것. LT·ASG·CodeDeploy 앱·대상
그룹·보안그룹·S3 버킷 전부 재생성만 가능하다. 처음엔 새 스택을 옆에 세워 무중단으로
갈아타는 순서를 짰는데, dev는 어차피 재배포 한 번이면 살아나는 환경이라 롤백 안전핀
없이 "지우면서 다시 만드는" 쪽으로 단순화했다. 순서만 지키면 된다: 규칙이 참조하는
TG는 먼저 대상을 갈아야 지워지고, 인스턴스가 쓰는 SG는 인스턴스가 죽어야 지워진다.

- 새 TG(tg-front-web-dev·tg-front-mobile-dev) 생성 → ALB dev 호스트 규칙의 대상 교체
  → 옛 TG 삭제 (이 시점부터 dev 다운)
- 옛 CodeDeploy 앱(plick-frontend)·CodeDeploy\_\* ASG·LT 삭제
- front-sg-dev 생성, dev 내부 ALB SG(pri-alb-sg)의 인바운드 소스를 옛 FE SG에서
  교체 후 옛 SG 삭제. 이 교체를 빠뜨리면 새 인스턴스가 BE에 못 붙어 SSR이 빈다
- 새 LT(plick-frontend-lt-dev, user data는 에이전트 마지막 순서)·ASG
  (plick-frontend-asg-dev)·CodeDeploy(plick-frontend-dev/plick-frontend-dg-dev) 생성
- 정적 버킷 plick-static-dev 생성, dev CloudFront 2개의 S3 오리진 교체, OAC 버킷
  정책. 옛 plick-static은 새 경로로 배포가 확인된 뒤 비우고 삭제한다
- deploy.yml의 dev 분기 상수 3개(CODEDEPLOY_APP·GROUP·STATIC_BUCKET)를 -dev 이름으로
  교체하는 PR → 병합 배포로 dev가 새 스택에서 살아난다

prod 재배포(user data 순서 수정 + 새 롤)는 2/2 성공으로 확인됐다. AllAtOnce가 1/2를
성공으로 치던 그 구멍이 새 user data 순서로 막혔다는 증거다.
