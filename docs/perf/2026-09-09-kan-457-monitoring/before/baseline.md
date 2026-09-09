# KAN-457 before 수치 (prod 프로메테우스, 2026-09-09 10:28 조회, 수집 시작 09-07 18:28 = 약 40시간)

- 스크레이프 타깃: 2 인스턴스 x 2 앱, 전부 up
- BE 호출 총량(3d): mobile 200=3288 / 404=606 / 401=1 / 502=0, web 200=11161 / 404=1127 / 401=34
- BE 5xx 에러율(5m 창): mobile avg 0 / max 0. web은 5xx 시리즈 자체가 없어 나눗셈 결과 없음(NaN) → 알림 규칙에 `or vector(0)` 필요
- 요청 속도(5m rate): mobile avg 0.027 req/s (5m 창 482개 중 141개가 0), web avg 0.085 req/s (483개 중 27개가 0)
  → 저트래픽이라 5m 창 비율 임계는 요청 1건 실패에도 튄다. 창을 30m로 넓히거나 최소 요청 수 조건을 함께 건다
- BE 왕복 p95(3d): mobile 0.049s, web 0.049s
- Next onRequestError(3d): web render 0
- 관측 사각지대(전부 0이 아니라 "없음"): ALB 요청 수·5xx·지연, 클라 경계 에러, 알림 규칙·contact point
- IAM 롤 plick-front-monitoring-role-prod: 인라인 prometheus-ec2-sd + AmazonSSMManagedInstanceCore 뿐
- 그라파나 데이터 소스: Prometheus 1개. 대시보드 패널 9개(전부 prometheus)
