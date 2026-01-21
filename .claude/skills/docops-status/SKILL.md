# /docops-status - 상태 확인

> DocOps 현재 상태를 빠르게 확인합니다.

## Trigger
```
/docops-status [--detail]
```

## 동작 흐름

### 1. DocOps 적용 여부

```
docs/00_ssot/ANCHOR.md 존재?
  → NO: "DocOps 미적용. /docops-init 실행 필요"
  → YES: 계속
```

### 2. 상태 수집

```bash
# CLI 상태
./scripts/specctl status

# 문서에서 파싱
- COVERAGE_MATRIX.md → 요약 통계
- DRIFT_REPORT.md → Active 드리프트 수
- DOC_DEBT.md → 미해결 부채 수
```

### 3. 요약 출력

```
DocOps Status
─────────────
적용 상태: ✓ 활성
마지막 검증: 2026-01-20
검증 레벨: soft

Coverage:
  SYNC: 6
  MISSING_DOC: 0
  HALLUCINATION: 0
  BROKEN_EVIDENCE: 0
  SNAPSHOT_GAP: 2

Active 드리프트: 0
문서 부채: 2
```

## SubAgent 지침

```yaml
role: DocOps Status Reporter
tools:
  - Bash (specctl status)
  - Read (SSOT 문서들)
  - Grep (통계 파싱)

workflow:
  1. DocOps 적용 확인
  2. specctl status 실행
  3. COVERAGE_MATRIX 요약 파싱
  4. DRIFT_REPORT Active 카운트
  5. DOC_DEBT 총 부채 카운트
  6. 종합 리포트 출력

output_format:
  - 간결한 요약 (기본)
  - --detail 시 각 문서 상세 내용 포함
```

## 출력 예시

### 기본 출력
```
[DocOps Status]
─────────────────────────────────
적용: ✓   검증: soft   드리프트: 0
─────────────────────────────────
Contract: 6 (SYNC: 6, GAP: 0)
부채: 2 (UNCLASSIFIED)
─────────────────────────────────
다음 단계: /docops-verify
```

### 상세 출력 (--detail)
```
[DocOps Status] 상세 모드
═══════════════════════════════════════════════

## 적용 상태
  DocOps: ✓ 활성
  버전: (npx create-docops --version 참조)
  마지막 검증: 2026-01-20
  검증 레벨: soft

## Coverage Matrix
  ┌──────────────────┬───────┐
  │ 상태             │ 개수  │
  ├──────────────────┼───────┤
  │ SYNC             │ 6     │
  │ MISSING_DOC      │ 0     │
  │ HALLUCINATION    │ 0     │
  │ BROKEN_EVIDENCE  │ 0     │
  │ SNAPSHOT_GAP     │ 2     │
  └──────────────────┴───────┘

## Active 드리프트
  없음

## 문서 부채
  UNCLASSIFIED: 2
  - UNCLASS-001: / (HomePage) → DASHBOARD
  - UNCLASS-002: /dashboard → DASHBOARD

## SSOT 파일
  ✓ ANCHOR.md
  ✓ DOC_POLICY.md
  ✓ COVERAGE_MATRIX.md
  ✓ SPEC_SNAPSHOT.md
  ✓ DRIFT_REPORT.md
  ✓ DOC_DEBT.md

## Spec 문서
  총 1개: AUTH.md

═══════════════════════════════════════════════
```

## 옵션

| 옵션 | 설명 |
|------|------|
| `--detail` | 상세 정보 출력 |

## 빠른 참조

| Skill | 용도 |
|-------|------|
| `/docops-status` | 현재 상태 확인 |
| `/docops-verify` | 드리프트 검증 |
| `/docops-finish` | 작업 완료 |
| `/docops-init` | 초기화/마이그레이션 |

## 참조

- [specctl status](../../../scripts/specctl) - CLI 상태 명령
- [COVERAGE_MATRIX.md](../../../docs/00_ssot/COVERAGE_MATRIX.md) - 현황판
