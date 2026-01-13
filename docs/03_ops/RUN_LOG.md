# ULW RUN_LOG

> ULW 모드 실행 기록. 각 실행마다 append합니다.

---

## 템플릿

아래 형식으로 각 ULW 실행을 기록합니다:

```markdown
## ULW-XXX: (정제된 요청 1줄)

| 항목 | 값 |
|------|-----|
| 원문 | (ulw 포함 원문) |
| 정제문 | (ulw 제거 후) |
| Profile | core/pro |
| Tier | low/default/high |
| Codex | on/off |
| 시작 | YYYY-MM-DD HH:MM |
| 종료 | YYYY-MM-DD HH:MM |
| Result | PASS/FAIL/UNCERTAIN |

### Steps (0-9)

| # | Agent/Script | Status | Evidence |
|---|--------------|--------|----------|
| 0 | docs-scan | RUN/SKIP | (Preflight, 조건부) |
| 1 | explore | RUN/SKIP/FAIL | (파일/로그/커밋) |
| 2 | librarian | RUN/SKIP/FAIL | (파일/로그/커밋) |
| 3 | spec-acceptance | RUN/SKIP/FAIL | (파일/로그/커밋) |
| 4 | implementer | RUN/SKIP/FAIL | (파일/로그/커밋) |
| 5 | runner | RUN/SKIP/FAIL | (파일/로그/커밋) |
| 6 | security-license | RUN/SKIP/FAIL | (파일/로그/커밋) |
| 7 | verifier | RUN/SKIP/FAIL | (파일/로그/커밋) |
| 8 | codex-verifier | RUN/RUN(UNCERTAIN)/FAIL | (파일/로그/커밋) |
| 9 | doc-manager | RUN/SKIP/FAIL | (파일/로그/커밋) |

### Status 설명

| Status | 아이콘 | 의미 |
|--------|:------:|------|
| RUN | ✅ | 정상 실행 완료 |
| RUN(UNCERTAIN) | ⚠️ | 실행했으나 UNCERTAIN (SKIP_CODEX=1) |
| SKIP | ⏭️ | 사유 있는 생략 |
| FAIL | ❌ | 실패 (재시도 필요) |

### Notes

(SKIP 사유, FAIL 원인, Next Actions 등)
```

---

## 실행 기록

<!-- 아래에 ULW 실행 기록을 append -->
