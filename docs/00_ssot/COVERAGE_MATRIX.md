# COVERAGE_MATRIX - 문서 커버리지 현황

> 코드(Snapshot) ↔ 문서(Contract) 매핑 상태를 한 눈에 확인

---

## 상태 범례

| 상태 | 의미 | 조치 |
|------|------|------|
| SYNC | 코드O 문서O 증거O | 없음 |
| MISSING_DOC | 코드O 문서X | Contract 추가 필요 |
| HALLUCINATION | 코드X 문서O | Contract 삭제 또는 코드 추가 |
| BROKEN_EVIDENCE | 증거 링크 깨짐 | Evidence 수정 |
| SNAPSHOT_GAP | 자동화 범위 밖 | 점진적 확장 |

---

## 요약

| 항목 | 값 |
|------|-----|
| **마지막 검증** | 2026-01-21 |
| **검증 레벨** | soft |
| **총 항목** | 0 |
| **SYNC** | 0 |
| **MISSING_DOC** | 0 |
| **HALLUCINATION** | 0 |
| **BROKEN_EVIDENCE** | 0 |
| **SNAPSHOT_GAP** | 0 |

---

## 전체 매트릭스

| SPEC_KEY | Contract ID | Code (Snapshot) | Doc (Contract) | Evidence | Status |
|----------|-------------|:---------------:|:--------------:|:--------:|--------|

---

## 히스토리

| 날짜 | SYNC | MISSING | HALLU | BROKEN | GAP | 변화 |
|------|:----:|:-------:|:-----:|:------:|:---:|------|
| 2026-01-21 | 0 | 0 | 0 | 0 | 0 | specctl verify |

---

> **자동 생성**: `specctl verify` 실행 시 갱신됨
