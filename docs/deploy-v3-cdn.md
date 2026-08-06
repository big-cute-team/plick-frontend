# 배포 전략 v3 계획 — CloudFront + S3로 정적 자산 분리

현행 배포(v2, [deploy-v2.md](deploy-v2.md))는 ASG 인스턴스의 Next standalone 서버가
HTML도 정적 자산도 전부 직접 서빙하고, 퍼블릭 ALB가 유일한 입구다.
여기에 CloudFront를 앞에 세우고 `_next/static`을 S3로 옮긴다.
[deploy-v2.md](deploy-v2.md) §14 마지막 줄에 후속 과제로 적어 둔 그 작업이다.

v2 문서와 같은 성격의 "만들기 전의 설계"다. 실제 작업하며 달라지는 건 이 문서를
고치고, 시행착오 회고는 세션 ADR에 남긴다. 배경과 판단은
[ADR 0081](adr/0081-cdn-static-split-plan.md)에 있다.

티켓 없이 시작한 작업이라 브랜치는 `feature/deploy-v3-cdn`이다.

## 0. 왜 바꾸나 — v2의 한계

세 가지가 겹쳐 있다.

### 세대 간 청크 404

Blue/Green 배포에서 트래픽 재라우팅 1~2분 동안 구세대와 신세대 인스턴스가 같은
대상 그룹에 공존한다. 구세대가 준 HTML을 받은 브라우저가 그 HTML이 참조하는
`/_next/static/chunks/<옛해시>.js`를 요청하는데, 그 요청이 신세대 인스턴스로
떨어지면 그 파일이 거기 없어서 404다. v2 첫 배포에서 실제로 겪었다
([deploy-v2.md](deploy-v2.md) §11 4번).

겹침 구간만의 문제가 아니다. 배포가 다 끝난 뒤에도 배포 전에 열어 둔 탭이
남아 있으면 같은 일이 벌어진다. 그 탭이 소프트 내비게이션을 하면 구세대 청크를
새로 부르는데, 세상 어디에도 그 파일을 가진 서버가 없다. Blue 인스턴스는 이미
종료됐기 때문이다.

여기서 헷갈리기 쉬운 지점 하나. 파일명에 손으로 `-v1`, `-v2` 같은 버전 접미사를
붙일 필요는 없다. Next는 이미 청크 파일명에 콘텐츠 해시를 박는다
(`chunks/main-app-a1b2c3.js`, `static/<buildId>/_buildManifest.js`). 빌드가 다르면
파일명이 이미 다르고, 그래서 같은 곳에 나란히 놓아도 서로 덮어쓰지 않는다.
문제는 이름이 아니라 보관이다. 지금은 청크가 인스턴스 로컬 디스크에만 있어서
인스턴스가 죽으면 그 세대의 산출물이 세상에서 사라진다. 필요한 건 두 세대
이상을 동시에 들고 있는 창고이고, 그게 S3다.

### 비용

ALB는 LCU(Load Balancer Capacity Unit)로 과금한다. 신규 연결 수, 활성 연결 수,
처리한 바이트, 규칙 평가 횟수를 각각 재서 제일 큰 축을 기준으로 청구한다.
들어오는 트래픽과 나가는 트래픽이 모두 이 계산에 들어간다.

CloudFront는 수신 요청에 데이터 요금이 없고 송출(뷰어로 나가는 바이트)만
과금한다. 여기에 더해 AWS 오리진(ALB·S3)에서 CloudFront로 올라가는 데이터
전송은 무료다. 그래서 바이트의 대부분을 차지하는 JS·CSS 청크가 CloudFront 캐시와
S3로 빠지면 ALB LCU가 통째로 줄고, 캐시 미스로 오리진에 다녀오는 경우에도 그
구간 전송 비용은 안 든다. CloudFront 프리 티어(월 1TB 송출, 1천만 요청) 범위도
지금 트래픽에서는 실질적이다. 착수 시점에 프리 티어 조건은 다시 확인한다.

다만 HTML·RSC 페이로드·`/be/*` 프록시는 여전히 매 요청 ALB를 탄다. 요청 수는
크게 안 줄고 바이트가 줄어드는 그림이라고 기대치를 잡는다.

### WAF

AWS WAF를 ALB에 붙이는 것보다 CloudFront에 붙이는 쪽이 압도적으로 쉽다.
CloudFront 배포에 WebACL을 지정하면 끝이고, 관리형 규칙 그룹도 바로 붙는다.
지금은 WAF가 어디에도 없다.

## 1. 전체 그림

### before (v2)

```
브라우저
  ▼  https://plick.co.kr        https://m.plick.co.kr
퍼블릭 ALB (0.0.0.0/0 오픈, 호스트 헤더로 분기)
  ├─ tg-front-web    → ASG EC2:3000  (HTML·RSC·정적 전부 이 서버가 서빙)
  └─ tg-front-mobile → ASG EC2:3001
```

### after (v3)

```
브라우저
  ▼
CloudFront (도메인별 배포 2개, us-east-1 ACM, WAF 부착)
  │
  ├─ /_next/static/*  → S3 오리진 (OAC, 캐시 1년, 세대별 산출물 누적 보관)
  │
  └─ 기본 /*          → ALB 오리진 (origin.plick.co.kr, 캐시 없음, Host·쿠키 전달)
                          ▼
                        퍼블릭 ALB (CloudFront 접두사 목록에서만 인바운드)
                          ├─ tg-front-web    → ASG EC2:3000
                          └─ tg-front-mobile → ASG EC2:3001
                                                 ▼
                                              내부 ALB → BE
```

바뀌지 않는 것: ASG, Launch Template, CodeDeploy Blue/Green, appspec과 훅
스크립트, 대상 그룹, 내부 ALB, Parameter Store, 보안그룹 체인의 안쪽.
배포 방식 자체는 손대지 않는다. 이 작업은 "입구를 CloudFront로 바꾸고 정적
자산의 집을 옮기는 것"이 전부다.

## 2. 먼저 정한 것들

### assetPrefix를 쓰지 않는다

CloudFront가 서비스 도메인 그 자리에 서기 때문에 정적 자산도 같은 오리진이다.
`next.config`의 `assetPrefix`를 별도 CDN 도메인으로 바꿀 이유가 없다. 경로 기반
비헤이비어로만 가른다. 덕분에 CORS도, 폰트의 crossorigin 속성도, 서드파티 쿠키
얘기도 전부 안 나온다. `next.config`는 이 작업에서 건드리지 않는다.

### CloudFront 배포를 도메인마다 하나씩 둔다

한 배포 안의 비헤이비어는 경로로만 가른다. Host 헤더로는 못 가른다. 그런데 web과
mobile은 둘 다 `/_next/static/...`이라는 같은 경로를 쓰면서 S3의 서로 다른 곳을
봐야 한다. 그래서 배포를 둘로 나누고 각각 S3 오리진 경로를 다르게 준다.

CloudFront Function으로 Host를 보고 URI를 다시 쓰는 방법도 있는데, 배포 하나를
아끼자고 함수 하나를 얹는 교환이 안 맞는다. 배포 2개가 지금의 도메인 2개,
대상 그룹 2개 구조와도 그대로 대응된다.

### ALB 오리진은 DNS 이름이 아니라 origin.plick.co.kr로 붙인다

CloudFront가 오리진에 HTTPS로 붙으면 오리진이 내민 인증서가 오리진 도메인
이름과 맞는지 검증한다. 오리진 도메인을 ALB의 기본 DNS 이름
(`xxx.ap-northeast-2.elb.amazonaws.com`)으로 주면 ALB에 붙은 인증서는
`plick.co.kr`·`*.plick.co.kr`짜리라 이름이 안 맞아 오리진 연결이 실패한다.

Route 53에 `origin.plick.co.kr` A 별칭을 ALB로 하나 더 만들고 그걸 오리진
도메인으로 준다. 와일드카드 인증서가 이 이름을 덮으므로 HTTPS가 그대로 성립한다.

⚠️ 이 이름으로 오는 SNI와 ALB 규칙이 보는 Host 헤더는 서로 다르다. CloudFront는
SNI로 `origin.plick.co.kr`을 쓰지만, 아래 §6에서 정하는 오리진 요청 정책
(`AllViewer`) 때문에 Host 헤더에는 뷰어가 보낸 `plick.co.kr`이 실려 간다. ALB의
호스트 헤더 규칙은 Host를 보므로 규칙이 그대로 먹는다. 둘이 달라도 정상이다.

## 3. 사전 준비물

전부 v2까지 만들어 둔 것이고 새로 필요한 건 없다. 값만 미리 적어 둔다.

- 계정 ID(12자리)
- 퍼블릭 ALB의 DNS 이름과 보안그룹 ID
- 기존 ACM 인증서(ap-northeast-2, `plick.co.kr` + `*.plick.co.kr`) — ALB용으로 유지
- Route 53 호스팅 영역 `plick.co.kr`
- GitHub OIDC 배포 롤 `plick-frontend-deploy`

## 4. S3 정적 버킷

콘솔 → S3 → 버킷 만들기.

- 리전 `ap-northeast-2`, 네임스페이스는 글로벌(클래식). v1 문서 §2의 이유와 같다
- 이름 `plick-static` (선점됐으면 다르게 짓고 이후 모든 정책·워크플로를 같이 바꾼다)
- 퍼블릭 액세스 전체 차단 유지. CloudFront OAC로만 읽게 할 것이라 퍼블릭으로
  열 필요가 없다
- 버전 관리 끄기. 같은 키를 덮어쓸 일이 없다(파일명에 해시가 있다)

배포 아티팩트 버킷(`plick-deploy`)과 섞지 않는다. 수명 주기와 접근 주체가
완전히 다르다. 아티팩트는 CodeDeploy 에이전트만 읽고 7일 뒤 지워지지만, 정적
자산은 CloudFront가 읽고 훨씬 오래 살아야 한다.

키 구조는 앱별 접두사로 나눈다.

```
plick-static/
  web/_next/static/chunks/...
  web/_next/static/<buildId>/...
  mobile/_next/static/chunks/...
  mobile/_next/static/<buildId>/...
```

버킷 정책은 CloudFront 배포를 만든 뒤 OAC가 알려 주는 것을 붙인다(§6). 배포가
없는 상태에서는 붙일 ARN이 없으니 순서가 그렇게 된다.

## 5. ACM 인증서 (us-east-1)

⚠️ CloudFront는 us-east-1(버지니아 북부)에 있는 인증서만 받는다. 기존
ap-northeast-2 인증서는 ALB 몫으로 그대로 두고 새로 하나 더 발급한다. v1 문서
§6에서 "us-east-1에 받는 건 CloudFront용이라 ALB에 못 쓴다"고 적어 둔 그 함정의
반대 방향이다.

콘솔 우상단 리전을 us-east-1로 바꾸고 Certificate Manager → 인증서 요청 →
퍼블릭 인증서.

- 도메인 이름 `plick.co.kr`, 대체 이름 `*.plick.co.kr`
- DNS 검증 → "Route 53에서 레코드 생성" 버튼

호스팅 영역은 리전이 없는 글로벌 서비스라 서울 인증서 때 만든 검증 CNAME과
같은 영역에 들어간다. 이름이 같으면 값도 같아 새 레코드가 안 생길 수 있는데
정상이다.

## 6. CloudFront 배포 2개

두 배포의 설정은 alias와 S3 오리진 경로만 다르고 나머지는 같다.

| 항목           | 배포 A         | 배포 B            |
| -------------- | -------------- | ----------------- |
| 대체 도메인    | `plick.co.kr`  | `m.plick.co.kr`   |
| S3 오리진 경로 | `/web`         | `/mobile`         |
| 최종 향할 TG   | `tg-front-web` | `tg-front-mobile` |

⚠️ 처음 만들 때는 대체 도메인(alias)을 비워 둔다. alias를 붙이는 순간 그 이름의
소유 검증이 걸리고, 무엇보다 Route 53을 아직 안 옮긴 상태라 검증만 어수선해진다.
`dxxxxxxxx.cloudfront.net` 기본 도메인으로 먼저 전부 검증하고(§8 3번), alias는
컷오버 직전에 붙인다.

### 오리진 2개

오리진 1 — ALB (기본 오리진)

- 오리진 도메인: `origin.plick.co.kr` (§8 1번에서 만드는 레코드)
- 프로토콜: HTTPS만, 포트 443
- 커스텀 헤더 추가: `X-Origin-Verify: <난수 32자>`. §9에서 ALB가 이걸 검증한다.
  값은 만들 때 안전한 곳에 적어 둔다

오리진 2 — S3

- 오리진 도메인: `plick-static.s3.ap-northeast-2.amazonaws.com`
  (웹사이트 엔드포인트 말고 REST 엔드포인트를 고른다. 콘솔 드롭다운에서 버킷을
  고르면 이쪽이 나온다)
- 오리진 경로: `/web` 또는 `/mobile`
- 오리진 액세스: Origin Access Control(OAC) 생성해서 지정. 만든 뒤 콘솔이
  "버킷 정책을 업데이트하라"며 정책 JSON을 보여 준다. 복사해서 §4 버킷에 붙인다

### 비헤이비어 2개

기본 비헤이비어 `*` (ALB 오리진)

- 뷰어 프로토콜 정책: Redirect HTTP to HTTPS
- 허용 메서드: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
  (⚠️ 서버 액션과 `/be/*` 프록시가 POST를 쓴다. GET/HEAD만 허용하면 로그인부터
  깨진다)
- 캐시 정책: `CachingDisabled`
- 오리진 요청 정책: `AllViewer`
- 응답 헤더 정책: 없음
- 압축: 켬

`AllViewer`가 이 설계의 핵심 스위치다. 뷰어가 보낸 헤더·쿠키·쿼리스트링을
전부 오리진으로 넘긴다. Host 헤더가 넘어가야 ALB의 호스트 헤더 규칙이 살고,
쿠키가 넘어가야 인증이 산다. 이걸 기본값으로 두면 ALB가 등록 안 된 호스트로
판단해 리스너 기본 작업인 404 고정 응답만 돌려준다.

정적 비헤이비어 `/_next/static/*` (S3 오리진)

- 뷰어 프로토콜 정책: Redirect HTTP to HTTPS
- 허용 메서드: GET, HEAD
- 캐시 정책: `CachingOptimized`
- 오리진 요청 정책: 지정하지 않음
- 압축: 켬

⚠️ S3 오리진에는 `AllViewer`를 붙이면 안 된다. 뷰어의 Host 헤더가 그대로 가면
S3가 SigV4 서명 검증에 실패해 403을 뱉는다. 이 비헤이비어는 오리진 요청 정책을
비워 둔다. 두 비헤이비어의 정책이 반대여야 한다는 게 이 작업에서 제일 헷갈리는
지점이다.

경로 패턴 순서도 본다. CloudFront는 더 구체적인 패턴을 먼저 매칭하므로
`/_next/static/*`이 기본 `*`보다 우선순위가 위에 있어야 한다. 콘솔에서 만들면
자동으로 그렇게 정렬되지만 배포 후 한 번 확인한다.

### 이번 범위에서 뺀 것

- `/_next/image*` — 이미지 최적화 엔드포인트다. 서버가 처리해야 해서 S3로 못
  옮긴다. 기본 비헤이비어로 ALB에 간다. 나중에 이 경로만 캐시 켠 별도
  비헤이비어로 뽑으면 오리진 부하가 크게 줄지만, 쿼리스트링 키 설정을 따로
  맞춰야 해서 이번엔 뺀다
- `public/` 자산(`/images/*`, `/favicon.ico`, OG 이미지) — 파일명에 해시가 없어서
  세대 간 404 문제가 없다. 그대로 EC2가 서빙한다. 캐시로 비용을 더 줄이고
  싶으면 나중에 ALB 오리진 + 짧은 TTL 비헤이비어를 붙인다. 이름이 고정이라
  내용이 바뀌면 무효화가 필요해지는 게 이번에 안 건드리는 이유다

## 7. 리포지토리 변경 — deploy.yml

`.github/workflows/deploy.yml`에 업로드 스텝 하나를 추가한다. 다른 파일은
안 바뀐다. `next.config`도, appspec도, 훅 스크립트도 그대로다.

`Configure AWS credentials` 스텝 뒤, `Upload bundle` 근처에 넣는다.

```yaml
- name: Upload static assets
  run: |
    for APP in web mobile; do
      aws s3 sync "apps/$APP/.next/static" "s3://$STATIC_BUCKET/$APP/_next/static" \
        --cache-control "public,max-age=31536000,immutable"
    done
```

`env`에 `STATIC_BUCKET: plick-static`을 추가한다.

⚠️ `--delete`를 절대 붙이지 않는다. 구세대 청크가 버킷에 남아 있는 것이 이 작업
전체의 목적이다. 붙이는 순간 v2와 똑같은 404가 CloudFront 뒤에서 재현된다.

⚠️ `Cache-Control`을 직접 지정해야 한다. Next 서버는 `.next/static` 응답에
`immutable`을 자기가 붙여 주지만 S3는 아무것도 안 붙인다. 안 넣으면 CloudFront가
기본 TTL로만 캐시하고 브라우저는 매번 재검증하러 온다.

⚠️ 무효화(invalidation)는 필요 없다. 파일명이 콘텐츠 해시라 같은 URL의 내용이
바뀔 일이 없다. 워크플로에 `create-invalidation`을 넣지 않는다.

기존 `Assemble standalone` 스텝의 `.next/static` 복사는 당분간 남겨 둔다.
CloudFront 비헤이비어가 잘못 걸렸을 때 EC2가 폴백으로 서빙해 주는 안전핀이다.
전환이 안정된 뒤(§13) 제거를 판단한다.

IAM: 배포 롤 `plick-frontend-deploy`의 인라인 정책에 Statement를 추가한다.

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:ListBucket"],
  "Resource": ["arn:aws:s3:::plick-static", "arn:aws:s3:::plick-static/*"]
}
```

`s3:ListBucket`이 버킷 ARN(슬래시 뒤 없음)에, `s3:PutObject`가 객체 ARN(`/*`)에
걸린다는 걸 지킨다. `sync`는 목록 조회를 먼저 하므로 ListBucket이 없으면
스텝 첫 줄에서 AccessDenied가 난다.

## 8. Route 53과 컷오버

여기가 실제로 트래픽이 움직이는 지점이다. 순서를 지킨다.

1. `origin.plick.co.kr` A 별칭 레코드를 만든다. 대상은 퍼블릭 ALB. §2에서 정한
   CloudFront의 ALB 오리진 이름이다. 이 시점에는 아무도 안 쓰는 여분의 이름이다
2. §6의 배포 2개를 alias 없이 만든다. 상태가 Deployed가 될 때까지 기다린다
   (5~15분)
3. `dxxxxxxxx.cloudfront.net`으로 직접 열어 전 화면을 검증한다. 이때 브라우저
   주소가 서비스 도메인이 아니라 절대 URL을 쓰는 곳(canonical, sitemap, OAuth
   리다이렉트)은 원래 도메인을 가리키므로 로그인은 여기서 검증이 안 된다.
   HTML 렌더, 정적 자산 200, 피드 무한스크롤(`/be/*` 프록시)까지 본다.
   ⚠️ 개발자 도구 네트워크 탭에서 `/_next/static/*` 응답 헤더의 `x-cache`를
   본다. `Hit from cloudfront` 또는 `Miss from cloudfront`가 나오고 서버
   헤더가 S3 계열이면 비헤이비어가 제대로 갈린 것이다
4. 기존 `plick.co.kr`·`m.plick.co.kr` A 별칭 레코드의 TTL을 60초로 낮춘다.
   별칭 레코드는 TTL을 직접 못 정하고 대상 서비스를 따라가므로 실제로는 이
   단계가 생략된다. 전파를 기다리는 시간이 있다는 것만 감안한다
5. 각 CloudFront 배포에 alias를 추가하고 us-east-1 인증서를 지정한다
6. `plick.co.kr`·`m.plick.co.kr` A 별칭의 대상을 ALB에서 CloudFront 배포로
   바꾼다. ← 컷오버
7. `dig +short plick.co.kr`로 CloudFront IP가 나오는지 보고, 브라우저에서
   §13 체크리스트를 돈다

⚠️ 컷오버 시점에 `origin.plick.co.kr`은 계속 ALB를 직접 가리키는 상태로 남는다.
이건 CloudFront가 오리진을 부르기 위한 이름이라 의도된 것이다. 다만 이 이름으로
누구나 CloudFront를 우회할 수 있으니 §9를 반드시 이어서 한다. 그 전까지는
WAF도 없고 우회 경로도 열려 있는 구간이라 길게 끌지 않는다.

## 9. ALB를 CloudFront 전용으로 잠그기

두 겹으로 막는다. 하나만 하면 각각 구멍이 있다.

### 보안그룹

퍼블릭 ALB 보안그룹의 인바운드 443 규칙에서 소스를 `0.0.0.0/0`에서 관리형
접두사 목록 `com.amazonaws.global.cloudfront.origin-facing`으로 바꾼다.
AWS가 CloudFront 엣지의 오리진 향 IP 대역을 관리해 주는 목록이라 IP가 바뀌어도
따라온다. 콘솔의 소스 드롭다운에서 "접두사 목록"을 고르면 검색된다.

80 리스너 규칙도 같이 좁힌다. CloudFront가 오리진에 HTTPS로만 붙으므로 80은
사실상 안 쓰이지만 열어 둘 이유도 없다.

⚠️ 접두사 목록은 규칙 하나가 여러 항목을 차지한다. 보안그룹 규칙 수 할당량
(기본 60)에 걸리면 늘려야 한다.

### 커스텀 헤더 검증

보안그룹만으로는 다른 사람의 CloudFront 배포에서 우리 ALB를 오리진으로 삼는 걸
못 막는다. 같은 대역에서 오기 때문이다. §6에서 넣은 `X-Origin-Verify` 헤더를
ALB가 검증하게 한다.

EC2 → 로드 밸런서 → 퍼블릭 ALB → 리스너 및 규칙 → HTTPS:443 → 기존 호스트 헤더
규칙 2개 각각을 편집해서, 조건에 HTTP 헤더 조건을 추가한다.

- 헤더 이름 `X-Origin-Verify`, 값 §6에서 정한 난수

조건이 AND로 묶이므로 호스트가 맞고 헤더도 맞아야 대상 그룹으로 간다. 둘 중
하나라도 어긋나면 리스너 기본 작업(404 고정 응답)으로 떨어진다.

⚠️ 이 두 가지를 켜는 순간 §11의 롤백(Route 53을 ALB로 되돌리기)이 막힌다.
ALB로 직접 오는 뷰어 트래픽에는 이 헤더가 없기 때문이다. 그래서 §9는 컷오버
직후가 아니라 며칠 관찰한 뒤에 한다. 순서는 §16 표를 따른다.

## 10. WAF

us-east-1 리전에서 WAF & Shield → Web ACLs → Create. 리소스 유형을
CloudFront distributions로 고른다(⚠️ 이 스코프는 us-east-1에서만 만들어진다.
서울 리전에서 만들면 CloudFront에 못 붙는다).

- 관리형 규칙 그룹: `AWSManagedRulesCommonRuleSet`,
  `AWSManagedRulesKnownBadInputsRuleSet`부터 시작한다
- 처음에는 전부 Count 모드로 두고 며칠 로그를 본 뒤 Block으로 전환한다.
  바로 Block으로 켜면 서버 액션의 POST 본문이나 긴 쿠키가 오탐으로 막히는 일이
  흔하다
- 레이트 제한 규칙 하나 추가: 5분에 IP당 2000요청 초과 시 Block 정도로 시작

배포 2개에 같은 WebACL을 붙인다. WAF 로그는 나중에 필요해지면 CloudWatch Logs로
보낸다.

## 11. 롤백

단계별로 되돌리는 방법이 다르다.

- §8 컷오버 이후, §9 이전: Route 53 A 별칭 대상을 CloudFront에서 ALB로 되돌리면
  v2 구조로 즉시 복귀한다. ALB가 아직 열려 있어서 그대로 받는다. 이 구간이
  안전핀이 있는 구간이다
- §9 이후: 되돌리려면 보안그룹 소스를 `0.0.0.0/0`으로 되돌리고 리스너 규칙의
  헤더 조건을 지운 다음 Route 53을 바꿔야 한다. 순서가 반대면 전면 404다
- S3 업로드(§7)만 되돌리는 건 의미가 없다. 아무도 안 읽으면 그냥 남는 객체다

## 12. 정적 자산 수명 주기

`plick-static`에 관리 → 수명 주기 규칙 → 접두사 없이 90일 만료.

90일인 이유는 두 가지다. 롤백으로 옛 커밋을 다시 배포할 여지를 남겨야 하고
(아티팩트 버킷은 7일이라 그보다 오래 되돌릴 일은 없지만), 브라우저에 오래
떠 있는 탭이 그 세대의 청크를 부를 수 있다.

⚠️ `aws s3 sync`는 로컬 파일이 더 최신일 때만 올린다. CI는 매번 새로 체크아웃하고
새로 빌드하므로 내용이 같은 파일도 mtime이 새로워져 다시 올라가고, 그때 S3
객체의 생성 시각도 갱신된다. 그래서 계속 쓰이는 청크가 90일 규칙에 걸려 사라질
걱정은 안 해도 된다. 다만 이 전제가 깨지면(예: sync에 `--size-only`를 붙이면)
현역 청크가 만료될 수 있으니 옵션을 바꿀 때 이걸 같이 생각한다.

## 13. 확인 체크리스트

- 두 도메인 전 화면 로드 (홈·피드·릴스·상세·마이페이지·FAQ·약관)
- 네트워크 탭에서 `/_next/static/*`이 200이고 `x-cache` 헤더가 있다
- 같은 파일 두 번째 요청이 `Hit from cloudfront`다
- HTML 문서 요청에는 `x-cache: Miss from cloudfront` 계열이 매번 뜬다
  (캐시되면 안 되는 게 캐시 안 되고 있다는 확인이다)
- 서버 컴포넌트 화면(홈 핫이슈·기사 상세)에 데이터가 있다
- 클라 fetch 화면(피드 무한스크롤·릴스)이 돈다 → `/be/*` POST·GET이 CloudFront를
  통과한다는 확인
- OAuth 로그인·로그아웃 (카카오·구글, 두 도메인 각각). 쿠키가 CloudFront를
  왕복하는지 보는 제일 중요한 항목이다
- 댓글 작성·수정·삭제, 좋아요 → 서버 액션 POST 경로
- 배포를 한 번 돌리고, 배포 전에 열어 둔 탭에서 소프트 내비게이션을 해 본다.
  §0의 청크 404가 재현되지 않아야 이 작업의 목적이 달성된 것이다
- 이전 세대 청크 URL을 직접 열어 200이 나오는지 (S3에 누적되고 있다는 확인)

## 14. API 스펙 스큐 — 이 작업으로 안 풀리는 것

정적 자산은 S3가 두 세대를 들고 있으면 해결된다. 그런데 구세대 FE 번들이
신세대 BE를 호출하는 문제는 남는다. 배포 겹침 구간뿐 아니라 배포 후에도 탭을
열어 둔 사용자에게 계속 생긴다. CDN은 이걸 못 푼다. 오히려 구세대 청크가 더
오래 살아남게 되므로 노출이 늘어난다.

세 갈래로 다룬다. 이번 작업의 범위는 아니고 BE와 합의가 필요한 항목이다.

- BE가 한 세대 하위호환을 지킨다. 필드 추가는 자유, 제거와 이름 변경은 다음
  릴리스로 미루는 expand/contract 방식. 파괴적 변경은 지금의 `/api/v1` 대신
  `/api/v2` 경로로 뺀다
- 배포 순서를 BE 먼저, FE 나중으로 고정한다. 반대로 하면 신버전 FE가 아직 없는
  응답 필드를 읽는다
- FE 완화책으로 `next.config`의 `deploymentId`가 있다. 자산 요청에 배포 식별자를
  붙이고 세대 불일치를 감지하면 소프트 내비게이션 대신 하드 리로드로 넘긴다.
  도입 전에 현재 Next 버전에서 실제 동작을 확인해야 한다

## 15. 예상 함정 목록

착수 전에 적어 두는 것들이다. 실제로 밟은 것은 세션 ADR로 옮긴다.

- 전 화면 404 고정 응답 — 기본 비헤이비어의 오리진 요청 정책이 `AllViewer`가
  아니라서 Host 헤더가 안 넘어간 것이다. 일 순위로 본다
- `/_next/static/*`이 403 — S3 비헤이비어에 `AllViewer`를 붙였거나 OAC 버킷
  정책을 안 붙인 것이다
- `/_next/static/*`이 404 — S3 오리진 경로(`/web`·`/mobile`)와 업로드 키
  접두사가 어긋난 것이다. 버킷에서 실제 키를 눈으로 확인한다
- 로그인이 안 되거나 계속 로그아웃 — 쿠키가 안 넘어가는 것이다. `AllViewer`
  확인, 그리고 기본 비헤이비어의 캐시 정책이 `CachingDisabled`인지 확인
  (캐시되면 남의 쿠키가 담긴 응답이 공유될 수 있는 심각한 상황이라 우선순위 최상)
- 서버 액션이나 댓글 작성이 405 — 기본 비헤이비어의 허용 메서드에 POST가 없다
- CloudFront가 502·504 — ALB 오리진 이름이 `origin.plick.co.kr`이 아니라 ALB
  기본 DNS 이름이라 인증서 이름이 안 맞는 것이다
- alias를 못 붙임 — 인증서가 us-east-1이 아니거나 인증서 도메인에 그 이름이
  없는 것이다
- §9 이후 전면 404 — 리스너 규칙의 헤더 값과 CloudFront 오리진 커스텀 헤더
  값이 다르다. 대소문자와 앞뒤 공백을 본다
- 배포 직후 청크 404가 여전함 — `aws s3 sync`에 `--delete`가 붙었는지 본다

## 16. 진행 순서 요약

| 순서 | 단계                                        | 서비스 영향        |
| ---- | ------------------------------------------- | ------------------ |
| 1    | S3 정적 버킷 생성 (§4)                      | 없음               |
| 2    | 배포 롤에 S3 쓰기 권한 추가 (§7)            | 없음               |
| 3    | deploy.yml 업로드 스텝 추가, PR → main (§7) | 없음 (이중 보관)   |
| 4    | us-east-1 ACM 발급 (§5)                     | 없음               |
| 5    | `origin.plick.co.kr` 레코드 생성 (§8 1)     | 없음               |
| 6    | CloudFront 배포 2개 생성, alias 없이 (§6)   | 없음               |
| 7    | 기본 도메인으로 전 화면 검증 (§8 3)         | 없음               |
| 8    | alias 추가 + Route 53 전환 (§8 5·6)         | 컷오버             |
| 9    | 체크리스트 (§13)                            | 없음               |
| 10   | 며칠 관찰                                   | 없음               |
| 11   | ALB 보안그룹·헤더 검증으로 잠그기 (§9)      | 없음 (롤백선 닫힘) |
| 12   | WAF 부착, Count → Block (§10)               | 없음               |
| 13   | S3 수명 주기 90일 (§12)                     | 없음               |
| 14   | standalone의 static 복사 제거 판단 (§7)     | 없음               |

3번까지가 리포 작업이고 나머지는 콘솔 작업이다. 3번을 먼저 넣어 두면 버킷에
산출물이 쌓이기 시작하므로, CloudFront를 세울 때 이미 읽을 게 있는 상태가 된다.

## TODO

- CLAUDE.md "더 읽을 것"의 배포 항목이 아직 v1(docs/deploy.md + ADR 0059)만
  가리킨다. v2·v3 문서로 갱신한다
- `/_next/image*` 전용 캐시 비헤이비어 (§6)
- `public/` 자산 캐시 비헤이비어 (§6)
- `deploymentId` 도입 검토 (§14)
- CloudWatch Logs 에이전트 — v2에서 넘어온 미해결 과제
