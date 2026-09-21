# 0166. 릴리스 PR(#255)이 충돌한 이유와 revert를 다시 revert해 푼 기록

## 무슨 일이 있었나

2026-09-21에 develop을 main으로 올리는 릴리스 PR #255를 만들었는데 GitHub가 merge conflict를
띄웠다. 평소 릴리스 PR은 develop이 main을 항상 앞서 있어서 충돌이 날 일이 없었다. 이번엔
달랐다.

`gh pr view 255`로 보니 `mergeable: CONFLICTING`이었고, main에만 있고 develop에는 없는 커밋이
둘 있었다. PR #251의 병합 커밋 `2f48ed3`와 그 안의 `b78f0d0`, 즉 [ADR 0163](0163-prod-rollback-revert-pr-246.md)에서
prod를 롤백하려고 PR #246 병합을 `git revert -m 1`로 되돌린 커밋이다.

## 왜 충돌이 났나

git의 merge는 세 점을 본다. 두 브랜치의 공통 조상(merge base)과 양쪽 끝이다. 공통 조상에서
각 브랜치가 어떻게 바뀌었는지를 각각 계산하고, 같은 자리를 서로 다르게 고쳤을 때만 충돌로
친다.

이번 상황을 그 틀에 놓으면 이렇다.

- 공통 조상은 PR #246 시점의 develop 끝이다. 그때 develop에 있던 229개 파일 변경은 main의
  병합 커밋 `58805bd`를 통해 이미 main 이력 안에 들어가 있다.
- main 쪽 변경은 그 뒤에 얹은 revert 하나다. 229개 파일을 PR #231 시점으로 되돌린 것이라,
  main 입장에서는 "그 파일들을 옛날 내용으로 고쳤다" 또는 "새로 생긴 파일을 지웠다"가 된다.
- develop 쪽 변경은 PR #246 이후 들어온 커밋 15개다. 라이브 팀 약칭, 댓글 수, 도움 문구 삭제
  같은 작업이 같은 파일들을 또 고쳤다.

그래서 `apps/web/proxy.ts`나 `packages/domain/src/types.ts`처럼 양쪽이 같은 자리를 다르게 만진
파일은 content 충돌이 나고, `packages/core/src/guest.ts`처럼 main은 지웠는데 develop은 고친
파일은 modify/delete 충돌이 났다. 스크래치 worktree에서 `git merge --no-commit`으로 흉내 내 보니
충돌 파일이 30개였다.

더 무서운 건 충돌이 안 난 파일이다. develop이 PR #246 이후 손대지 않은 파일은 main 쪽 변경,
즉 revert가 그대로 이긴다. 충돌을 손으로 풀어서 억지로 머지했다면 PR #246의 변경 중 상당수가
조용히 prod에서 빠진 채 나갔을 것이다. ADR 0163이 "이걸 잊으면 develop에는 있는데 prod에는
안 나가는 변경이 생긴다"고 적어 둔 그 상황이다.

## ADR 0163의 처방을 그대로는 못 쓴 이유

0163은 다음 릴리스 전에 develop에서 revert 커밋을 한 번 더 revert하라고 적어 뒀다.

```bash
git checkout -b feature/KAN-xxx-reapply-pr-246 origin/develop
git revert <revert 커밋 sha>
```

그런데 이 명령은 그대로 돌아가지 않는다. `git revert`는 대상 커밋이 현재 브랜치 이력 안에
있어야 한다. `b78f0d0`은 main에만 있고 develop에는 없다. develop에서 먼저 main을 머지해 오면
그 커밋이 이력에 들어오긴 하지만, 그 머지가 바로 위에서 본 30개 충돌을 그대로 만난다.

그래서 순서를 뒤집었다. main에서 출발해 revert를 먼저 되돌리고, 그 다음 develop을 머지했다.

```bash
git worktree add -b hotfix/reapply-pr-246 <경로> origin/main
git revert --no-edit b78f0d0
git merge origin/develop
```

revert의 revert가 끝난 시점에 `git diff 58805bd HEAD`가 비어 있는 걸 확인했다. 파일 단위로
PR #246 병합 직후와 같다는 뜻이다. 이 상태에서 develop을 머지하면 공통 조상은 여전히 PR #246
시점의 develop인데, 우리 쪽 변경은 "revert했다가 되돌림"이라 합치면 0이고 develop 쪽 변경만
남는다. 충돌이 날 자리가 없다. 실제로 충돌 0개로 머지됐고 `git diff origin/develop HEAD`도
비었다.

## 롤백 ADR 파일이 사라진 것

revert를 되돌리니 `b78f0d0`이 추가했던 `docs/adr/0163-prod-rollback-revert-pr-246.md`도 같이
지워졌다. 롤백 기록은 남아야 하니 `git checkout origin/main -- <파일>`로 다시 꺼내 왔다.

번호가 겹치는 문제가 있다. main의 롤백 ADR과 develop의 라이브 팀 약칭 ADR이 둘 다 0163이다.
롤백은 hotfix 브랜치에서 main으로 바로 갔고 그 사이 develop은 자기 번호를 이어 썼기 때문이다.
파일명이 달라 충돌은 없어서 둘 다 그대로 뒀다. 이름을 바꾸면 이미 커밋 메시지와 다른 ADR에서
링크한 경로가 깨진다.

## 본 클론을 안 건드린 이유

작업 트리에 미커밋 변경(그라파나 대시보드 JSON, 포트폴리오 ADR 초안들)이 있어서 브랜치를
바꾸면 딸려 갈 수 있었다. 0163 때와 같이 `git worktree`로 스크래치 폴더에 브랜치를 따로
꺼내서 작업했다. worktree는 같은 저장소의 다른 브랜치를 다른 폴더에 체크아웃하는 기능이라
본 클론의 작업 트리와 서로 간섭하지 않는다.

## 검증

코드 트리가 origin/develop과 파일 단위로 같아서 새로 검증할 코드는 없다. develop은 PR #254
머지 때 CI를 통과했다. 그래도 worktree에 `pnpm install`을 하고 `format:check`, `lint`,
`check-types`, `build`를 돌렸다. ADR 두 파일이 추가된 게 전부라 결과는 develop과 같아야 한다.

## 다음에 할 것

이 브랜치를 develop으로 PR한다. 머지되면 develop 이력에 main의 revert와 그 revert의 revert가
모두 들어가고, PR #255는 develop이 main을 다시 온전히 앞서는 모양이 돼 충돌이 사라진다.
PR #255는 닫지 말고 그대로 두면 develop이 갱신될 때 GitHub가 다시 mergeable로 바꾼다.

## 배운 것

병합 커밋을 revert하는 건 되돌리기 쉬운 작업이 아니다. 이력에는 "반영됨"으로 남고 내용만
빠지기 때문에, 다음 머지 때 git이 그 변경을 다시 가져다주지 않는다. 롤백을 revert로 했다면
다음 릴리스 절차의 첫 줄은 무조건 revert의 revert여야 하고, 그 작업은 develop이 아니라 revert
커밋이 있는 쪽(main)에서 시작해야 한다. 0163의 명령 예시는 이 점에서 틀렸고, 이 문서가 그
수정본이다.
