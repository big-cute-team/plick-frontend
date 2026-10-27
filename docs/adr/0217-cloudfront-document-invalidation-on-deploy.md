# 0217. 배포가 끝나도 FAQ는 열하루 전 그대로: 문서 캐시 무효화를 배포 워크플로에 넣다 (KAN-679)

## 어디서 이어지나

[ADR 0201](0201-guest-issue-off-page-response.md)과 [ADR 0204](0204-web-render-cache-port.md)에서 네 CloudFront 배포의 기본 비헤이비어에 문서 캐시 정책 `plick-documents`를 걸었다. 그 뒤로 홈·FAQ·릴스 같은 HTML이 CloudFront에 저장돼 `Hit from cloudfront`로 나가기 시작했다. 10월 26일 prod 릴리스([ADR 0213](0213-third-party-js-lazy-load.md)·[ADR 0214](0214-rebrand-seo-leftovers.md)) 뒤에 확인하다가 FAQ·약관·개인정보처리방침이 배포 전 HTML 그대로인 것을 봤다. 두 호스트 `/faq`의 `age`가 274,000초, 그러니까 10월 23일 릴리스 시점이었고 KAN-674의 GA 지연 로드가 FAQ에는 들어가 있지 않았다. 그날은 콘솔에서 `/*` 무효화를 손으로 걸어 풀고 KAN-679를 끊었다. 이번 세션은 그 티켓이다.

## 실제 문제인지부터 다시 쟀다

티켓이 원인을 이미 적어 뒀지만 세션은 "진짜 문제가 맞나"를 다시 확인하는 데서 시작했다. 10월 26일 수동 무효화 뒤 하루가 지났고 그 사이 dev 배포가 여러 번 돌았으니, 문제가 구조적이라면 dev에서 다시 보여야 했다.

네 호스트의 `/faq`를 헤더만 받아 봤다. `date`는 CloudFront가 오리진에서 그 응답을 받은 시각이고 `age`는 그로부터 지난 초다.

| 호스트            | `date`              | `age`   | 저장 뒤 지난 시간 | 그 사이 배포                    |
| ----------------- | ------------------- | ------- | ----------------- | ------------------------------- |
| dev-m.plick.co.kr | 10월 16일 05:06 UTC | 958,385 | 약 11일           | 10회 넘게                       |
| dev.plick.co.kr   | 10월 23일 04:54 UTC | 354,286 | 약 4일            | 여러 번, 당일 2회 포함          |
| plick.co.kr       | 10월 26일 09:53 UTC | 77,177  | 약 21시간         | 세션 중 main 배포가 돌고 있었다 |
| m.plick.co.kr     | 10월 26일 09:53 UTC | 77,177  | 약 21시간         | 위와 같다                       |

`gh run list`로 보니 10월 27일에 develop 배포가 03:06과 06:45 UTC에 성공했다. 그런데 dev-m의 FAQ는 10월 16일 것이다. 이것만으로도 "배포가 CloudFront 저장분을 못 바꾼다"는 건 확정이다. prod 두 호스트의 `date`가 10월 26일 09:53인 건 티켓에 적힌 수동 무효화 시각과 맞는다. 그 무효화 뒤 처음 받은 응답이 지금까지 그대로 나가는 것이다.

### 내용이 정말 다른지 보려다 두 번 헛짚었다

`age`가 크다는 것과 사용자가 옛 화면을 본다는 것은 같은 말이지만, 눈으로 차이를 보고 싶었다. 처음엔 HTML 안의 Next 빌드 ID를 뽑아 홈과 FAQ를 비교하려 했다. `/_next/static/<buildId>/_buildManifest.js` 경로를 찾는 패턴이었는데 하나도 안 잡혔다. Next 16의 App Router HTML에는 그 파일 참조가 없다. 다음엔 `<script src>`의 청크 파일명 해시를 홈과 FAQ 사이에 비교했다. dev-m에서 홈·FAQ·약관이 같은 청크 다섯 개를 가리켰다. 여기서 "같은 빌드구나" 하고 넘어갈 뻔했다. Turbopack 청크 이름은 내용 해시라 공통 청크가 바뀌지 않았으면 다른 빌드여도 이름이 같다. 공통 청크는 증거가 못 된다.

결정적이었던 건 캐시 키를 바꾸는 방법이었다. `plick-documents` 정책은 쿼리스트링 전체를 캐시 키에 넣으므로 `/faq?kan679=<타임스탬프>`는 CloudFront에 저장된 적이 없는 키다. 그 요청은 `Miss from cloudfront`로 오리진에 가서 지금 EC2가 내는 HTML을 받아 온다. 그걸 저장분과 `diff`했다.

- dev-m: 저장분은 뷰포트 메타가 `maximum-scale=1, user-scalable=no`였고 새 HTML에는 그 둘이 없다. CSS 청크와 페이지별 JS 청크 이름이 전부 달랐다. 10월 16일 이후 어딘가에서 뷰포트 설정이 바뀌었는데 FAQ를 여는 사람은 아직 옛 설정을 받는다.
- dev: 크기는 같은데 CSS·JS 청크 이름이 달랐다. 10월 23일 빌드다.
- prod: 두 HTML이 같았다. 세션 시작 시점의 main 배포가 아직 진행 중이라 오리진도 10월 26일 빌드였기 때문이고, 그 배포가 끝나면 prod도 dev와 같은 상태가 된다.

하나 더 확인했다. 저장된 옛 HTML이 가리키는 옛 CSS 청크(`0rnrnn2h647tk.css`)를 요청하니 200이다. 배포 때 S3에 `--delete`를 안 붙여 구세대 청크를 남기기 때문이다([docs/deploy-v3-cdn.md](../deploy-v3-cdn.md) §7). 그래서 옛 HTML은 깨지지 않고 옛 버전으로 멀쩡히 동작한다. 열하루 동안 아무도 몰랐던 이유다. 깨졌으면 바로 알았을 것이다.

## 왜 이렇게 되나

요청은 브라우저에서 CloudFront로 가고, CloudFront가 ALB 뒤의 Next 서버에서 받은 응답을 저장해 두었다가 다음 요청에는 서버에 묻지 않고 저장분을 준다. 얼마나 오래 저장하는지는 두 겹으로 정해진다.

첫째는 CloudFront 캐시 정책이다. `plick-documents`는 최소 0초, 기본 0초, 최대 1년이다. 세션 중 `aws cloudfront get-cache-policy`로 다시 확인했다. 최소와 기본이 0이면 CloudFront는 오리진 응답의 `Cache-Control`이 말하는 기간만큼만 저장하고, 오리진이 아무 말도 안 하면 저장하지 않는다. 최대 1년은 오리진이 그보다 길게 말해도 1년에서 자르는 상한이다. ADR 0204에 적은 그대로다.

둘째는 Next 서버가 붙이는 `Cache-Control`이다. Next는 페이지 성격에 따라 값을 다르게 붙인다.

- 홈·팀 허브·릴스처럼 `revalidate`가 있거나 fetch에 캐시 기간이 있는 ISR 페이지는 `s-maxage=20, stale-while-revalidate=31535980` 같은 값이다. `s-maxage`는 공유 캐시(CloudFront 같은 중간 캐시)가 신선하다고 볼 기간이고, `stale-while-revalidate`는 그 기간이 지난 뒤에도 일단 옛 응답을 주면서 뒤에서 오리진에 새 응답을 받아 두라는 지시다. 그래서 배포 뒤 20초만 지나면 다음 요청이 갱신을 일으키고, 그다음 사람부터 새 HTML을 받는다.
- FAQ·약관·개인정보처리방침은 외부 데이터가 없고 `revalidate`도 없는 완전 정적 페이지다. 소스에 `revalidate`·`dynamic`·`headers()`·`cookies()` 어느 것도 없다. Next는 이런 페이지에 `s-maxage=31536000`만 붙인다. 빌드 때 만든 HTML이고 같은 빌드 안에서는 바뀔 일이 없으니 1년 저장해도 된다는 판단인데, `stale-while-revalidate`가 없다. "기간이 끝나기 전엔 다시 묻지 마라"만 있고 "뒤에서 새로 받아 둬라"가 없는 것이다.

Next 입장에서는 맞는 말이다. 같은 빌드 안에서 그 HTML은 정말 안 바뀐다. 문제는 배포가 빌드를 바꾼다는 사실을 CloudFront가 알 방법이 없다는 데 있다. 배포는 CodeDeploy가 EC2를 새 인스턴스로 교체하는 일이고 CloudFront의 저장분은 건드리지 않는다. 저장분을 지우라고 알리는 유일한 수단이 무효화(invalidation)다. 무효화는 "이 경로들의 저장분을 버려라"는 명령이고, 걸고 나면 다음 요청부터 Miss가 나서 오리진에 다시 묻는다. 경로에 `/*` 같은 와일드카드를 쓸 수 있고 그 한 줄이 경로 1개로 계산돼 월 1,000개 무료 한도 안이다.

`deploy.yml`에는 그 단계가 없었다. 151행 주석에 "같은 이유로 무효화도 필요 없다"고까지 적혀 있었는데, 그 주석은 `/_next/static` 자산에 대한 말이고 그때는 HTML 문서 캐시가 꺼져 있었다. 문서 캐시는 그 뒤 10월 16일(dev-m)과 10월 23일(나머지 셋)에 켰다. 켤 때 "배포하면 어떻게 되지"를 안 물었던 것이다. ADR 0204의 전후 표에는 FAQ가 `Hit → Hit`로 적혀 있다. 그게 성공 표시였는데 같은 표시가 이 문제의 증상이기도 했다.

영향 범위를 적어 두면 이렇다. 1년까지 남는 건 `/faq`·`/terms`·`/privacy`와 회원가입 같은 완전 정적 문서다. 하루까지 남는 건 `s-maxage=86400`인 팀·기사 OG 이미지와 `/api/tweet/*`다. 홈·팀 허브·릴스·기사 상세는 `stale-while-revalidate` 덕에 알아서 갱신되고, MY·로그인은 `private, no-store`라 저장 자체를 안 한다.

## 어디에 어떻게 넣었나

`Create deployment` 스텝은 `aws deploy create-deployment` 뒤에 `aws deploy wait deployment-successful`로 배포가 끝날 때까지 기다린다. Blue/Green에서 "성공"은 트래픽이 Green으로 다 넘어가고 Blue가 정리된 뒤다. 무효화는 그 다음 스텝으로 넣었다. 이 순서가 중요한 이유는, 전환 전에 지우면 그 사이 들어온 요청이 아직 Blue가 내는 구세대 HTML을 받아 CloudFront에 다시 채우기 때문이다. 그러면 무효화를 하고도 옛 버전이 남는다.

스텝은 이렇게 돈다.

1. 웹·모바일 두 배포에 `aws cloudfront create-invalidation --paths "/*"`를 차례로 걸고 돌아온 무효화 ID를 bash 연관 배열에 담는다.
2. 두 ID 모두에 `aws cloudfront wait invalidation-completed`를 건다.

생성을 둘 다 먼저 하고 대기를 그 뒤에 두는 건 두 무효화가 CloudFront 안에서 동시에 진행되게 하려는 것이다. 생성-대기-생성-대기로 짜면 둘째 무효화가 첫째가 끝난 뒤에야 시작돼 시간이 두 배 든다. `wait invalidation-completed`는 20초 간격으로 최대 30회, 10분까지 기다린다. 무효화는 보통 몇 분 안에 끝난다. 끝까지 기다리는 이유는 dev 배포 뒤 바로 도는 E2E 워크플로([ADR 0169](0169-e2e-qa-automation.md))가 새 버전을 봐야 하기 때문이다. 기다리지 않으면 E2E가 옛 HTML과 새 서버가 섞인 상태를 밟는다.

배포 ID를 어디 둘지는 티켓과 다르게 갔다. 티켓은 GitHub environment 변수로 두자고 했는데, `deploy.yml`은 사이트 URL·CodeDeploy 이름·버킷 이름처럼 비밀이 아닌 환경별 값을 전부 잡 env의 브랜치 분기 상수로 두고 있다. 배포 ID도 비밀이 아니고(이 ADR과 티켓에 그대로 적혀 있다) 같은 자리에 두면 코드 리뷰에서 보이고 콘솔 작업이 하나 준다. 그래서 `WEB_DISTRIBUTION_ID`·`MOBILE_DISTRIBUTION_ID`를 같은 방식으로 넣었다. dev는 `E1NRBTX3Y1PE98`·`E8Z1P2UP1OTYK`, prod는 `E1KX1LWBFZKMMY`·`EDJQ2UHUYBADH`다. 배포를 새로 만들면 여기를 고쳐야 한다는 건 주석에 남겼다.

## 권한은 저장소 밖이다

워크플로가 쓰는 OIDC 롤 `plick-front-github-role-dev`·`-prod`의 인라인 정책을 읽기 전용으로 확인했다. 지금은 `s3:PutObject`(배포 버킷·정적 버킷), `s3:ListBucket`(정적 버킷), CodeDeploy 다섯 액션뿐이고 CloudFront 액션은 없다. 그대로 머지하면 배포는 성공한 뒤 무효화 스텝에서 AccessDenied로 잡이 빨갛게 된다. 트래픽은 이미 Green으로 넘어간 뒤라 서비스는 멀쩡하지만 옛 HTML은 그대로다.

붙여야 하는 Statement는 이렇다. 리소스는 네 배포 ARN으로 한정한다.

```json
{
  "Effect": "Allow",
  "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
  "Resource": [
    "arn:aws:cloudfront::<계정ID>:distribution/E1NRBTX3Y1PE98",
    "arn:aws:cloudfront::<계정ID>:distribution/E8Z1P2UP1OTYK"
  ]
}
```

prod 롤은 `E1KX1LWBFZKMMY`·`EDJQ2UHUYBADH`다. `GetInvalidation`은 `wait invalidation-completed`가 상태를 물을 때 쓴다. CloudFront ARN에는 리전 자리가 비어 있다(`arn:aws:cloudfront::계정:...`). 글로벌 서비스라서다. 순서는 권한을 먼저 붙이고 PR을 머지하는 쪽이 맞다.

## 생각해 보고 안 한 것

정적 문서에 `revalidate`를 적어 `stale-while-revalidate`를 붙이는 방법이 있다. 그러면 무효화 없이도 그 주기마다 갱신된다. 하지만 배포와 무관한 주기라 배포 뒤 최대 그 시간만큼 옛 것이 남고, 정적 문서마다 설정을 넣어야 하며, 데이터가 없는 페이지를 주기적으로 다시 그리는 낭비가 생긴다. 근본은 "배포가 내용을 바꿨다"는 신호를 CDN에 주는 것이고 그게 무효화다.

경로를 가려 정적 문서만 무효화하는 방법도 있다. 홈처럼 `stale-while-revalidate`가 있는 문서는 어차피 알아서 갱신되니 빼자는 것인데, 어떤 경로가 정적인지 목록을 워크플로에 두고 페이지가 늘 때마다 맞춰야 한다. `/*`는 경로 1개로 세어 비용 차이가 없고 빠뜨릴 게 없다. 무효화 직후 잠깐 모든 문서가 Miss라 오리진 요청이 늘지만 정적·ISR 문서라 부담이 작다는 건 티켓에 적힌 그대로다.

## 바꾼 문서

`docs/deploy-v3-cdn.md` §7의 "무효화는 필요 없다"를 정적 자산에 한한 말로 고치고 문서 캐시 무효화 스텝과 권한을 적었다. `docs/deploy-v2.md` §14 운영 절차에 문서 캐시 항목을 넣고, 배포 뒤 확인은 정적 문서의 `age`부터 보라고 적었다.

## 헤드리스 리뷰가 잡은 것

push 전 `pr-review.sh`를 돌렸다. CRITICAL은 없었고 WARN 셋 중 둘을 받아들였다.

하나는 `Deployment failure info` 스텝이다. 조건이 `failure()`뿐이라 무효화 스텝이 AccessDenied로 죽어도 그 스텝이 돌고, CodeDeploy 배포 요약을 찍는다. 그 요약은 "Succeeded"일 텐데 빨간 잡의 마지막 출력이 그것이면 배포가 실패한 걸로 읽기 쉽다. `steps.create-deployment.outcome == 'failure'`를 조건에 보탰다. 다른 하나는 처음 짠 스크립트가 bash 연관 배열(`declare -A`)로 두 배포의 무효화 ID를 담았던 것이다. 러너의 bash는 4 이상이라 돌긴 하지만 배열 키가 빈 문자열이면 bad subscript로 죽어 원인이 안 보이고, 대상이 둘뿐인데 배열이 과했다. `WEB_INV`·`MOBILE_INV` 두 변수로 풀어 썼다. 생성 둘 먼저, 대기 둘 나중이라는 순서는 그대로다. 스텝 주석도 12줄에서 6줄로 줄이고 나머지는 이 ADR에 맡겼다.

받아들이지 않은 WARN은 권한이 없을 때를 대비해 스텝에 `continue-on-error`를 두자는 것이다. 무효화가 조용히 실패하면 이 티켓이 잡으려던 문제가 그대로 다시 생기는데 잡은 초록이라 아무도 모른다. 빨갛게 죽는 쪽이 맞다. INFO로 적힌 `wait` 10분 초과도 그대로 둔다. 그때는 콘솔의 Invalidations 탭에서 상태를 보면 되고, 대부분 이미 완료돼 있을 것이다.

## 검증과 남긴 것

저장소 안에서 할 수 있는 검증은 YAML이 파싱되는지, 스텝 스크립트의 `bash -n`, 그리고 `aws`를 가짜 스크립트로 바꿔 생성 둘·대기 둘이 그 순서로 호출되는지 본 드라이런뿐이다. 실제 확인은 머지 뒤다.

- dev 배포 한 번 뒤 두 dev 호스트 `/faq`의 `age`가 작게 시작하는지
- prod 릴리스 뒤 두 prod 호스트 `/faq`가 새 HTML인지
- 워크플로 로그에 무효화 ID 둘과 완료 메시지가 남는지

권한 콘솔 작업이 머지보다 먼저다. 그리고 prod는 세션 시작 때 돌던 main 배포가 끝난 뒤로 다시 10월 26일 FAQ를 내고 있을 것이라, 이 PR이 prod에 나가기 전까지는 손으로 한 번 더 무효화해야 한다.
