# plick-harness

PLick 팀 Claude Code 하네스를 저장소 밖으로 들고 나가는 플러그인이다.
plick-frontend 안에서는 `.claude/`가 이 폴더를 심링크와 훅 경로로 직접 쓰므로 설치할 필요가 없다.
AppShell, 백엔드 같은 다른 저장소에서 같은 문체와 Git 가드를 쓰고 싶을 때 설치한다.

## 들어 있는 것

- 스킬 `doc-style`: 지침 문서와 PR 본문, 코드 주석 문체
- 스킬 `pr-writing`: PR 본문 5절 틀
- 스킬 `adr-writing`: 세션 ADR 회고체
- 훅 `PreToolUse` `hooks/guard.mjs`: `gh pr create|merge`, main·develop 직접 push와 commit,
  `git commit --no-verify`, `pnpm-lock.yaml`·`node_modules`·`.next` 편집을 exit 2로 차단

## 설치

```bash
claude plugin marketplace add big-cute-team/plick-frontend
claude plugin install plick-harness@plick
```

로컬 체크아웃을 마켓으로 써도 된다. `claude plugin marketplace add /path/to/plick-frontend/plick`.
설치 뒤 새 세션을 시작한다. 검증은 `claude plugin validate plugins/plick-harness`.

## 가드 훅 시험

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"gh pr create"}}' | node hooks/guard.mjs; echo $?   # 2
```

회귀 테스트는 저장소 루트에서 `pnpm test:hooks`.
