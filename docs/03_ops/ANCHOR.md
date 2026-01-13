# ANCHOR - 세션 시작점

> **모든 세션/작업 시작 시 이 파일을 먼저 읽으세요.**

## Template Version

**v1.1.x** (CLI v1.1.0) | 정확한 버전 확인: `./scripts/flow status`

> 버전 표기: 태그 우선 (예: v1.1.0), 태그 없으면 커밋 해시 (예: abc1234)

## SSOT (Single Source of Truth)

| 문서 | 역할 | 링크 |
|------|------|------|
| PRD.md | 요구사항 | [PRD.md](../../PRD.md) |
| AGENTS.md | 에이전트/운영 규칙 | [AGENTS.md](AGENTS.md) |
| SPEC_SNAPSHOT.md | SSOT 스냅샷 | [SPEC_SNAPSHOT.md](SPEC_SNAPSHOT.md) |
| DRIFT_REPORT.md | 드리프트 추적 | [DRIFT_REPORT.md](DRIFT_REPORT.md) |
| DECISIONS.md | 의사결정 기록 | [DECISIONS.md](../DECISIONS.md) |
| RESUME_PACK.md | 세션 재개 | [RESUME_PACK.md](../RESUME_PACK.md) |

## 핵심 규칙 (3줄)

1. **업데이트는 `docs/03_ops/`만** — 레거시 docs는 읽기 전용
2. **커밋 전 runner 필수** — typecheck → test → commit
3. **완료 = codex-verifier PASS** + 문서 반영 + Resume Pack 갱신

## 레거시 docs 상태

- Legacy docs exists: **YES** (3 files)
- 레거시 업데이트 필요 시 → [DOC_DEBT.md](DOC_DEBT.md)에 기록

## Roadmap / Status

### ✅ Done (현재 릴리즈)

| Feature ID | 설명 | 커밋 |
|------------|------|------|
| F-ENT-001 | --docs-scan 기능 | ee6a626 |
| F-ENT-002 | docs-scan UX 보완 (파일 수 기준) | 3906467 |
| F-ENT-003 | SPEC_SNAPSHOT 템플릿 | 1761cbb |
| F-ENT-004 | DRIFT_REPORT 템플릿 | 0eb8093 |
| F-ENT-005 | SPEC_SNAPSHOT/DRIFT_REPORT 보강 | 7910ca8 |

### ⏸ Deferred (별도 세션)

| ID | 항목 | 설명 | 우선순위 |
|----|------|------|----------|
| DEBT-ENT-001 | CI Gate | codex-verifier PASS 시 CI 연동 | MEDIUM |
| DEBT-ENT-002 | --docs-migrate | 레거시 docs 자동 마이그레이션 | LOW |
| DEBT-ENT-003 | Enterprise Advanced | 멀티팀 워크플로우, RBAC | LOW |

---

*Last updated: 2026-01-13*
