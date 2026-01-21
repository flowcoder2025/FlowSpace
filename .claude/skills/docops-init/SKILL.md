# /docops-init - DocOps 초기화

> 프로젝트에 DocOps 문서 관리 시스템을 적용합니다.

## Trigger
```
/docops-init [--mode=fresh|migrate] [--force]
```

## 동작 흐름

### 1. 프로젝트 상태 감지

```
SubAgent가 자동으로 판단:

1. docs/00_ssot/ANCHOR.md 존재?
   → YES: "DocOps 이미 적용됨" → /docops-verify 실행
   → NO: 계속

2. docs/ 폴더에 .md 파일 존재?
   → YES: MIGRATE 모드 (기존 프로젝트)
   → NO: FRESH 모드 (신규 프로젝트)
```

### 2. FRESH 모드 (신규 프로젝트)

```bash
# 폴더 구조 생성
mkdir -p docs/00_ssot
mkdir -p docs/02_decisions
mkdir -p docs/03_standards/specs
mkdir -p docs/03_standards/devspec
mkdir -p docs/03_standards/manuals
mkdir -p docs/05_archive
mkdir -p docs/99_migration_backup

# SSOT 템플릿 생성
# - ANCHOR.md
# - DOC_POLICY.md
# - COVERAGE_MATRIX.md (빈 템플릿)
# - SPEC_SNAPSHOT.md (빈 템플릿)
# - DRIFT_REPORT.md (빈 템플릿)
# - DOC_DEBT.md (빈 템플릿)

# scripts/ 폴더 생성 (specctl, flow, flow-finish)

# CLAUDE.md에 DocOps 섹션 추가 (있으면 병합)
```

### 3. MIGRATE 모드 (기존 프로젝트) - 대화형

**MIGRATE 모드는 대화형으로 진행됩니다.**

#### Step 1: 백업
```bash
# docs/ → docs/99_migration_backup/YYYY-MM-DD/
```

#### Step 2: 기존 문서 스캔 및 분류
```
비표준 위치의 문서 탐색:
- docs/ 내 모든 .md 파일
- 00_ssot/ 외부 위치의 문서들
- README.md 제외 (프로젝트 루트)

각 문서 분석:
- 제목, 내용 분석
- 관련 코드 탐색 (Grep으로 키워드 검색)
- SPEC_KEY 후보 추출
```

#### Step 3: 문서별 대화형 처리

각 발견된 문서에 대해 순차적으로 처리:

```
"docs/components/auth.md를 분석합니다.

 관련 코드:
   - src/auth/login.ts
   - src/auth/logout.ts
   - tests/auth.test.ts

 제안 SPEC_KEY: AUTH

 Contract 초안:
 ──────────────────────────────────────
 ### AUTH_FUNC_LOGIN
 - What: 사용자 로그인 처리
 - Evidence:
   - code: src/auth/login.ts::handleLogin
   - test: tests/auth.test.ts::describe("login")

 ### AUTH_FUNC_LOGOUT
 - What: 사용자 로그아웃 처리
 - Evidence:
   - code: src/auth/logout.ts::handleLogout
 ──────────────────────────────────────

 이대로 진행할까요?
 1. 예, 이대로 저장
 2. SPEC_KEY 변경
 3. Contract 내용 수정
 4. 이 문서 건너뛰기"
```

#### Step 4: 저장 및 이동
```
사용자 확인 후:
- docs/03_standards/specs/<SPEC_KEY>.md 생성
- 기존 문서 → docs/05_archive/로 이동
- COVERAGE_MATRIX.md 업데이트
```

#### Step 5: 다음 문서로 이동
모든 문서 처리 완료 시 /docops-verify 실행

## SubAgent 지침

```yaml
role: DocOps Initializer
tools:
  - Glob (파일 탐색)
  - Read (파일 읽기)
  - Grep (코드 검색)
  - Write (파일 생성)
  - Bash (폴더 생성, 스크립트 실행)
  - AskUserQuestion (마이그레이션 확인)

workflow:
  1. 프로젝트 상태 감지
  2. 모드 결정 (FRESH/MIGRATE/SKIP)
  3. 사용자에게 계획 설명
  4. 실행
  5. /docops-verify 호출하여 초기 상태 확인

migrate_workflow:
  1. 백업 생성
  2. 비표준 문서 목록 수집
  3. 각 문서에 대해:
     a. 내용 분석
     b. 관련 코드 탐색 (Grep)
     c. SPEC_KEY 제안
     d. Contract 초안 작성
     e. AskUserQuestion으로 확인
     f. 사용자 선택에 따라 저장/수정/건너뛰기
  4. 모든 문서 처리 후 검증
```

## 출력 예시

### FRESH 모드
```
[DocOps Init] 프로젝트 상태: 신규 (docs/ 없음)
[DocOps Init] FRESH 모드로 초기화합니다.

생성 항목:
  ✓ docs/00_ssot/ANCHOR.md
  ✓ docs/00_ssot/DOC_POLICY.md
  ✓ docs/00_ssot/COVERAGE_MATRIX.md
  ✓ docs/00_ssot/SPEC_SNAPSHOT.md
  ✓ docs/00_ssot/DRIFT_REPORT.md
  ✓ docs/00_ssot/DOC_DEBT.md
  ✓ scripts/specctl
  ✓ scripts/flow
  ✓ scripts/flow-finish
  ✓ CLAUDE.md (DocOps 섹션 추가)

[DocOps Init] 완료. /docops-verify 실행 중...
```

### MIGRATE 모드
```
[DocOps Init] 프로젝트 상태: 기존 문서 존재
[DocOps Init] MIGRATE 모드로 진행합니다.

감지된 문서 (3개):
  1. docs/api.md
  2. docs/auth.md
  3. docs/components/form.md

백업 위치: docs/99_migration_backup/2026-01-21/

대화형 마이그레이션을 시작합니다...

────────────────────────────────────────
[1/3] docs/api.md 분석 중...
```

## 옵션

| 옵션 | 설명 |
|------|------|
| `--mode=fresh` | 강제 신규 모드 |
| `--mode=migrate` | 강제 마이그레이션 모드 |
| `--force` | 기존 DocOps 덮어쓰기 |

## 참조

- [ANCHOR.md](../../../docs/00_ssot/ANCHOR.md) - DocOps 진입점
- [AGENT_GUIDE.md](../../../docs/00_ssot/AGENT_GUIDE.md) - 에이전트 적용 가이드
