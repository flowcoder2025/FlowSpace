# DocOps 스펙 문서 에이전트 — V3.2

> 목표(최우선): **할루시네이션/드리프트를 0%에 수렴**시키고 **누락 없는 문서**를 만든다.
>
> 핵심 원칙(2개)
> 1) **Evidence 없는 Contract는 존재할 수 없다**
> 2) **Snapshot(코드 인벤토리) ↔ Contract(문서) 매핑**으로 누락/할루/근거깨짐을 기계적으로 탐지한다

> **V2.4 변화** (V2.3 → V2.4)
> - **설정 파일 도입**: `.docopsrc.json`으로 프로젝트별 커스터마이징 지원
> - **캐시 구현 완료**: `--cache` 옵션으로 SHA256 기반 증분 검증 실제 동작
> - **SPEC_KEY 설정화**: 하드코딩된 분류 로직 → 설정 파일 기반 패턴 매칭
> - **Evidence 검증 개선**: arrow function, export default, named export 지원
> - **테스트 selector 개선**: 중첩 describe/it 블록 지원 (`>` 구분자)
> - **verbose 옵션 추가**: `--verbose`로 검증 실패 시 상세 원인 출력
> - **버전 업그레이드**: specctl v0.2.0 → v0.3.0

---

## 0) 설정 파일 (V2.4 신규)

### 0.1 `.docopsrc.json` 스키마

프로젝트 루트에 `.docopsrc.json` 파일을 생성하여 DocOps 동작을 커스터마이징할 수 있습니다.

```json
{
  "version": "2.4.0",
  "specKeyMapping": {
    "patterns": [
      { "match": "/api/auth/*", "specKey": "AUTH" },
      { "match": "/api/user/*", "specKey": "USER" },
      { "match": "/api/chat/*", "specKey": "CHAT" },
      { "match": "/api/billing/*", "specKey": "BILLING" },
      { "match": "/api/*", "specKey": "API" },
      { "match": "/auth/*", "specKey": "AUTH" },
      { "match": "/dashboard/*", "specKey": "DASHBOARD" },
      { "match": "/settings/*", "specKey": "SETTINGS" }
    ],
    "default": "UNCLASSIFIED"
  },
  "verify": {
    "defaultLevel": "soft",
    "ignorePaths": [
      "node_modules/**",
      "dist/**",
      ".git/**"
    ]
  },
  "paths": {
    "ssotDir": "docs/00_ssot",
    "specsDir": "docs/03_standards/specs",
    "devspecDir": "docs/03_standards/devspec",
    "manualsDir": "docs/03_standards/manuals",
    "cacheDir": ".docops"
  },
  "cache": {
    "enabled": true,
    "maxAge": 86400
  },
  "evidence": {
    "requireMinimum": 1,
    "allowedTypes": ["code", "type", "ui", "test", "e2e"]
  }
}
```

### 0.2 설정 항목 설명

| 항목 | 설명 | 기본값 |
|------|------|--------|
| `specKeyMapping.patterns` | 라우트 → SPEC_KEY 매핑 패턴 | 내장 패턴 |
| `specKeyMapping.default` | 매칭 실패 시 기본값 | `UNCLASSIFIED` |
| `verify.defaultLevel` | 기본 검증 레벨 | `soft` |
| `verify.ignorePaths` | 검증 제외 경로 | `[]` |
| `paths.*` | 각 디렉토리 경로 | 기본 경로 |
| `cache.enabled` | 캐시 활성화 여부 | `true` |
| `cache.maxAge` | 캐시 유효 시간(초) | `86400` (24시간) |

### 0.3 설정 파일 없는 경우

설정 파일이 없으면 내장된 기본값으로 동작합니다 (하위 호환성 보장).

---

## 1) 설치 방법

### 1.1 Git Clone 설치 (권장)

```bash
# 1. 임시로 DocOps 클론
git clone --depth 1 https://github.com/flowcoder2025/FlowSubAgent.git /tmp/docops-installer

# 2. 현재 프로젝트에서 설치 실행
node /tmp/docops-installer/packages/create-docops/bin/create-docops.js

# 3. (선택) 클론 삭제
rm -rf /tmp/docops-installer
```

**Windows PowerShell:**
```powershell
git clone --depth 1 https://github.com/flowcoder2025/FlowSubAgent.git $env:TEMP\docops-installer
node $env:TEMP\docops-installer\packages\create-docops\bin\create-docops.js
Remove-Item -Recurse -Force $env:TEMP\docops-installer
```

### 1.2 npm CLI

```bash
npx create-docops
npx create-docops --update
npx create-docops --check
```

### 1.3 Skill 기반 (Claude Code)

```bash
/docops:init      # 새 프로젝트에 DocOps 적용
/docops:verify    # 세션 시작 시 드리프트 검증
/docops:finish    # 작업 완료 시
```

---

## 2) 문서 3층 구조

```
docs/
  00_ssot/
    ANCHOR.md
    DOC_POLICY.md
    AGENT_GUIDE.md
    SPEC_SNAPSHOT.md
    CONTRACT_INDEX.md
    COVERAGE_MATRIX.md
    DRIFT_REPORT.md
    DOC_DEBT.md

  02_decisions/

  03_standards/
    specs/
      <SPEC_KEY>.md
    devspec/
    manuals/

  05_archive/
  99_migration_backup/

.docopsrc.json          # V2.4: 설정 파일
.docops/                # V2.4: 캐시 디렉토리
  verify-cache.json
```

---

## 3) specctl CLI v0.3.0 (V2.4 업데이트)

### 3.1 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `specctl snapshot` | 코드 인벤토리 추출 |
| `specctl verify` | 문서-코드 검증 |
| `specctl update` | diff 기반 Contract 업데이트 제안 |
| `specctl compile` | 산출물 생성 |
| `specctl cache` | 캐시 관리 (V2.4) |
| `specctl status` | 현재 상태 확인 |

### 3.2 verify 옵션 (V2.4 업데이트)

```bash
specctl verify [options]

옵션:
  --level=soft|strict   검증 레벨 (기본: .docopsrc.json에서 설정)
  --cache               변경된 파일만 증분 검증 (V2.4 실제 구현)
  --full                전체 검증 (캐시 무시)
  --verbose, -v         검증 실패 시 상세 원인 출력 (V2.4 신규)
  --debug-dump          CONTRACT_INDEX.md 생성
```

### 3.3 cache 명령어 (V2.4 신규)

```bash
specctl cache [subcommand]

서브명령:
  status    캐시 상태 확인 (기본값)
  clear     캐시 삭제
```

### 3.4 캐시 구조

```json
{
  "version": "1.0.0",
  "lastVerify": "2026-01-20T10:30:00.000Z",
  "level": "soft",
  "configHash": "abc123...",
  "fileHashes": {
    "docs/03_standards/specs/AUTH.md": "sha256...",
    "docs/00_ssot/COVERAGE_MATRIX.md": "sha256..."
  },
  "results": {
    "sync": 10,
    "missing": 0,
    "hallu": 0,
    "broken": 0,
    "gap": 2
  }
}
```

---

## 4) Evidence 검증 개선 (V2.4)

### 4.1 지원 심볼 패턴 (개선됨)

V2.4에서 다음 패턴들이 추가 지원됩니다:

| 패턴 | 예시 | V2.3 | V2.4 |
|------|------|:----:|:----:|
| 일반 함수 | `function foo()` | ✅ | ✅ |
| const 선언 | `const foo =` | ✅ | ✅ |
| export 함수 | `export function foo` | ✅ | ✅ |
| **export default function** | `export default function foo` | ❌ | ✅ |
| **export default 표현식** | `export default foo` | ❌ | ✅ |
| **named export** | `export { foo }` | ❌ | ✅ |
| **aliased export** | `export { bar as foo }` | ❌ | ✅ |
| **arrow function** | `const foo = () =>` | ❌ | ✅ |

### 4.2 테스트 selector 개선

V2.4에서 중첩 테스트 블록을 지원합니다:

```
# 단일 selector
test: src/tests/auth.test.ts::describe("Auth")
test: src/tests/auth.test.ts::it("should login")

# 중첩 selector (V2.4 신규)
test: src/tests/auth.test.ts::describe("Auth") > it("should login")
test: src/tests/auth.test.ts::describe("Auth") > describe("Login") > it("success case")
```

### 4.3 verbose 출력 예시

```bash
$ specctl verify --verbose

[VERBOSE] 검증: code: src/api/auth.ts::login
[VERBOSE]   파일: /project/src/api/auth.ts
[VERBOSE]   심볼: login
[VERBOSE]   결과: VALID - 심볼 발견 (패턴: export\s+function...)

[VERBOSE] 검증: code: src/api/user.ts::getProfile
[VERBOSE]   파일: /project/src/api/user.ts
[VERBOSE]   심볼: getProfile
[VERBOSE]   결과: SYMBOL_NOT_FOUND - 심볼을 찾을 수 없음
[VERBOSE]   시도한 패턴들:
[VERBOSE]     - (function|const|let|var|class|...)...
[VERBOSE]     - export\s+(const|let|var|function|...)...
```

---

## 5) SPEC_KEY 분류 설정화 (V2.4)

### 5.1 설정 파일 기반 분류

`.docopsrc.json`의 `specKeyMapping.patterns`로 라우트 → SPEC_KEY 매핑을 정의합니다.

```json
{
  "specKeyMapping": {
    "patterns": [
      { "match": "/api/auth/*", "specKey": "AUTH" },
      { "match": "/api/user/*", "specKey": "USER" }
    ],
    "default": "UNCLASSIFIED"
  }
}
```

### 5.2 패턴 매칭 규칙

- `*` : 단일 경로 세그먼트 와일드카드
- 패턴은 순서대로 매칭 (첫 번째 매칭 승)
- 매칭 실패 시 `default` 값 사용

### 5.3 레거시 폴백

설정 파일이 없으면 내장된 레거시 분류 함수 사용 (deprecated).

---

## 6) 상태 정의

### 6.1 기본 상태 (4)
- **SYNC**: Snapshot ✅, Contract ✅, Evidence ✅
- **MISSING_DOC**: Snapshot ✅, Contract ❌
- **HALLUCINATION**: Snapshot ❌, Contract ✅
- **BROKEN_EVIDENCE**: Snapshot ✅, Contract ✅, Evidence ❌

### 6.2 보강 상태 (1)
- **SNAPSHOT_GAP**: Snapshot 생성기가 아직 커버하지 않는 유형

---

## 7) Evidence 형식 규칙

### 7.1 타입별 허용 형식

- **code/type/ui (심볼 기반)**
  ```
  code: src/api/auth.ts::login
  type: src/types/user.ts::UserProfile
  ui: src/components/Button.tsx::Button
  ```

- **test/e2e (selector 기반)**
  ```
  test: tests/auth.test.ts::describe("Auth")
  test: tests/auth.test.ts::describe("Auth") > it("login")
  e2e: e2e/login.spec.ts::test("successful login")
  ```

### 7.2 폴백 (최후 수단)
```
code: src/complex.ts#L10-L20
```

---

## 8) verify 레벨

### 8.1 soft (기본)
- 경고 기록 + `DRIFT_REPORT` 업데이트
- 차단 없음

### 8.2 strict
- `MISSING_DOC`, `HALLUCINATION`, `BROKEN_EVIDENCE` 시 차단
- `SNAPSHOT_GAP`은 경고 처리

---

## 9) 워크플로우

### 9.1 일반 워크플로우
```bash
specctl snapshot          # 코드 인벤토리 갱신
specctl verify --cache    # 증분 검증
specctl compile           # 산출물 생성
```

### 9.2 flow:finish (권장)
```bash
npm run flow:finish
# 또는
npm run flow:finish -- --docs-only
```

---

## 10) 금지 사항

1. Evidence 없는 Contract 작성 금지
2. GENERAL 문서에 내용 저장 금지
3. FUNCTIONAL/DESIGN 블록 경계 침범 금지
4. 검증 없이 flow:finish 완료 금지
5. 스키마를 벗어난 Spec 문서 양식 금지

---

## 11) 구현 체크리스트

### Phase 7: V2.4 개선
- [x] `.docopsrc.json` 설정 파일 도입
- [x] 캐시 실제 구현 (SHA256 기반)
- [x] SPEC_KEY 설정 파일 기반 분류
- [x] Evidence 검증 정규식 개선
- [x] 테스트 selector 중첩 지원
- [x] `--verbose` 옵션 추가
- [x] specctl v0.3.0 업그레이드

---

## 버전 히스토리

| 버전 | 날짜 | 주요 변경 |
|------|------|----------|
| V2.2 | 2026-01-20 | 초기 구현 완료 (CLI, 통합, 훅) |
| V2.3 | 2026-01-20 | 템플릿 파일 제거, 스키마 기반 접근 |
| V2.3.1 | 2026-01-20 | npm CLI 패키지 추가 |
| **V2.4** | **2026-01-20** | **설정 파일, 캐시 구현, Evidence 개선, verbose** |

---

> **갱신**: 2026-01-20 | DocOps V3.2
