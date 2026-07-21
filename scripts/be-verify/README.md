# scripts/be-verify

로컬 BE(`localhost:8080`) 엔드포인트를 붙이기 전에 진짜 계약을 확인할 때 쓰는 도구 둘.
`/wire-api`가 부르는 [`be-verify` 서브에이전트](../../.claude/agents/be-verify.md)가 주로 쓰지만 손으로 써도 된다.

시크릿은 이 저장소에 없다. 두 스크립트 모두 BE 저장소 `.env`를 런타임에 읽는다.
BE 위치 기본값은 `~/Documents/plick-backend`이고, 다르면 `PLICK_BE_DIR`로 알려준다.

## mint-jwt.mjs

access 토큰을 민팅한다.

```bash
node scripts/be-verify/mint-jwt.mjs 15        # userId 15, 1시간짜리
node scripts/be-verify/mint-jwt.mjs 15 60     # 60초 후 만료 (만료 동작 확인용)

TOKEN=$(node scripts/be-verify/mint-jwt.mjs 15)
curl -s http://localhost:8080/api/v1/users/me -H "Authorization: Bearer $TOKEN"
```

BE `JwtTokenProvider`와 같은 방식이다. `.env`의 `JWT_SECRET`(base64)을 디코드한 키로 HS256 서명하고
클레임은 `sub`(userId 문자열), `iat`, `exp`만 싣는다. 실제 OAuth를 돌지 않고 보호 API를 밟기 위한 것이라
검증 용도 밖으로 쓰지 않는다.

## db.sh

공유 DB에 psql로 붙는다. 인자는 psql에 그대로 넘어간다.

```bash
./scripts/be-verify/db.sh -c "select user_id, nickname from users order by user_id desc limit 5"
./scripts/be-verify/db.sh -tA -c "select count(*) from favorite_teams where user_id=16"
./scripts/be-verify/db.sh -c "\d users"
```

로컬 psql이 있으면 그걸 쓰고, 없으면 `docker run --rm postgres:16-alpine`으로 붙는다(도커가 떠 있어야 한다).

포트는 `.env`의 `DB_URL`에 5432로 적혀 있지만 그건 Supabase pooler의 세션 모드라 `pool_size` 15가 차면
`EMAXCONNSESSION`으로 막힌다. BE와 팀원이 물고 있으면 금방 찬다. 단발 쿼리엔 필요 없는 모드라
pooler 호스트일 때 트랜잭션 모드 6543으로 붙는다. 바꿔야 하면 `PLICK_DB_PORT`로 override한다.

## ⚠️ 공유 DB다

읽기는 자유롭게, 쓰기는 자기가 만든 일회용 테스트 행에만 한다.

테스트 유저는 `provider_id`에 티켓 접두어를 박고(`KAN999-test`) 끝나면 자식 행부터 지운다.

기존 유저로 쓰기 검증을 하지 않는다. 닉네임을 바꾸면 그 계정이 7일 잠긴다.

`teams`는 어드민 소유 마스터 데이터다. 읽기만 하고, 재시드로 id가 바뀔 수 있으니 그때그때 조회해 쓴다.
