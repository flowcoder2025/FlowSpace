# DOC_POLICY - 문서 정책

> DocOps 문서 작성/검증 규칙

---

## 1. 핵심 원칙

1. **Evidence 없는 Contract는 존재할 수 없다**
2. **Snapshot ↔ Contract 매핑**으로 누락/할루/근거깨짐을 기계적으로 탐지한다

---

## 2. Evidence 형식 규칙

### 2.1 타입별 허용 형식

| 타입 | 형식 | 예시 |
|------|------|------|
| **code** | `<path>::<symbol>` | `src/auth/login.ts::handleLogin` |
| **type** | `<path>::<symbol>` | `src/types/auth.ts::LoginRequest` |
| **ui** | `<path>::<symbol>` | `src/components/Login.tsx::LoginForm` |
| **test** | `<path>::<selector>` | `tests/auth.test.ts::describe("login")::it("success")` |
| **e2e** | `<path>::<selector>` | `e2e/auth.spec.ts::test("login flow")` |

### 2.2 심볼 형식 규칙

```
# 허용되는 심볼
functionName        # 함수
ClassName          # 클래스
TypeName           # 타입/인터페이스
EnumName           # Enum
ComponentName      # React/Vue 컴포넌트
exportedConst      # export된 상수

# 테스트 selector (문자열 허용)
describe("suite")::it("case")
test("case")
it("case")
```

### 2.3 폴백 (최후 수단)

심볼 추출이 어려운 경우에만 라인 범위 사용:
```
code: src/legacy/utils.js#L10-L20
```

---

## 3. Contract 정책

### 3.1 Contract Level

| Level | 필드 | 강제 |
|-------|------|:----:|
| **Level 1 (MVP)** | What + Evidence(최소 1개) | 필수 |
| **Level 2 (권장)** | + Inputs/Outputs, Errors | 권장 |
| **Level 3 (완전체)** | + State/Flow, Performance, Dependencies | 선택 |

### 3.2 Contract tier

| tier | 설명 | strict 모드 요구사항 |
|------|------|---------------------|
| **core** | 핵심 기능 | Level 2 이상 |
| **normal** | 일반 기능 | Level 1 이상 |

**기본값**: tier 미명시 시 `normal`로 간주

### 3.3 Contract ID 규칙 (slug 기반)

```
CONTRACT_ID = <SPEC_KEY>_<FUNC|DESIGN>_<SLUG>

예시:
- AUTH_FUNC_LOGIN
- AUTH_FUNC_LOGOUT
- AUTH_DESIGN_LOGIN_FORM
- CHAT_FUNC_SEND_MESSAGE
- CHAT_DESIGN_EMPTY_STATE
```

**규칙**:
- slug는 SCREAMING_SNAKE_CASE
- 의미 있는 이름 사용 (번호 X)
- 번호는 정렬용으로만 보조 사용 가능

---

## 4. 상태 정의 (5가지)

| 상태 | Snapshot | Contract | Evidence | 설명 |
|------|:--------:|:--------:|:--------:|------|
| **SYNC** | O | O | O | 완벽 |
| **MISSING_DOC** | O | X | - | 코드는 있는데 문서 없음 (누락) |
| **HALLUCINATION** | X | O | - | 문서는 있는데 코드 없음 (할루) |
| **BROKEN_EVIDENCE** | O | O | X | 코드는 있는데 링크/심볼이 틀림 |
| **SNAPSHOT_GAP** | - | O | O | Snapshot 자동화 범위 밖 |

### 4.1 SNAPSHOT_GAP 졸업 조건

- 해당 인벤토리 유형이 `specctl snapshot`에 추가되면
- GAP → SYNC/MISSING_DOC/HALLUCINATION으로 자동 재분류
- 예: 상태 목록 자동화 추가 시 상태 관련 Contract가 재분류됨

---

## 5. 검증 레벨

### 5.1 soft 모드
```bash
specctl verify --level=soft
```
- 경고만 기록
- DRIFT_REPORT.md 업데이트
- 차단 없음 (개발 중 사용)

### 5.2 strict 모드
```bash
specctl verify --level=strict
```
- 차단 기준: `MISSING_DOC`, `HALLUCINATION`, `BROKEN_EVIDENCE`
- `SNAPSHOT_GAP`은 경고만 (초기 도입 보호)
- flow:finish에서 사용

---

## 6. 파일 커밋 정책

| 파일 | 커밋 | 용도 |
|------|:----:|------|
| COVERAGE_MATRIX.md | O | 사람용 현황판 |
| SPEC_SNAPSHOT.md | O | 합의된 인벤토리 |
| CONTRACT_INDEX.md | X | verify 내부용 (--debug-dump로 생성) |
| DRIFT_REPORT.md | O | 검증 실패 기록 |
| DOC_DEBT.md | O | 미해결 큐 |

---

## 7. DRIFT_REPORT 정리 정책

### 7.1 구조
```md
## Active (해결 필요)
| ID | Type | Item | Detected | Status |

## Resolved (최근 30일)
| ID | Type | Item | Resolved | How |

## Archive (30일 이후)
- 별도 파일로 분리 또는 삭제
```

### 7.2 자동 정리
- Resolved 30일 경과 시 Archive로 이동
- Archive는 docs/05_archive/drift_history/에 보관 또는 삭제

---

## 8. Spec 문서 스키마 (필수 양식)

> AI 에이전트는 새 Spec 문서 생성 시 **반드시** 이 스키마를 따라야 합니다.

### 8.1 파일 경로
```
docs/03_standards/specs/<SPEC_KEY>.md
```

### 8.2 필수 구조

```markdown
# <SPEC_KEY>

> (한 줄 설명)

---

## 0. 요약

- **목적**: (이 Spec이 다루는 핵심 기능)
- **범위**: (포함되는 기능들)
- **비범위**: (명시적으로 제외되는 기능들)

---

## 1. 기능 요소 (Functional)

<!-- FUNCTIONAL:BEGIN -->

### Contract: <SPEC_KEY>_FUNC_<SLUG>
- **Tier**: core | normal
- **What**: (한 줄 설명)
- **Inputs/Outputs**: (Level 2 이상)
  - Input: `{ field: type }`
  - Output: `{ field: type }` | Error
- **Errors**: (Level 2 이상)
  - `ERROR_CODE`: 설명
- **Evidence**:
  - code: `<path>::<symbol>`
  - type: `<path>::<symbol>`
  - test: `<path>::<selector>`

<!-- FUNCTIONAL:END -->

---

## 2. 디자인 요소 (Design / UX·UI)

<!-- DESIGN:BEGIN -->

### Contract: <SPEC_KEY>_DESIGN_<SLUG>
- **Tier**: core | normal
- **What**: (한 줄 설명)
- **UI States**: (상태 목록)
- **Copy**: (UI 문구)
- **A11y**: (접근성 요구사항)
- **Evidence**:
  - ui: `<path>::<ComponentName>`
  - e2e: `<path>::<selector>`

<!-- DESIGN:END -->

---

## 3. Implementation Notes (선택)

- SDK/벤더 정보
- 기술적 제약사항
- 환경 설정

---

## 4. 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| YYYY-MM-DD | 초기 작성 | - |
```

### 8.3 Contract ID 생성 규칙

```
<SPEC_KEY>_<TYPE>_<SLUG>

TYPE:
- FUNC  → 기능 요소 (Functional)
- DESIGN → 디자인 요소 (Design / UX·UI)

SLUG:
- SCREAMING_SNAKE_CASE
- 의미 있는 동사+명사 조합
- 예: LOGIN, SEND_MESSAGE, EMPTY_STATE
```

### 8.4 Evidence 작성 규칙

| 카테고리 | 필수 Evidence | 형식 |
|----------|--------------|------|
| **기능(FUNC)** | code | `src/path/file.ts::functionName` |
| **기능(FUNC)** | type (권장) | `src/types/file.ts::TypeName` |
| **기능(FUNC)** | test (권장) | `tests/file.test.ts::describe("suite")::it("case")` |
| **디자인(DESIGN)** | ui | `src/components/file.tsx::ComponentName` |
| **디자인(DESIGN)** | e2e (권장) | `e2e/file.spec.ts::test("case")` |

### 8.5 Level별 필수 필드

| Level | Contract 필드 |
|-------|--------------|
| **Level 1 (MVP)** | What + Evidence 1개 |
| **Level 2 (권장)** | + Inputs/Outputs + Errors |
| **Level 3 (완전)** | + State/Flow + Performance + Dependencies |

---

## 9. 금지 사항

1. Evidence 없는 Contract 작성 금지
2. GENERAL 문서에 내용 저장 금지 (인덱스 전용)
3. FUNCTIONAL/DESIGN 블록 경계 침범 금지
4. 검증 없이 flow:finish 완료 금지
5. **스키마를 벗어난 Spec 문서 양식 금지**

---

> **갱신**: 자동 생성됨 | 버전: npx create-docops --version
