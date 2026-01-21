# AGENT_GUIDE - DocOps 에이전트 적용 가이드

> AI 에이전트가 **새 프로젝트에 DocOps를 적용**하거나 **기존 프로젝트를 마이그레이션**할 때 따라야 할 절차

---

## 0. 설치 방법 선택

### 0.1 npm CLI (일반 사용자 권장)

```bash
# DocOps 설치
npx create-docops

# 업데이트
npx create-docops --update
```

**장점**: 어떤 환경에서든 사용 가능, Claude Code 없이도 적용 가능

### 0.2 Skill 기반 (Claude Code 사용자 권장)

```bash
/docops-init      # 최초 설치
/docops-verify    # 세션 시작
/docops-finish    # 작업 완료
```

**장점**: 대화형 가이드, 자동 컨텍스트 복구

---

## 0.3 DocOps Skills

DocOps는 **Skill + SubAgent** 패턴으로 캡슐화되어 있습니다.

| Skill | 용도 | 시점 |
|-------|------|------|
| `/docops-init` | 프로젝트에 DocOps 적용 | 최초 1회 |
| `/docops-verify` | 드리프트 검증 | **세션 시작 시 필수** |
| `/docops-finish` | 작업 완료 워크플로우 | 작업 완료 시 |
| `/docops-status` | 현재 상태 확인 | 수시 |

---

## 1. 새 프로젝트 적용

### 1.1 Skill 사용 (권장)

```bash
/docops-init
```

SubAgent가 자동으로:
1. 프로젝트 상태 감지
2. FRESH 모드로 구조 생성
3. 초기 검증 실행

### 1.2 init이 하는 일

```
docs/
├── 00_ssot/
│   ├── ANCHOR.md
│   ├── DOC_POLICY.md
│   ├── COVERAGE_MATRIX.md
│   ├── SPEC_SNAPSHOT.md
│   ├── DRIFT_REPORT.md
│   └── DOC_DEBT.md
├── 02_decisions/
├── 03_standards/specs/
├── 05_archive/
└── 99_migration_backup/

scripts/
├── specctl
├── flow
└── flow-finish

CLAUDE.md (DocOps 섹션 추가)
```

---

## 2. 기존 프로젝트 마이그레이션

### 2.1 Skill 사용 (권장)

```bash
/docops-init
```

SubAgent가 자동으로:
1. 기존 문서 감지 → MIGRATE 모드
2. 백업 (`99_migration_backup/YYYY-MM-DD/`)
3. 문서 스캔 → SPEC_KEY 제안
4. 사용자 확인 후 변환

### 2.2 마이그레이션 흐름

```
1. 기존 docs/ 백업
2. 문서 스캔 → Contract 후보 추출
3. SPEC_KEY 할당 제안
4. 사용자 확인
5. specs/<SPEC_KEY>.md 형식으로 변환
6. Evidence 없는 항목 → DOC_DEBT 등록
7. /docops-verify 실행
```

---

## 3. 세션 워크플로우

### 3.1 세션 시작

```bash
/docops-verify
```

- 드리프트 있으면 → 먼저 해결
- 드리프트 없으면 → 작업 시작

### 3.2 작업 중

- 코드 변경 시 관련 Contract 갱신
- Evidence 심볼 최신 상태 유지

### 3.3 작업 완료

```bash
/docops-finish
```

- build → snapshot → update → verify(strict) → compile → commit → push

---

## 3.4 자동 검증 (v3.2.0+)

DocOps는 설치 시 Git hooks를 자동 설정하여 커밋 시 자동 검증합니다.

### 자동 검증 시점

| 시점 | 훅/스크립트 | 기본값 |
|------|------------|--------|
| git commit | pre-commit hook | 활성화 |
| npm run dev | predev script | 비활성화 |
| npm run build | prebuild script | 비활성화 |

### 설정 변경

`.docopsrc.json`에서 자동화 설정 가능:

```json
{
  "automation": {
    "onFailure": "warn",
    "hooks": {
      "preCommit": true,
      "preDev": false,
      "preBuild": false
    },
    "setupCompleted": true
  }
}
```

### 드리프트 발견 시 동작

- **warn** (기본): 경고 출력 후 계속 진행 - 개발 중 권장
- **strict**: 커밋/빌드 차단 - CI/CD, 프로덕션 권장

### 초기 설정 재실행

```bash
npx create-docops setup --force
```

---

## 4. 상태 확인

```bash
/docops-status
/docops-status --detail
```

출력 예시:
```
[DocOps Status]
─────────────────────────────────
적용: ✓   검증: soft   드리프트: 0
─────────────────────────────────
Contract: 6 (SYNC: 6, GAP: 0)
부채: 2 (UNCLASSIFIED)
─────────────────────────────────
```

---

## 5. 드리프트 대응

### 5.1 상태별 해결

| 상태 | 해결 방법 |
|------|----------|
| MISSING_DOC | Contract 추가 |
| HALLUCINATION | 코드 추가 또는 Contract 삭제 |
| BROKEN_EVIDENCE | Evidence 링크 수정 |
| SNAPSHOT_GAP | 경고만, 점진적 확장 |

### 5.2 자동 해결

```bash
/docops-verify --fix
```

---

## 6. 핵심 규칙

### 6.1 절대 금지

- Evidence 없이 Contract 작성
- verify 없이 커밋/푸시
- SSOT 문서 간 불일치 방치

### 6.2 필수 준수

- 세션 시작 시 `/docops-verify`
- 작업 완료 시 `/docops-finish`
- 드리프트 발견 시 즉시 해결

---

## 7. 컨텍스트 복구

오토컴팩트 또는 세션 재시작 후:

```bash
/docops-verify
```

SubAgent가:
1. ANCHOR.md 읽기 → 프로젝트 컨텍스트 복구
2. COVERAGE_MATRIX 확인 → 현재 상태 파악
3. 드리프트 있으면 보고

---

## 8. CLAUDE.md 통합

다른 프로젝트에 DocOps 적용 시, 해당 프로젝트의 CLAUDE.md에 추가:

```markdown
## DocOps

| Skill | 용도 |
|-------|------|
| `/docops-verify` | 세션 시작 시 드리프트 검증 |
| `/docops-finish` | 작업 완료 시 |

세션 워크플로우:
1. /docops-verify
2. 작업...
3. /docops-finish
```

---

## 9. Skill 파일 위치

```
.claude/skills/
├── docops-init/
│   └── SKILL.md     # /docops-init
├── docops-verify/
│   └── SKILL.md     # /docops-verify
├── docops-finish/
│   └── SKILL.md     # /docops-finish
└── docops-status/
    └── SKILL.md     # /docops-status
```

---

## 10. Spec 문서 작성 가이드

### 10.1 새 Spec 생성 시

1. **DOC_POLICY.md의 "8. Spec 문서 스키마"를 반드시 참조**
2. 스키마의 필수 구조를 복사하여 시작
3. `<SPEC_KEY>`, `<SLUG>` 등 플레이스홀더를 실제 값으로 교체
4. Evidence는 **실제 존재하는 코드 심볼**만 기입

### 10.2 실제 적용 예시

**시나리오**: 결제(PAYMENT) 기능 Spec 생성

```markdown
# PAYMENT

> 결제 처리 관련 기능 명세

---

## 0. 요약

- **목적**: 상품 결제 및 환불 처리
- **범위**: 결제 요청, 결제 완료, 환불
- **비범위**: 정기 구독, 할인 쿠폰 (별도 SPEC)

---

## 1. 기능 요소 (Functional)

<!-- FUNCTIONAL:BEGIN -->

### Contract: PAYMENT_FUNC_PROCESS
- **Tier**: core
- **What**: 결제 요청을 처리하고 PG사와 통신
- **Inputs/Outputs**:
  - Input: `{ orderId: string, amount: number, method: PaymentMethod }`
  - Output: `{ transactionId: string, status: PaymentStatus }` | Error
- **Errors**:
  - `INSUFFICIENT_BALANCE`: 잔액 부족
  - `PG_TIMEOUT`: PG사 응답 타임아웃
  - `INVALID_CARD`: 유효하지 않은 카드
- **Evidence**:
  - code: `src/payment/process.ts::processPayment`
  - type: `src/types/payment.ts::PaymentRequest`
  - test: `tests/payment.test.ts::describe("processPayment")::it("성공")`

### Contract: PAYMENT_FUNC_REFUND
- **Tier**: core
- **What**: 결제 취소 및 환불 처리
- **Evidence**:
  - code: `src/payment/refund.ts::processRefund`
  - test: `tests/payment.test.ts::describe("refund")`

<!-- FUNCTIONAL:END -->

---

## 2. 디자인 요소 (Design / UX·UI)

<!-- DESIGN:BEGIN -->

### Contract: PAYMENT_DESIGN_CHECKOUT_FORM
- **Tier**: core
- **What**: 결제 정보 입력 폼 UI
- **UI States**:
  - idle: 기본 상태
  - validating: 카드 정보 검증 중
  - processing: 결제 처리 중
  - success: 결제 완료
  - error: 오류 표시
- **Evidence**:
  - ui: `src/components/payment/CheckoutForm.tsx::CheckoutForm`
  - e2e: `e2e/payment.spec.ts::test("결제 플로우")`

<!-- DESIGN:END -->

---

## 3. Implementation Notes

- **PG사**: 토스페이먼츠 SDK 사용
- **타임아웃**: 30초 (환경변수로 설정)
- **재시도**: 최대 3회

---

## 4. 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-20 | 초기 작성 | abc1234 |
```

### 10.3 핵심 체크리스트

새 Spec 작성 시 확인사항:

- [ ] 파일 경로: `docs/03_standards/specs/<SPEC_KEY>.md`
- [ ] 필수 섹션: 요약, 기능 요소, 디자인 요소, 변경 이력
- [ ] `<!-- FUNCTIONAL:BEGIN/END -->` 마커 존재
- [ ] `<!-- DESIGN:BEGIN/END -->` 마커 존재
- [ ] Contract ID 형식: `<SPEC_KEY>_FUNC_<SLUG>` 또는 `<SPEC_KEY>_DESIGN_<SLUG>`
- [ ] 모든 Contract에 최소 1개 Evidence
- [ ] Evidence는 실제 존재하는 심볼만 기입

---

> **버전**: npx create-docops --version
> **갱신**: 자동 생성됨
