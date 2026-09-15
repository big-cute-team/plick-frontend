# 0136. 모니터링 수집 대상에 메인 API 서버 추가

2026-09-11. KAN-473.

## 무슨 일이었나

백엔드에서 요청이 하나 들어왔다. 메인 API 서버 지표를 긁는 설정을 프런트 리포에 넣어 달라는 것이다.

처음엔 좀 의아했다. 백엔드 서버를 왜 프런트 리포에서 긁나. 이유는 모니터링 스택의 소유권에 있다.
프로메테우스와 그라파나는 KAN-455에서 프런트가 세웠고(ADR 0130), 그 설정의 정본이
`infra/monitoring/`에 있다. 수집 주체가 프런트 쪽 인스턴스니 누구를 긁을지도 여기서 정해진다.
백엔드는 자기 서버에 `/actuator/prometheus`를 열어 주는 데까지가 일이고(KAN-466),
그걸 긁으러 가는 쪽 설정은 여기 있다.

그런데 이미 돌아가는 모니터링 서버에는 백엔드가 손으로 넣어 뒀다고 했다. 그러면 왜 또 넣나.
이게 이 티켓의 핵심이다. 돌아가는 인스턴스의 `/srv/monitoring`은 정본이 아니라 사본이다.
그 인스턴스는 부팅할 때 user data로 받은 tar를 풀어서 뜬다. user data는 이 리포의
`infra/monitoring/`을 `scripts/monitoring/build-user-data.sh`로 묶은 것이다. 즉 살아 있는
서버에만 넣은 설정은 그 인스턴스가 죽는 순간 같이 사라진다. 인스턴스를 새로 띄우면
리포에 있는 것만 되살아난다. 그래서 "완료 조건"의 두 번째 줄이 "모니터링 인스턴스를 새로
띄워도 메인 API 서버가 수집 대상에 남는다"였다.

## 한 일

`prometheus.yml`에 잡을 하나 더했다. 기존 프런트 두 잡과 구조가 같다.

```yaml
- job_name: plick-main
  metrics_path: /actuator/prometheus
  ec2_sd_configs:
    - region: ap-northeast-2
      port: 9466
      ...
      filters:
        - name: tag:Name
          values: [plick-main-prod]
```

프런트 잡과 다른 데가 두 군데다.

하나는 `metrics_path`다. 프런트 잡에는 이 줄이 없다. 프로메테우스의 기본값이 `/metrics`이고
프런트 앱은 `instrumentation.ts`가 여는 메트릭 서버를 바로 그 경로에 두기 때문이다. 백엔드는
스프링 부트라 액추에이터가 `/actuator/prometheus`에 지표를 뱉는다. 그래서 여기만 명시한다.

다른 하나는 포트와 Name 태그다. 9466이고 `plick-main-prod`다. 프런트는 한 인스턴스에서
mobile(9464)과 web(9465) 두 프로세스가 돌아 잡이 둘로 갈리는데, 메인 API는 하나라 잡도 하나다.

`ec2_sd_configs`를 그대로 쓴 건 프런트와 같은 이유다. IP를 static으로 박아 두면 인스턴스가
바뀌는 순간 죽은 주소가 된다. 태그로 찾으면 인스턴스가 통째로 갈려도 설정을 안 건드린다.
자격 증명은 모니터링 EC2의 인스턴스 롤에서 나오는데, `ec2:DescribeInstances`는 리전 단위
권한이라 프런트 인스턴스를 찾던 롤이 메인 API 인스턴스도 그대로 찾는다. IAM은 손댈 게 없었다.

보안그룹도 손댈 게 없었다. 백엔드가 `main-sg-prod`에 9466 인바운드를 소스
`front-monitoring-sg-prod`로 이미 열어 뒀다. 프라이빗 서브넷이라 이 규칙이 없으면
타깃은 보이는데 전부 down으로 뜬다. ADR 0130에서 프런트로 한 번 겪은 함정이라 미리 열어 준 것 같다.

## 알림 규칙에서 잡이 새는 걸 발견했다

잡만 넣고 끝낼 뻔했는데, 알림 규칙을 보다가 걸리는 걸 찾았다. 타깃 down 규칙의 식이 이랬다.

```
up{job=~"plick-front-.*"} == 0
```

`plick-front-.*`다. 새로 넣은 잡 이름은 `plick-main`이라 이 정규식에 안 걸린다. 그대로 뒀으면
메인 API를 긁기는 하는데 죽어도 아무도 안 울리는 상태가 된다. 대시보드를 사람이 들여다볼 때만
아는, 제일 나쁜 종류의 반쪽짜리 모니터링이다.

티켓의 완료 조건에는 알림 얘기가 없었다. 그래서 고칠지 말지를 판단해야 했는데, 이건 기술 문제가
아니라 누가 호출받느냐의 문제였다. 넓히면 백엔드 서버 장애가 프런트 슬랙 채널로 들어온다.
채널 주인이 결정할 일이라 물어봤고, 넓히기로 했다.

```
up{job=~"plick-.*"} == 0
```

`plick-front-.*`에서 `plick-.*`로 한 글자 묶음만 줄였다. 앞으로 `plick-` 접두사로 잡을 더 넣으면
자동으로 알림 대상이 된다. 잡 이름 짓기가 곧 알림 등록이 되는 셈이라, 접두사 규칙을 지키는 게
전보다 중요해졌다.

## 검증

설정 파일은 눈으로 봐서는 맞는지 모른다. 두 가지로 확인했다.

먼저 문법이다. promtool을 도커로 돌렸다.

```
docker run --rm -v "$PWD/infra/monitoring/prometheus:/cfg:ro" \
  --entrypoint promtool prom/prometheus:latest check config /cfg/prometheus.yml
# SUCCESS: /cfg/prometheus.yml is valid prometheus config file syntax
```

더 중요한 건 두 번째 완료 조건이다. "인스턴스를 새로 띄워도 남는가"는 파일을 고쳤다고 저절로
참이 되지 않는다. user data 빌드 스크립트가 이 파일을 실제로 집어 가는지를 봐야 한다.
그래서 payload를 만들어서 도로 풀어 봤다. 새 인스턴스가 받게 될 바로 그 바이트를 검사한 것이다.

```
scripts/monitoring/build-user-data.sh > ud.sh
# ud.sh 안의 base64 덩어리를 도로 풀어서
python3 -c "...print([j['job_name'] for j in d['scrape_configs']])"
# ['prometheus', 'plick-front-mobile', 'plick-front-web', 'plick-main']
```

넓힌 알림 식도 payload 안에서 `up{job=~"plick-.*"}`로 나왔다. 새로 띄운 인스턴스가 잡과 알림을
둘 다 들고 뜬다는 뜻이다.

하다가 부수적으로 하나 걸렸다. payload가 10855바이트였다. 문서에는 "약 6KB, 제한 16KB"라고
적혀 있었는데 그 사이에 대시보드와 알림 프로비저닝이 늘면서 두 배 가까이 커졌다. 제한이 16KB라
남은 여유가 생각보다 적다. 문서의 숫자를 11KB로 고쳤다. 지금은 문제가 없지만 대시보드를 몇 개
더 넣으면 걸릴 수 있는 선이다.

## 삽질

prettier를 잘못 돌렸다. 고친 파일을 포맷하려고 `npx prettier --write`에 yml 파일까지 같이
넘겼는데, 그러자 알림 규칙 파일의 엉뚱한 줄이 따옴표 스타일까지 바뀌어 나왔다. 내가 건드리지도
않은 줄이다.

이유는 리포의 format 스크립트 glob에 있었다.

```
"format": "prettier --write \"**/*.{ts,tsx,js,mjs,cjs,json,css,md}\""
```

yml과 yaml이 없다. 이 리포의 YAML은 애초에 prettier 관리 대상이 아니었다. 그래서 커밋돼 있던
파일이 prettier 기준으로는 "포맷 안 된" 상태였고, 내가 직접 prettier를 먹이자 그 부분까지
같이 바꿔 버린 것이다. CI의 `format:check`도 같은 glob을 쓰니 원래대로 둬도 아무 문제가 없다.

바꾼 줄을 원래 따옴표로 되돌려서 diff를 내 한 줄짜리 변경만 남겼다. 교훈은 포맷터를 파일에
직접 먹이기 전에 리포가 그 확장자를 관리하는지부터 보라는 것이다. 안 그러면 리뷰어가
"이 줄은 왜 바뀌었지"를 묻게 되는 노이즈가 생긴다.

## 남은 것

메인 API 지표를 쓰는 그라파나 패널은 안 만들었다. 지금은 긁어서 쌓기만 하고 보는 화면이 없다.
어떤 지표를 어떻게 볼지는 백엔드가 뭘 노출했는지(KAN-466) 보고 정하는 게 맞아서 이번엔 뺐다.

## 이어지는 문서

- [ADR 0130](0130-prometheus-grafana-monitoring.md): 모니터링 스택을 처음 세운 기록
- [ADR 0133](0133-monitoring-followup-cloudwatch-client-errors-alerts.md): CloudWatch와 알림 추가
- [docs/monitoring.md](../monitoring.md): 운영 절차. 이번에 수집 대상과 보안그룹, 알림 식을 같이 고쳤다
