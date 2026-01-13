# DRIFT_REPORT - PRD ↔ 코드 드리프트 추적

> SSOT(PRD)와 실제 구현 간 불일치(드리프트) 추적

## 드리프트란?

- PRD에 정의된 기능이 코드에 없음 (Missing)
- 코드에 구현됐으나 PRD에 없음 (Undocumented)
- PRD와 코드가 다르게 동작함 (Mismatch)

---

## 현재 드리프트 항목

| ID | 타입 | PRD 항목 | 실제 상태 | Evidence | Decision | Owner | 우선순위 | DOC_DEBT |
|----|------|----------|----------|----------|----------|-------|----------|----------|
| DRIFT-001 | Missing | FR-Template-01 (3종 템플릿) | 에셋 대기 | PRD 7.1-B, 8.3 | Defer | - | LOW | - |
| DRIFT-002 | Missing | FR-Template-02 (맵+타일셋+오브젝트) | 에셋 대기 | PRD 7.1-B, 8.3 | Defer | - | LOW | - |
| DRIFT-004 | Missing | Phase 7 인프라 최적화 | 계획 상태 | PRD 12 Phase 7 | Defer | - | MEDIUM | - |
| DRIFT-005 | Missing | Phase 8 에셋 완성 | 대기 상태 | PRD 12 Phase 8 | Defer | - | MEDIUM | - |

### 컬럼 설명

| 컬럼 | 설명 |
|------|------|
| **Evidence** | 드리프트 근거 (파일:라인, 커밋 해시, 테스트 결과 등) |
| **Decision** | 해결 방향 (코드 수정 / PRD 수정 / 보류) |
| **Owner** | 담당자 (`git log -1 --format='%an'` 또는 지정) |

> 마지막 갱신: 2026-01-13

---

## 드리프트 수집 규칙

### 1) 탐지 시점
- **verifier** 실행 시: AC ↔ 코드 비교
- **codex-verifier** 실행 시: 전체 검증
- **릴리즈 전**: 수동 리뷰

### 2) 기록 형식
```markdown
| DRIFT-XXX | 타입 | PRD 항목 | 실제 상태 | Evidence | Decision | Owner | Priority | DOC_DEBT |
```
- **타입**: Missing / Undocumented / Mismatch
- **Evidence**: 파일:라인, 커밋 해시, diff 등
- **Decision**: 코드 수정 / PRD 수정 / 보류
- **Owner**: git author 또는 지정
- **Priority**: HIGH / MEDIUM / LOW

### 3) Decision 값 (enum)

| Decision | 의미 | 후속 조치 |
|----------|------|----------|
| **FixCode** | 코드를 PRD에 맞게 수정 | implementer 작업 |
| **FixPRD** | PRD를 코드에 맞게 수정 | doc-manager 작업 |
| **Defer** | 보류 (별도 세션/마일스톤) | Roadmap에 기록 |

### 4) 해결 흐름
```
드리프트 발견
    ↓
DRIFT_REPORT에 기록
    ↓
DOC_DEBT에 연계 항목 생성 (문서 수정 필요 시)
    ↓
해결 (코드 수정 or PRD 수정)
    ↓
DRIFT_REPORT에서 제거 + SPEC_SNAPSHOT 갱신
```

### 5) DOC_DEBT 연계
- 드리프트 해결에 문서 수정이 필요하면 DOC_DEBT에 기록
- 형식: `DEBT-DRIFT-XXX`
- 예: `| DEBT-DRIFT-001 | DRIFT-001 | PRD F-XXX 항목 업데이트 필요 | MEDIUM | @owner |`

---

## 타입별 해결 방향

| 타입 | 설명 | 해결 방향 |
|------|------|----------|
| **Missing** | PRD에 있으나 코드 없음 | 구현 또는 PRD에서 제거 |
| **Undocumented** | 코드에 있으나 PRD 없음 | PRD에 추가 또는 코드 제거 |
| **Mismatch** | 동작이 다름 | 코드 수정 또는 PRD 수정 |

---

## 해결된 드리프트 (Archive)

| ID | 타입 | 설명 | Evidence | Decision | Owner | 해결일 |
|----|------|------|----------|----------|-------|--------|
| DRIFT-003 | Mismatch | @dnd-kit/core PRD에서 제거 | PRD 11.2 수정 | FixPRD | - | 2026-01-13 |

---

## 관련 문서

- [DOC_DEBT.md](DOC_DEBT.md) - 문서 부채 추적
- [SPEC_SNAPSHOT.md](SPEC_SNAPSHOT.md) - SSOT 스냅샷
- [PRD.md](../prd.md) - 요구사항 SSOT

---

> **갱신 규칙**: verifier/codex-verifier 실행 후 드리프트 발견 시 즉시 기록
