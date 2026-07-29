# 프론트엔드 배포 운영 문서 (EC2 + ALB)

web과 mobile을 EC2 한 대에 올리고 ALB로 도메인을 가르는 구성이다. 이 문서는 그걸 처음부터
세우는 순서와, 세운 뒤에 운영하는 방법을 담는다.

배경과 판단 근거, 작업하면서 막혔던 기록은 [ADR 0059](adr/0059-mobile-ec2-deploy.md)에 있다.
여기는 "무엇을 어떤 순서로 하는가"만 다룬다.

## 전체 그림

```
브라우저
  │  https://plick.co.kr        https://m.plick.co.kr
  ▼
프론트 ALB (인터넷 노출, ACM 인증서로 TLS 종료)
  │  호스트 헤더로 분기
  ├─ plick.co.kr    → plick-web-tg    → EC2:3000  (pm2 plick-web)
  └─ m.plick.co.kr  → plick-mobile-tg → EC2:3001  (pm2 plick-mobile)
                                          │
                                          │ 서버 컴포넌트 fetch
                                          │ 브라우저 /be/* 프록시
                                          ▼
                                    내부 ALB (프라이빗)
                                          │
                                          ▼
                                    BE EC2 (Spring)
```

브라우저는 BE를 직접 부르지 않는다. 서버 컴포넌트든 브라우저 fetch든 BE로 나가는 요청의
출발지는 항상 Next EC2다. 그래서 BE는 인터넷에 노출할 필요가 없고 CORS 설정도 필요 없다.

| 앱     | 포트 | 디렉터리            | pm2 이름       | 도메인          |
| ------ | ---- | ------------------- | -------------- | --------------- |
| web    | 3000 | `/srv/plick-web`    | `plick-web`    | `plick.co.kr`   |
| mobile | 3001 | `/srv/plick-mobile` | `plick-mobile` | `m.plick.co.kr` |

## 1단계. DNS를 Route 53으로 옮긴다

가장 먼저 시작해야 한다. 전파에 시간이 걸려서 다른 작업과 병행하는 게 좋다.

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

도메인에는 두 가지 역할이 붙는다.

- 등록기관(registrar): 도메인을 판매하고 소유권을 관리하는 곳. 가비아, 후이즈 같은 곳
- 권한 네임서버(authoritative nameserver): "이 도메인의 레코드가 뭐냐"는 질문에 답하는 서버

보통 도메인을 사면 등록기관이 자기 네임서버를 기본으로 붙여 준다. 우리가 할 일은 그 지정만
Route 53의 네임서버로 바꾸는 것이다. 그러면 이후 레코드 관리는 Route 53에서 하게 된다.
청구도 도메인 갱신비는 등록기관에, DNS 호스팅비는 AWS에 따로 나간다.

### 순서

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

### 옮기지 않는 선택지

지금 쓰는 DNS 업체가 ALIAS나 ANAME(CNAME 평탄화)을 지원하면 그걸로도 된다. 이름은 업체마다
다르다. 지원 여부를 확인해 보고 있으면 apex에 ALIAS로 ALB DNS 이름을 넣으면 그만이다.

지원하지 않는데 Route 53도 쓰기 싫다면, apex를 포기하고 `www.plick.co.kr`을 정본으로 삼는
방법이 남는다. 다만 사용자가 주소창에 `plick.co.kr`을 칠 때 아무 데도 안 닿는 게 되므로
권하지 않는다.

## 2단계. GitHub 시크릿 등록

리포 Settings → Secrets and variables → Actions → Repository secrets.

| 이름           | 값                                                     |
| -------------- | ------------------------------------------------------ |
| `EC2_HOST`     | EC2 퍼블릭 IP (Elastic IP 권장)                        |
| `EC2_SSH_KEY`  | pem 파일 내용 전체. `BEGIN`부터 `END` 줄까지 개행 포함 |
| `API_BASE_URL` | BE 내부 ALB DNS 이름. 아직 없으면 비워 둔다            |

`API_BASE_URL`이 비어 있어도 워크플로는 돈다. `next.config.js`에서 빈 문자열이면
`http://localhost:8080`으로 폴백하게 해 뒀다. BE를 부르지 않는 화면은 정상으로 뜬다.

이 값이 빌드 시점에 산출물로 굳는다는 점이 중요하다. 나중에 BE 주소가 정해지면 시크릿을
고치고 배포를 다시 돌려야 한다. EC2의 `.env`를 고쳐도 반영되지 않는다.

## 3단계. EC2에 앱 자리 만들기

앱마다 같은 구조를 하나씩 만든다.

```bash
sudo mkdir -p /srv/plick-web/releases /srv/plick-web/shared && sudo chown -R ubuntu:ubuntu /srv/plick-web
```

```bash
sudo mkdir -p /srv/plick-mobile/releases /srv/plick-mobile/shared && sudo chown -R ubuntu:ubuntu /srv/plick-mobile
```

`ubuntu` 소유로 두는 게 중요하다. 배포가 sudo 없이 파일을 써야 한다.

`/srv/plick-web/shared/.env`

```
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
KAKAO_CLIENT_ID=<카카오 client_id>
GOOGLE_CLIENT_ID=<구글 client_id>
OAUTH_REDIRECT_URI=https://plick.co.kr/oauth/callback
```

`/srv/plick-mobile/shared/.env`

```
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
KAKAO_CLIENT_ID=<카카오 client_id>
GOOGLE_CLIENT_ID=<구글 client_id>
OAUTH_REDIRECT_URI=https://m.plick.co.kr/oauth/callback
```

`HOSTNAME=0.0.0.0`이 빠지면 127.0.0.1에만 묶여서 ALB가 접속하지 못한다. 헬스체크가 전부
실패하는데 원인이 잘 안 보이니 주의한다.

`API_BASE_URL`은 여기 넣지 않는다. 넣어도 안 먹는다.

런타임 준비물은 Node 22와 pm2다. pm2는 부팅 자동 기동까지 등록해 둔다.

```bash
pm2 startup systemd
```

출력으로 나오는 `sudo env PATH=...` 한 줄을 그대로 다시 실행해야 등록이 끝난다.

## 4단계. 첫 배포

배포는 main 푸시에 걸려 있다. develop에서 main으로 병합하면 Deploy 워크플로가 돌면서
두 앱을 동시에 빌드하고 EC2에 올린다.

Actions 탭에서 두 잡(`Deploy web`, `Deploy mobile`)이 다 초록인지 확인한다. 실패하면
`Release` 스텝의 로그를 본다. 헬스체크 실패면 스크립트가 직전 릴리스로 되돌린 뒤 종료한다.

## 5단계. ALB 없이 먼저 확인

ALB를 만들기 전에 앱이 실제로 떴는지부터 본다. 보안그룹에 3000, 3001을 내 IP에만 임시로 열고
확인한다.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://<EC2 퍼블릭IP>:3001/api/health
```

200이면 파이프라인 전체가 검증된 것이다. 브라우저로 열어 화면도 확인한다.

이 경로에서 로그인은 안 된다. 정상이다. 인증 쿠키가 프로덕션에서 `secure: true`라 http
페이지에서는 브라우저가 저장하지 않고 버린다. HTTPS가 붙은 뒤에 확인할 항목이다.

## 6단계. ACM 인증서

리전은 ALB와 같아야 한다. 서울이면 ap-northeast-2다. CloudFront용으로 us-east-1에 받는 것과
헷갈리지 않는다.

- 도메인 이름: `plick.co.kr`
- 대체 이름(SAN): `m.plick.co.kr`
- 검증 방법: DNS 검증

인증서 하나에 두 도메인을 담으면 리스너에 인증서를 하나만 붙이면 된다. 와일드카드
`*.plick.co.kr`로 받는 경우 apex는 포함되지 않으므로 `plick.co.kr`을 따로 추가해야 한다.

Route 53을 쓰고 있으면 검증용 CNAME을 콘솔 버튼 한 번으로 넣을 수 있다. 몇 분이면 발급된다.

## 7단계. 대상 그룹과 ALB

대상 그룹 두 개를 만든다. 유형은 Instances, 프로토콜은 HTTP.

| 이름              | 포트 | 헬스체크 경로 |
| ----------------- | ---- | ------------- |
| `plick-web-tg`    | 3000 | `/api/health` |
| `plick-mobile-tg` | 3001 | `/api/health` |

헬스체크 경로를 `/`로 두면 안 된다. `/`는 서버 컴포넌트가 BE로 fetch를 나가는 화면이라,
BE가 잠깐 흔들려 500이 나오면 ALB가 인스턴스를 대상에서 내려 버린다. BE 장애가 프론트 전면
503으로 번진다. `/api/health`는 BE를 부르지 않고 200만 돌려주도록 만들어 둔 경로다.

로드밸런서는 Application Load Balancer, internet-facing으로 만든다. 서브넷은 서로 다른 AZ에
두 개 이상 지정해야 한다. ALB의 하드 요구사항이라 하나뿐이면 여기서 막힌다.

리스너 443(HTTPS)에 위 인증서를 붙이고 규칙을 건다.

- Host header = `plick.co.kr` → `plick-web-tg`
- Host header = `m.plick.co.kr` → `plick-mobile-tg`
- 기본 동작: 404 고정 응답

기본 동작을 404로 두면 등록하지 않은 호스트로 들어온 요청이 엉뚱한 앱에 닿지 않는다.

리스너 80(HTTP)은 443으로 리다이렉트한다. 전달이 아니라 리다이렉트다.

`X-Forwarded-Proto`는 ALB가 자동으로 붙여 주므로 따로 설정할 게 없다.

## 8단계. 도메인 연결

Route 53 호스팅 영역에서 레코드 두 개를 만든다.

- `plick.co.kr` — A 레코드, Alias 켜기, 대상은 위에서 만든 ALB
- `m.plick.co.kr` — A 레코드 Alias(권장) 또는 CNAME으로 ALB DNS 이름

서브도메인은 CNAME도 되지만 Alias로 통일하는 게 관리하기 편하다.

## 9단계. OAuth 콘솔 등록

카카오와 구글 콘솔에 리다이렉트 URI를 등록한다. 도메인이 다르면 별개 URI라 각각 필요하다.

- `https://plick.co.kr/oauth/callback`
- `https://m.plick.co.kr/oauth/callback`

한 글자라도 다르면 프로바이더가 거절한다. 구글은 localhost를 뺀 `http://` URI를 애초에
등록받지 않으므로 HTTPS가 붙은 뒤에 해야 한다.

여기까지 하면 로그인을 실제로 밟아 볼 수 있다.

## 10단계. 보안그룹 조이기

확인이 끝나면 임시로 열어 둔 걸 닫는다. 소스는 IP 대역이 아니라 보안그룹 ID로 지정한다.
그래야 인스턴스가 늘거나 IP가 바뀌어도 규칙을 손댈 일이 없다.

| 대상        | 인바운드    | 소스           |
| ----------- | ----------- | -------------- |
| 프론트 ALB  | 80, 443     | `0.0.0.0/0`    |
| Next EC2    | 3000, 3001  | 프론트 ALB SG  |
| Next EC2    | 22          | 내 IP          |
| BE 내부 ALB | 리스너 포트 | Next EC2 SG    |
| BE EC2      | 8080        | BE 내부 ALB SG |

3000, 3001을 `0.0.0.0/0`으로 열어 두면 ALB를 우회해 http로 접근이 되는데, 그 경로에는 HTTPS가
없어서 인증 쿠키가 제대로 동작하지 않는다. 반드시 좁힌다.

## BE 내부 ALB가 생기면

1. GitHub 시크릿 `API_BASE_URL`에 내부 ALB의 DNS 이름을 넣는다.
   `http://internal-<이름>-<숫자>.ap-northeast-2.elb.amazonaws.com` 형태다
2. 포트는 ALB 리스너 포트다. BE 앱이 8080이어도 리스너가 80이면 포트를 붙이지 않는다
3. Actions → Deploy → Run workflow로 재실행한다

프라이빗 IP를 박으면 안 된다. 내부 ALB의 IP도 AWS가 예고 없이 바꾼다. 반드시 DNS 이름을 쓴다.
그 이름은 VPC 안에서만 풀리므로 Actions 러너에서 접속되지 않는 게 정상이다. 빌드 때는 문자열로
박히기만 하고 실제 호출은 EC2에서 일어난다.

## 운영

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

`API_BASE_URL`은 이 방법으로 안 바뀐다. 시크릿을 고치고 재배포해야 한다.

## 자주 막히는 곳

**대상 그룹이 계속 unhealthy** — `HOSTNAME=0.0.0.0`이 `.env`에 있는지, 보안그룹에서 ALB SG가
3000/3001에 들어올 수 있는지, 헬스체크 경로가 `/api/health`인지 순서대로 본다.

**CSS와 이미지가 전부 404** — standalone 산출물에 `.next/static`과 `public`이 안 들어간
것이다. 워크플로의 `Assemble standalone` 스텝을 확인한다.

**홈 화면이 비어 있음** — Next EC2에서 BE 내부 ALB로 못 닿는 것이다. EC2에서 직접 curl로
확인한다. 열에 아홉은 BE ALB 보안그룹에 Next EC2 SG가 안 들어가 있다.

**로그인 성공인데 계속 로그아웃 상태** — http로 접근 중일 가능성이 높다. 인증 쿠키가
프로덕션에서 `secure: true`라 https가 아니면 브라우저가 버린다.

**배포는 성공인데 옛날 코드가 보임** — 브라우저 캐시이거나 `current` 링크가 안 바뀐 것이다.
`readlink /srv/plick-mobile/current`로 확인한다.

**ACM 인증서 발급이 안 끝남** — 검증용 CNAME이 실제 DNS에 반영됐는지 확인한다. Route 53으로
옮기는 중이라면 네임서버 전파가 먼저 끝나야 한다.
