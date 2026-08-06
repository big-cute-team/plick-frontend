# 0083. 개발 환경 도메인 분리와 develop 배포 전환 (KAN-376)

날짜: 2026-08-06

## 배경

지금까지 AWS에 만든 인프라(퍼블릭 ALB + ASG + CodeDeploy + CloudFront 배포 2개 +
plick-static 버킷)는 전부 하나뿐인 환경이었고, 실도메인(plick.co.kr, m.plick.co.kr)이
그 위에 얹혀 있었다. 그런데 이 환경은 CloudFront 앞 WAF로 팀 IP만 허용하는 잠금이
걸린 개발용이다. 실서비스는 VPC를 하나 더 만들어 같은 구성을 복제하기로 했고, 그러면
실도메인은 새 prod 환경 몫이 된다. 이번 세션은 그 분리의 1단계다. 기존 환경을 dev
도메인으로 옮기고, 배포 트리거를 main에서 develop으로 바꿨다.

전체 그림을 먼저 리스트업했는데, 크게 도메인·Route 53·CloudFront, AWS 리소스 네이밍,
CI/CD 분기, OAuth 앱 분리, dev 검색엔진 차단, 문서 정리로 나뉜다. 이 ADR은 그중
도메인 전환과 CI/CD 분기까지의 기록이다. 리소스 네이밍은 prod를 만들 때 기존 이름을
건드리지 않고 prod 쪽에 접미사를 붙이는 방향으로 정리했다. CodeDeploy 앱이나 ASG는
개명이 사실상 재생성이라 기존 것을 loose하게 두는 쪽이 싸다.

## dev 도메인 네이밍: 와일드카드 인증서의 한 단계 함정

처음에는 dev.plick.co.kr과 dev.m.plick.co.kr을 생각했다. 그런데 와일드카드 인증서
`*.plick.co.kr`은 한 단계만 커버한다. dev.plick.co.kr은 되지만 dev.m.plick.co.kr은
점이 두 개라 안 된다. 이걸 쓰려면 `*.m.plick.co.kr`을 SAN으로 포함한 인증서를
재발급해야 하는데, ACM 인증서는 도메인 목록을 수정할 수 없어서 기존 이름까지 다 넣은
새 인증서를 발급받고 CloudFront에서 교체해야 한다. 그것도 CloudFront용은 us-east-1에만
받을 수 있어서 리전 함정까지 겹친다.

모바일 쪽을 dev-m.plick.co.kr로 하면 이 작업이 통째로 사라진다. 하이픈이 들어가도
한 단계 서브도메인이라 기존 와일드카드가 그대로 덮는다. 이걸로 확정했다.

중간에 dev-plick.co.kr은 어떠냐는 얘기가 나왔는데, 이건 서브도메인이 아니라 아예 다른
도메인이다. 점 앞에 붙어야 서브도메인이고, dev-plick은 새로 구매해야 하는 별개
도메인이라 호스팅 영역도 인증서도 전부 새로 필요하다. 기각.

## 도메인 전환: 세 군데를 다 고쳐야 한다

도메인이 CloudFront 배포에 붙기까지 관문이 세 개라는 걸 이번에 확실히 체감했다.

1. CloudFront 대체 도메인(alias): "이 배포가 이 호스트를 받겠다"는 선언.
   이게 없으면 CloudFront가 요청을 배포에 매칭하지 못한다
2. Route 53 레코드: 도메인을 실제로 그 배포로 보내는 DNS. alias만 추가하고
   레코드를 안 만들면 그냥 해석이 안 된다
3. ALB 리스너의 호스트 헤더 규칙: CloudFront 오리진 요청 정책이 AllViewer라
   뷰어가 보낸 Host가 ALB까지 그대로 간다. 규칙에 없는 호스트는 기본 규칙의
   404 고정 응답으로 떨어진다

실제로 순서대로 밟았는데도 두 번 멈췄다. 처음에 CloudFront alias만 바꾸고 됐다고
생각했는데 dig로 권한 있는 네임서버에 직접 물어보니 dev 레코드가 아예 없었다(로컬
캐시 문제인지 가리려면 `dig @<권한NS>`로 물어야 한다). 레코드를 만든 뒤에는 404가
났는데, 응답 헤더의 `server: awselb/2.0`과 `x-cache: Error from cloudfront`가
단서였다. CloudFront는 통과했고 ALB가 뱉은 404라는 뜻이라, 남은 관문이 ALB 호스트
규칙이라는 게 바로 특정됐다. 규칙 하나에 호스트 값을 여러 개 넣으면 OR로 동작하므로
새 규칙을 만들지 않고 기존 web/mobile 규칙에 dev 호스트를 값으로 추가했다.

콘솔 UI에서도 한 번 헷갈렸다. 규칙 편집 화면의 "조건 추가" 버튼은 다른 종류의 조건을
AND로 붙이는 버튼이고, 같은 호스트 헤더 조건에 값을 추가하려면 조건 항목을 펼쳐서
안에 있는 값 목록에 넣어야 한다.

참고로 ALB 인증서는 손댈 게 없다. CloudFront가 오리진에 붙을 때 SNI는 항상
origin.plick.co.kr이고(와일드카드 커버), 호스트 규칙이 보는 Host 헤더와 SNI는 서로
다른 값이다. deploy-v3-cdn.md §2에 적어 둔 그대로였다.

## 실도메인은 어떻게 했나

CloudFront 배포에서 실도메인 alias는 제거했다. prod 컷오버 때 "dev 배포에서 떼고
prod 배포에 붙이는" 순서 꼬임(alias는 배포 간 중복 불가)이 미리 사라진다.

Route 53의 실도메인 레코드는 지우지 않고 남겼다. 지우면 해석 실패, 두면 CloudFront
403 에러 페이지가 뜨는 차이뿐이고 어느 쪽이든 기능적으로 죽은 건 같다. 가리키는
배포가 여전히 우리 소유라 dangling 위험도 없다. 컷오버 때 어차피 대상을 prod 배포로
바꿔야 해서 지금 지워도 아낄 게 없다.

origin.plick.co.kr 레코드는 절대 건드리면 안 된다. dev 도메인 전체가 이 레코드를
타고 ALB로 간다.

## 소셜 로그인 복구

실도메인이 죽는 순간 OAUTH_REDIRECT_URI(= m.plick.co.kr/oauth/callback)도 같이
죽어서 소셜 로그인이 전멸한다. 코드는 전부 env 기반이라 손댈 게 없었고, 값만 세 군데
고쳤다.

- Parameter Store `/plick/frontend/web/env`와 `/plick/frontend/mobile/env`의
  OAUTH_REDIRECT_URI를 dev 도메인으로 수정. 이 파라미터는 .env 파일 내용 통째라
  다른 줄(특히 HOSTNAME=0.0.0.0)을 건드리지 않게 조심해야 한다
- 카카오·구글 콘솔의 기존 OAuth 앱에 dev 리다이렉트 URI 추가. prod 앱 분리는
  나중이라 기존 URI는 그대로 뒀다

파라미터는 배포 훅(AfterInstall)이 읽어 .env를 만들므로 재배포해야 반영된다. 재배포는
아래 deploy.yml 전환과 합쳐 한 번만 나가게 했다.

## deploy.yml: main 트리거를 develop으로

지금 인프라가 dev라면 배포 시점도 develop 병합이 맞다. 트리거를 `branches: [main]`에서
`[develop]`으로 바꾸고, 빌드에 박히는 NEXT_PUBLIC_SITE_URL류 상수 세 개를 dev
도메인으로 교체했다. canonical과 sitemap이 이 값으로 구워지므로 dev 산출물은 dev
도메인을 가리키는 게 맞다. concurrency 그룹도 deploy-dev로 미리 갈라 뒀다.

main 트리거는 일단 뗐다. prod 인프라가 아직 없어서 main 푸시가 지금 배포를 돌리면
dev 인프라에 나가는 오배포가 된다. prod를 구축하면 GitHub Environments(dev/prod)로
브랜치-환경 매핑을 만들면서 main을 되살릴 계획이다. 시크릿(API_BASE_URL)과 상수,
CodeDeploy 앱 이름이 환경 단위로 갈라지니 그때 environments가 자연스러운 자리다.

한 가지 함정이 남는다. GitHub OIDC 배포 롤(plick-frontend-deploy)의 신뢰 정책이
main 브랜치로 잠겨 있다(deploy-v2.md §5-③). develop 푸시로 워크플로가 돌면
configure-aws-credentials 단계에서 AssumeRole이 거부된다. IAM 콘솔에서 신뢰 정책의
sub 조건에 develop을 추가해야 하고, 이건 병합 전에 돼 있어야 첫 develop 배포가
성공한다.

dev 도메인의 검색엔진 차단(noindex)은 이번에 하지 않았다. WAF가 팀 IP 외 전부를
막고 있어서 크롤러가 아예 접근을 못 한다. WAF 잠금을 푸는 날이 오면 그때 필요해진다.

## 남은 것

- prod VPC 구축: deploy-v2.md와 deploy-v3-cdn.md가 그대로 절차서가 된다.
  리소스 이름은 기존 무접미사(=dev)를 두고 prod 쪽에 접미사를 붙인다
- GitHub Environments로 dev/prod 매핑을 만들고 main 트리거 복원
- OAuth prod 앱 분리, 실도메인 레코드를 prod 배포로 전환(컷오버)
- 컷오버 후 CLAUDE.md와 배포 문서의 도메인 표기 갱신
