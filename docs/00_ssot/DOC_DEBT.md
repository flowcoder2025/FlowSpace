# DOC_DEBT - 문서 부채 큐

> Evidence 부재, 분류 미확정 등 해결이 필요한 문서 항목 관리

---

## 요약

| 항목 | 값 |
|------|-----|
| **마지막 갱신** | 2026-01-20 |
| **NEEDS_CONFIRMATION** | 0 |
| **MISSING_EVIDENCE** | 0 |
| **UNCLASSIFIED** | 0 |
| **총 부채** | 0 |

---

## NEEDS_CONFIRMATION (확인 필요)

> 자동 분류가 애매하여 사람의 확인이 필요한 항목

| ID | Source | Item | 제안 분류 | 이유 | Created | Owner |
|----|--------|------|----------|------|---------|-------|
| - | - | (확인 필요 항목 없음) | - | - | - | - |

---

## MISSING_EVIDENCE (Evidence 누락)

> Contract는 있으나 Evidence가 없거나 불완전한 항목

| ID | SPEC_KEY | Contract ID | 누락 유형 | Created | Owner |
|----|----------|-------------|----------|---------|-------|
| - | - | (Evidence 누락 없음) | - | - | - |

---

## UNCLASSIFIED (미분류)

> SPEC_KEY가 할당되지 않은 코드/문서 항목

| ID | Type | Item | 제안 SPEC_KEY | Created |
|----|------|------|--------------|---------|
| - | - | (미분류 항목 없음) | - | - |

---

## 부채 해결 가이드

### NEEDS_CONFIRMATION 해결
```md
1. 제안된 분류 검토
2. 올바른 SPEC_KEY 확정
3. 해당 문서로 이동
4. 이 테이블에서 항목 삭제
```

### MISSING_EVIDENCE 해결
```md
1. 해당 Contract 확인
2. 올바른 Evidence 추가 (심볼 기반)
3. specctl verify --level=soft 로 확인
4. 이 테이블에서 항목 삭제
```

### UNCLASSIFIED 해결
```md
1. 코드/문서 내용 검토
2. SPEC_KEY 할당 (기존 또는 신규)
3. 신규 SPEC_KEY면 해당 .md 파일 생성
4. 이 테이블에서 항목 삭제
```

---

## 부채 생성 규칙

| 상황 | 부채 유형 | 자동 생성 |
|------|----------|:--------:|
| 자동 분류 신뢰도 낮음 | NEEDS_CONFIRMATION | O |
| Contract에 Evidence 없음 | MISSING_EVIDENCE | O |
| Snapshot에 SPEC_KEY 없음 | UNCLASSIFIED | O |
| strict 모드에서 GAP 발견 | NEEDS_CONFIRMATION | O |

---

## 갱신 히스토리

| 날짜 | CONFIRM | EVIDENCE | UNCLASS | 총계 | 변경 |
|------|:-------:|:--------:|:-------:|:----:|------|
| 2026-01-20 | 0 | 0 | 0 | 0 | 템플릿 제거, 클린 상태 |

---

> **자동 생성**: `specctl verify`, `specctl update` 실행 시 갱신됨
