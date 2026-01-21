# /docops-verify - 드리프트 검증

> 코드와 문서 간의 드리프트(불일치)를 검증합니다. **세션 시작 시 반드시 실행**하세요.

## Trigger
```
/docops-verify [--level=soft|strict] [--fix]
```

## 동작 흐름

### 1. DocOps 적용 여부 확인

```
docs/00_ssot/ANCHOR.md 존재?
  → NO: "DocOps가 적용되지 않았습니다. /docops-init 을 먼저 실행하세요."
  → YES: 계속
```

### 2. 검증 실행

```bash
# specctl verify 실행
./scripts/specctl verify --level=soft  # 기본값
./scripts/specctl verify --level=strict  # --level=strict 옵션 시
```

### 3. 결과 분석 및 보고

```
COVERAGE_MATRIX.md 파싱:
  - SYNC: N개
  - MISSING_DOC: N개
  - HALLUCINATION: N개
  - BROKEN_EVIDENCE: N개
  - SNAPSHOT_GAP: N개
```

### 4. 드리프트 발견 시 대응

```yaml
드리프트 있음 (MISSING_DOC, HALLUCINATION, BROKEN_EVIDENCE > 0):
  → DRIFT_REPORT.md 내용 출력
  → 해결 방법 제안
  → --fix 옵션 시 자동 해결 시도

드리프트 없음:
  → "검증 통과. 작업을 시작하세요."
```

## SubAgent 지침

```yaml
role: DocOps Verifier
tools:
  - Bash (specctl verify 실행)
  - Read (COVERAGE_MATRIX, DRIFT_REPORT 읽기)
  - Grep (상태 파싱)

workflow:
  1. DocOps 적용 확인
  2. specctl verify 실행
  3. 결과 파싱
  4. 드리프트 있으면 보고 + 해결 제안
  5. 없으면 "준비 완료" 출력

on_drift_found:
  - DRIFT_REPORT.md Active 섹션 읽기
  - 각 항목별 해결 방법 안내:
    - MISSING_DOC: "Contract 추가 필요"
    - HALLUCINATION: "코드 추가 또는 Contract 삭제"
    - BROKEN_EVIDENCE: "Evidence 링크 수정"
  - --fix 옵션 시 자동 해결 시도
```

## 출력 예시

### 검증 통과
```
[DocOps Verify] 검증 레벨: soft

검증 결과:
  ✓ SYNC: 6
  ✓ MISSING_DOC: 0
  ✓ HALLUCINATION: 0
  ✓ BROKEN_EVIDENCE: 0
  ⚠ SNAPSHOT_GAP: 2 (자동화 범위 밖)

[DocOps Verify] 드리프트 없음. 작업을 시작하세요.
```

### 드리프트 발견
```
[DocOps Verify] 검증 레벨: soft

검증 결과:
  ✓ SYNC: 4
  ✗ MISSING_DOC: 2
  ✗ HALLUCINATION: 1
  ✓ BROKEN_EVIDENCE: 0
  ⚠ SNAPSHOT_GAP: 2

[DocOps Verify] 드리프트 발견! 먼저 해결이 필요합니다.

Active 드리프트:
┌─────────────────────────────────────────────────────────────┐
│ ID        │ Type        │ Item           │ 해결 방법       │
├─────────────────────────────────────────────────────────────┤
│ DRIFT-001 │ MISSING_DOC │ /api/users     │ Contract 추가   │
│ DRIFT-002 │ MISSING_DOC │ /api/orders    │ Contract 추가   │
│ DRIFT-003 │ HALLUCINATION│ AUTH_FUNC_SSO │ 코드 추가/삭제  │
└─────────────────────────────────────────────────────────────┘

해결하시겠습니까? (/docops-verify --fix)
```

## 옵션

| 옵션 | 설명 |
|------|------|
| `--level=soft` | 경고만 (기본값, 개발 중) |
| `--level=strict` | 드리프트 시 차단 (완료 시) |
| `--fix` | 자동 해결 시도 |

## 세션 시작 프로토콜

```
1. /docops-verify 실행
2. 드리프트 있으면 먼저 해결
3. 드리프트 없으면 작업 시작
4. 작업 완료 후 /docops-finish
```

## 참조

- [COVERAGE_MATRIX.md](../../../docs/00_ssot/COVERAGE_MATRIX.md) - 현황판
- [DRIFT_REPORT.md](../../../docs/00_ssot/DRIFT_REPORT.md) - 드리프트 기록
