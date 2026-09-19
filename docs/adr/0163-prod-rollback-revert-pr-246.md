# 0163. prod 롤백: develop 병합(PR #246)을 revert해 main을 직전 릴리스로 되돌리다

## 무슨 일이 있었나

2026-09-19 11:25(UTC)에 develop이 main으로 병합됐다(PR #246, `58805bd`). main 푸시는 곧 prod
배포라 deploy.yml이 돌았고 성공했다. 문제는 이 병합이 아직 prod에 나가면 안 되는 상태였다는
것이다. 직전 릴리스는 9월 15일에 나간 PR #231(`0803bf5`)이었고, 그 사이 develop에는 229개
파일이 바뀌어 있었다.

## 어떻게 되돌릴지 고민한 것

선택지는 셋이었다.

1. CodeDeploy 콘솔에서 직전 리비전(`s3://plick-deploy/frontend/prod/0803bf5…/bundle.zip`)으로
   배포를 새로 만든다. 빌드가 없어서 5분이면 끝난다. 그런데 main은 그대로 잘못된 상태라
   다음 main 푸시 때 같은 코드가 또 나간다. 임시 처방이다.
2. main을 `0803bf5`로 force-push한다. 가장 단순하지만 main 직접 커밋 금지 규칙과 브랜치
   보호에 걸리고, 다른 사람의 로컬 main과 갈라진다.
3. 병합 커밋을 `git revert -m 1`로 되돌린 브랜치를 만들어 main으로 PR을 올린다. 머지되면
   main 푸시로 deploy.yml이 돌아 이전 코드가 다시 빌드돼 나간다. 14분쯤 걸리지만 main
   이력이 깨끗하게 남고 규칙도 지킨다.

3번으로 갔다. 1번은 필요하면 3번과 겹쳐 먼저 쏠 수 있는 보조 수단으로만 남겼다.

## 실제로 한 것

작업 트리에 미커밋 변경이 있어서 본 클론을 건드리지 않고 `git worktree`로 `origin/main`에서
`hotfix/revert-pr-246` 브랜치를 따로 꺼냈다.

```bash
git worktree add -b hotfix/revert-pr-246 <경로> origin/main
git revert -m 1 --no-edit 58805bd
```

`-m 1`은 병합 커밋의 첫 번째 부모(main 쪽, `0803bf5`)를 기준으로 되돌리라는 뜻이다. 병합
커밋은 부모가 둘이라 어느 쪽을 "원래 상태"로 볼지 알려 줘야 revert가 된다.

되돌린 뒤 `git diff 0803bf5 HEAD`가 비어 있는 걸 확인했다. 파일 단위로 직전 릴리스와 완전히
같다는 뜻이다. 그래서 별도 빌드 검증은 하지 않았다. `0803bf5`는 이미 CI를 통과하고 prod에서
나흘간 돌던 산출물이다.

## 정적 자산은 왜 걱정 안 했나

deploy.yml은 `.next/static`을 `plick-static-prod`에 `--delete` 없이 올리고 수명 주기가 90일이다
([deploy-v3-cdn.md](../deploy-v3-cdn.md) §11). 그러니 롤백된 HTML이 참조하는 옛 해시 청크가
CloudFront 뒤 S3에 그대로 있다. 새로 빌드하면 같은 소스에서 같은 해시가 나오기도 한다.

## 다음 릴리스 때 반드시 할 것

병합 커밋을 revert하면 git은 develop의 그 커밋들을 이미 main에 "반영된 것"으로 본다. 이 상태에서
나중에 develop을 main에 다시 머지하면 PR #246에 들어 있던 변경이 다시 들어오지 않는다.
다시 내보낼 준비가 되면 develop 쪽에서 이 revert 커밋을 한 번 더 revert해야 한다.

```bash
git checkout -b feature/KAN-xxx-reapply-pr-246 origin/develop
git revert <이 브랜치의 revert 커밋 sha>
```

이걸 잊으면 "develop에는 있는데 prod에는 안 나가는" 변경이 조용히 생긴다. 이 ADR을 남기는
가장 큰 이유가 이 한 줄이다.
