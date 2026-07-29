# 0059. 모바일 앱 EC2 배포와 CD 파이프라인 (KAN-334)

백엔드가 전부 AWS에 올라갔고, 프론트용 EC2도 하나 받았다. 이제 모바일 앱(`apps/mobile`)을
그 위에 띄우고 develop에 푸시하면 자동으로 배포되게 만드는 게 이번 작업이다.

시작할 때는 "빌드해서 서버에 복사하고 실행하면 되겠지" 정도로 생각했는데, 실제로는 예상과 다른
지점에서 네 번쯤 막혔다. 순서대로 적는다.

## 무엇을 만들었나

- `apps/mobile/next.config.js`에 `output: "standalone"`과 `outputFileTracingRoot` 추가
- `apps/mobile/app/api/health/route.ts` — 로드밸런서 헬스체크 전용 경로
- `scripts/deploy/mobile-release.sh` — EC2에서 도는 릴리스 교체 스크립트
- `.github/workflows/deploy-mobile.yml` — develop 푸시 시 빌드하고 배포하는 워크플로

## 첫 번째 벽: `.next`만 복사하면 안 뜬다

처음엔 단순하게 생각했다. `next build` 하면 `.next`가 나오니까 그걸 EC2에 복사하고
`next start` 하면 되는 것 아닌가.

안 된다. `.next`는 컴파일된 결과물일 뿐이고, 실행하려면 `next` 패키지 자체와 런타임 의존성들이
`node_modules`에 있어야 한다. 그럼 EC2에서 `pnpm install`을 돌리면 되지 않냐 싶은데, 여기서
모노레포가 발목을 잡는다.

이 리포는 pnpm 워크스페이스다. `apps/mobile/package.json`을 보면 `@plick/ui`, `@plick/domain`,
`@plick/core`가 `workspace:*`로 걸려 있다. 이건 npm 레지스트리에 올라간 패키지가 아니라 같은
리포 안의 폴더고, pnpm이 `node_modules/@plick/ui` 자리에 `../../packages/ui`를 가리키는
심볼릭 링크(파일 대신 다른 경로를 가리키는 바로가기)를 만들어 둔 것이다. 그러니까 `apps/mobile`만
서버에 복사하면 그 링크들이 전부 허공을 가리킨다. 리포 전체를 복사하고 서버에서 pnpm으로
설치를 다시 돌려야 하는데, 그러려면 서버에 pnpm과 전체 소스가 있어야 하고 빌드 캐시도 없이
매번 install을 돌게 된다.

이걸 위해 Next가 준비해 둔 게 `output: "standalone"`이다. 빌드할 때 실제로 import된 파일만
추적해서 `.next/standalone` 아래에 런타임까지 통째로 담아 준다. 심볼릭 링크가 아니라 실체 파일로
복사되므로, 결과물만 서버에 던지면 `node server.js`로 바로 뜬다. 서버에 pnpm도 소스도 필요 없다.

### `outputFileTracingRoot`를 같이 잡아야 한다

standalone만 켜면 될 줄 알았는데 옵션이 하나 더 필요했다. `outputFileTracingRoot`는 그 파일
추적이 어디서부터 시작할지를 정하는 값이다. 기본값으로 두면 Next가 앱 폴더(`apps/mobile`)를
기준으로 잡을 수 있는데, 그러면 `packages/*`가 추적 범위 밖이라 워크스페이스 패키지가 통째로
빠진다. 리포 루트로 올려 줘야 한다.

ESM(`type: "module"`) 설정 파일이라 `__dirname`이 없어서 이렇게 썼다.

```js
const appDir = path.dirname(fileURLToPath(import.meta.url));
// ...
outputFileTracingRoot: path.join(appDir, "../../"),
```

빌드해 보니 `.next/standalone/apps/mobile/server.js`가 생겼고 전체 40MB였다. 재밌는 건
`.next/standalone/node_modules`가 거의 비어 있었다는 점이다. Next 16은 빌드에 Turbopack을
쓰는데, 서버 코드를 번들링하면서 `@plick/*` 워크스페이스 패키지를 청크 안에 인라인해 버린다.
그래서 별도 `node_modules` 없이도 돈다. 예상보다 깔끔한 결과였다.

## 두 번째 벽: static과 public이 안 들어간다

산출물을 실행해 봤더니 페이지는 뜨는데 CSS가 하나도 안 먹었다.

standalone은 `public/`과 `.next/static/`을 담지 않는다. 버그가 아니라 의도된 설계다. 이
파일들은 CDN에 따로 올리는 게 정석이라, Next는 "너희가 알아서 배포하겠지" 하고 뺀다. 우리는
한 서버에서 다 서빙할 거라 배포 과정에서 손으로 채워 넣어야 한다.

```
cp -r .next/static  .next/standalone/apps/mobile/.next/static
cp -r public        .next/standalone/apps/mobile/public
```

이걸 워크플로의 `Assemble standalone` 스텝에 넣었다. 나중에 누가 이유를 모르고 지울까 봐
`next.config.js` 주석에도 남겼다.

## 세 번째 벽: `API_BASE_URL`이 빌드 시점에 굳는다

이게 제일 헷갈렸던 부분이다.

`next.config.js`의 `rewrites()`는 브라우저가 `/be/*`를 부르면 Next가 BE로 넘겨주는 프록시
설정이다(KAN-271). 여기서 `process.env.API_BASE_URL`을 읽는데, 나는 당연히 서버가 뜰 때
읽는 줄 알았다. 그러니까 EC2의 `.env`에 BE 주소를 넣어 두면 되는 줄 알았다.

아니었다. `rewrites()`는 `next build` 때 딱 한 번 실행되고, 그 반환값이
`.next/routes-manifest.json`에 문자열로 굳어 버린다. 서버는 뜰 때 그 JSON을 읽을 뿐이라
런타임 환경변수를 아무리 바꿔도 프록시 대상은 안 바뀐다.

확인해 보려고 일부러 가짜 주소로 빌드한 뒤 매니페스트를 열어 봤다.

```json
{
  "source": "/be/:path*",
  "destination": "http://10.0.0.1:8080/:path*",
  "regex": "^/be(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$"
}
```

그대로 박혀 있었다. 추측이 아니라 확인된 사실이다.

그래서 환경변수를 두 종류로 갈랐다.

- 빌드 타임: `API_BASE_URL` — 빌드하는 쪽(GitHub Actions)의 시크릿으로 넘긴다
- 런타임: `KAKAO_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `OAUTH_REDIRECT_URI`, `PORT` — EC2의
  `/srv/plick-mobile/shared/.env`에 둔다. 이건 서버 코드가 요청마다 `process.env`로 읽는다

BE 주소가 바뀌면 코드를 고치는 게 아니라 시크릿만 바꾸고 워크플로를 재실행하면 된다.
그래서 워크플로에 `workflow_dispatch`를 넣어 뒀다.

### `??`를 `||`로 바꾼 이유

원래 코드는 이랬다.

```js
const base = process.env.API_BASE_URL ?? "http://localhost:8080";
```

GitHub Actions는 존재하지 않는 시크릿을 `undefined`가 아니라 빈 문자열로 넘긴다. `??`
(nullish 병합)는 `null`과 `undefined`만 걸러내므로 빈 문자열은 그대로 통과한다. 그러면
destination이 `"/:path*"`가 되어서 `/be/*`가 자기 자신으로 되도는 리라이트가 만들어진다.

`||`로 바꾸면 빈 문자열도 falsy라 폴백이 걸린다. 원래 `??`가 더 정확한 연산자로 통하지만,
여기서는 빈 문자열이 "값 없음"과 같은 의미라 `||`가 맞다. BE ALB가 아직 없어서 시크릿을 나중에
채워야 하는 상황이라 이 함정을 먼저 막아 뒀다.

## 네 번째 벽: 맥에서 빌드한 산출물은 못 쓴다

원래 계획은 "손으로 한 번 배포해서 되는 걸 확인하고, 그다음에 자동화한다"였다. 자동화는 이미
되는 걸 반복하는 도구지 안 되는 걸 되게 하는 도구가 아니니까.

그런데 로컬 맥에서 빌드한 산출물을 뒤져 보다가 이걸 발견했다.

```
.next/standalone/node_modules/.pnpm/@img+sharp-darwin-arm64@0.34.5/.../sharp-darwin-arm64.node
```

`sharp`는 Next의 이미지 최적화가 쓰는 라이브러리인데, C로 짜인 네이티브 바이너리를 플랫폼별로
따로 배포한다. 내 맥은 Apple Silicon이라 `darwin-arm64` 버전이 딸려 들어간 것이다. 이걸
Linux x86_64인 EC2에 올리면 런타임에 로드가 안 된다.

앞서 인스턴스 스펙을 정할 때 "Graviton(ARM) EC2를 쓰면 x86 러너에서 빌드한 게 안 맞는다"고
경고했는데, 정작 같은 문제가 내 개발 머신에서 빌드하는 순간 그대로 생기는 거였다. 방향만 반대다.

그래서 순서를 뒤집었다. 첫 배포부터 GitHub Actions(`ubuntu-latest`, x86_64)에서 빌드한다.
EC2도 x86 계열(t3)로 골랐으니 러너와 아키텍처가 맞는다. 맥에서 빌드해 scp로 던지는 경로는
아예 없앴다.

교훈이라면, 산출물을 만든 기계와 실행할 기계가 다를 때는 그 안에 플랫폼 종속 바이너리가
들어있는지 한 번은 열어 봐야 한다는 것. `find . -name "*.node"` 한 줄이면 된다.

## HTTPS는 선택이 아니었다

nginx 없이 그냥 띄우면 안 되냐는 얘기가 나왔는데, 여기서 nginx가 하는 일은 사실상 TLS 종료뿐이다.
정적 파일 서빙이나 압축은 Next가 자기가 한다. 그래서 진짜 질문은 "nginx가 필요한가"가 아니라
"HTTPS가 필요한가"였고, 답은 필요하다 쪽이었다. 두 가지가 동시에 막는다.

첫째, 구글 OAuth는 localhost를 뺀 `http://` 리다이렉트 URI를 콘솔 등록 단계에서 거부한다.
코드로 우회할 수 있는 영역이 아니다.

둘째, `app/_constants/api.ts`의 `AUTH_COOKIE_BASE`가 프로덕션에서 `secure: true`로 쿠키를
심는다. http 페이지에서는 브라우저가 이 쿠키를 저장하지 않고 버린다. 로그인 요청 자체는
성공해도 다음 요청에 토큰이 안 실려서 계속 로그아웃 상태로 보인다. 원인 찾기 참 어려운 증상이다.

결국 ALB(ACM 인증서로 TLS 종료)로 가기로 했다. nginx나 Caddy를 EC2에 얹는 것보다 인증서
갱신 관리가 사라지는 게 크고, 나중에 web(3000)까지 올릴 때 리스너 규칙으로 호스트를 갈라
대상 그룹만 추가하면 되는 것도 이유다. 대신 트래픽이 0이어도 월 20달러 안팎이 고정으로 나간다.

EC2 쪽은 그래서 평문 3001만 열고, 리버스 프록시를 아예 설치하지 않았다.

## 헬스체크 경로를 따로 둔 이유

ALB 대상 그룹의 헬스체크 기본 경로는 `/`다. 그냥 두면 될 것 같지만 위험하다.

`/`는 홈 피드고, 서버 컴포넌트가 BE로 fetch를 나간다. BE가 잠깐 흔들려서 `/`가 500을 뱉으면
ALB는 그걸 "이 인스턴스가 죽었다"로 읽고 대상에서 내려 버린다. 그러면 Next 프로세스는 멀쩡한데
사이트 전체가 503이 된다. BE 장애가 프론트 전면 장애로 증폭되는 구조다.

그래서 `app/api/health/route.ts`를 만들었다. BE도 DB도 부르지 않고 200만 돌려준다. ALB가
판단해야 할 건 "Node 프로세스가 살아서 요청을 받고 있는가" 하나뿐이고, 그게 전부다.

`proxy.ts`의 matcher가 `api`를 이미 제외하고 있어서 토큰 갱신 미들웨어도 안 탄다. 헬스체크가
30초마다 들어오는데 그때마다 refresh 로직이 도는 건 낭비니까, 이 점도 마침 맞았다.

## 배포 구조: releases와 current 심볼릭 링크

서버 디렉터리를 이렇게 잡았다.

```
/srv/plick-mobile/releases/<커밋sha>/   배포마다 새로 푼다
/srv/plick-mobile/current -> releases/<sha>
/srv/plick-mobile/shared/.env           런타임 env, 배포와 무관하게 유지
```

새 릴리스를 옆에 풀어 두고 `current` 링크만 갈아끼우는 방식이다. 교체가 원자적에 가깝고,
롤백이 링크를 되돌리는 한 번으로 끝난다. 기존 릴리스를 덮어쓰는 방식이면 배포 중간에 실패했을 때
돌아갈 곳이 없다.

`shared/.env`를 릴리스 밖에 둔 것도 같은 이유다. 배포할 때마다 env를 다시 넣지 않아도 되고,
롤백해도 설정은 그대로다.

`mobile-release.sh`가 하는 일은 순서대로 이렇다. 압축 풀기 → `current` 교체 → `shared/.env`를
`set -a` 구간에서 읽어 pm2에 물려주기 → pm2 재기동 → 헬스체크를 최대 40초까지 재시도 →
실패하면 직전 릴리스로 되돌리고 종료 코드 1 → 성공하면 오래된 릴리스를 5개만 남기고 정리.

`PREV`는 교체하기 _전에_ `readlink`로 잡아 둔다. 교체한 뒤에 읽으면 새 릴리스를 가리키니까
롤백할 곳을 잃는다. 첫 배포라 `current`가 없으면 빈 문자열이고, 그때는 되돌릴 곳이 없다고
로그만 남기고 실패시킨다.

스크립트를 EC2에 미리 두지 않고 `ssh ... "bash -s" < scripts/deploy/mobile-release.sh`로
표준입력에 흘려보낸다. 배포 로직이 리포에서 버전 관리되고, 서버에 있는 스크립트가 낡아서 생기는
불일치가 없다.

## 아직 안 끝난 것

- BE 앞단 프라이빗 ALB가 아직 안 만들어졌다. 그게 생기면 `API_BASE_URL` 시크릿에 그 내부 ALB의
  DNS 이름을 넣고 워크플로를 재실행하면 된다. 프라이빗 IP를 박으면 안 된다. ALB의 IP는 AWS가
  예고 없이 바꾼다
- 프론트 ALB, ACM 인증서, `m.plick.co.kr` DNS 연결
- 카카오·구글 콘솔에 `https://m.plick.co.kr/oauth/callback` 등록
- ALB가 붙기 전까지는 3001을 임시로 열어 `http://<EIP>:3001`로 확인할 수 있다. 이 경로에서는
  위에 쓴 이유로 로그인이 안 되는 게 정상이다. 확인이 끝나면 3001은 ALB 보안그룹에서만
  들어오도록 좁힌다
- 배포 워크플로와 CI(`ci.yml`)가 따로 돈다. develop 푸시 시 두 워크플로가 동시에 시작하므로,
  타입 에러가 있는 커밋도 일단 배포는 나간다. 지금은 헬스체크가 최소한의 방어선이고, 나중에
  `workflow_run`으로 CI 성공에 물리는 걸 검토한다
- web(`apps/web`)은 아직 배포 대상이 아니다. 같은 EC2에 3000으로 올리고 ALB 리스너 규칙에서
  호스트로 가르는 그림인데, 모바일이 안정적으로 도는 걸 본 다음에 한다
