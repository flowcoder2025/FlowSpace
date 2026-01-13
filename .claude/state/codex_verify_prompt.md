# Codex Verify Request

## Meta
- request_id: verify-YYYYMMDD-XXX
- timestamp: YYYY-MM-DDTHH:MM:SSZ
- implementer_commit: (commit hash or "uncommitted")

## Feature IDs
- Type: (F-XXX | BUG-XXX | REFACTOR | CHORE)
- IDs: (예: F-012, BUG-045)
- PRD Reference: (F-XXX인 경우 PRD.md 섹션 링크)

## AC 목록 (F-XXX 필수 / BUG·REFACTOR·CHORE 예외)
- [ ] AC-1: (수용기준 1)
- [ ] AC-2: (수용기준 2)

## Git Diff
```diff
(여기에 git diff 텍스트를 붙여넣기)
```

## 테스트 로그
```
(여기에 runner 실행 결과 붙여넣기)
(command + output)
```

## Runner 요약
- 실행 커맨드: (예: npm test)
- 결과: (PASS/FAIL + 통과/실패 개수)
- 핵심 로그: (에러 메시지 또는 성공 요약)
- 커버리지(있으면): (예: 85%)
