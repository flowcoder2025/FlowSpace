# DOCOPS.md - specctl 도구 스펙

> DocOps CLI 도구 (specctl) 동작 명세

---

## 개요

| 항목 | 값 |
|------|-----|
| **도구명** | specctl |
| **현재 버전** | v0.5.0 |
| **언어** | PowerShell |
| **목적** | 코드-문서 동기화 검증 |

---

## Contract 유형 분류 체계

### 유형 정의

| 유형 | 코드 기반 | Evidence 형태 | 검증 방식 | GAP 계산 |
|------|:--------:|--------------|----------|:--------:|
| **CODE** | O | `code: path::function` | 자동 스캔 | 포함 |
| **PROCESS** | X | 플로우, 체크리스트 | 수동 검증 | **제외** |
| **DESIGN** | 일부 | 규칙 테이블, 상태도 | 코드 리뷰 | **제외** |
| **INFRA** | X | 설정 파일, Terraform | 배포 검증 | **제외** |

### SPEC별 분류

#### CODE (자동 검증 가능)

GAP 계산에 포함되는 SPEC:

- SPACE - 공간 API
- AUTH - 인증 API
- USER - 사용자 API
- GUEST - 게스트 API
- ADMIN - 관리자 API
- DASHBOARD - 대시보드 API
- SOCKET - 소켓 이벤트
- GAME - 게임 엔진
- LIVEKIT - 실시간 통신
- UI_COMPONENT - UI 컴포넌트
- FOUNDATION - 디자인 토큰
- PERMISSION - 권한 관리
- PAGE - UI 페이지

#### PROCESS (수동 검증)

GAP 계산에서 제외되는 SPEC:

- AI_PROTOCOL - 세션 프로토콜, TASK.md 규칙

#### INFRA (배포 검증)

GAP 계산에서 제외되는 SPEC:

- INFRA - OCI, Vercel, Caddy 설정

---

## specctl 명령어

### snapshot

코드 인벤토리 추출

```powershell
specctl snapshot [-Suggest|-Apply] [-Type TYPE]
```

**옵션**

| 옵션 | 설명 |
|------|------|
| `-Suggest` | 후보 목록만 출력 (파일 미생성) |
| `-Apply` | 즉시 적용 |
| `-Type TYPE` | 특정 유형만 스캔 |

**TYPE 값**

| Type | 스캔 대상 |
|------|----------|
| `ui-routes` | UI 페이지 라우트 |
| `api-routes` | API 엔드포인트 |
| `ui-components` | UI 컴포넌트 |
| `permissions` | 권한 유틸리티 |
| `socket-events` | Socket.io 이벤트 |
| `design-tokens` | 설계 토큰 |
| `feature-hooks` | Feature 훅 |
| `css-variables` | CSS 변수 (v0.5.0) |

<!-- FUNCTIONAL:BEGIN -->

### Contract: DOCOPS_FUNC_SNAPSHOT

> 코드 인벤토리 자동 추출

**Evidence**
- code: `scripts/specctl.ps1::Cmd-Snapshot`

**스캔 대상**

| 디렉토리 | 패턴 | SPEC_KEY |
|----------|------|----------|
| `src/app/**/page.tsx` | App Router 페이지 | PAGE |
| `src/app/api/**/route.ts` | App Router API | * (라우트 기반) |
| `src/components/ui/*.tsx` | UI 컴포넌트 | UI_COMPONENT |
| `src/components/space/*.tsx` | Space 컴포넌트 | UI_COMPONENT |
| `src/features/*/hooks/*.ts` | Feature 훅 | SPACE |
| `src/lib/space-*.ts` | 권한 유틸리티 | SPACE |
| `src/lib/text-config.ts` | 설계 토큰 | FOUNDATION |
| `server/socket-server.ts` | Socket 이벤트 | SOCKET |
| `src/app/globals.css` | CSS 변수 (v0.5.0) | FOUNDATION |

### Contract: DOCOPS_FUNC_VERIFY

> 문서-코드 동기화 검증

**Evidence**
- code: `scripts/specctl.ps1::Cmd-Verify`

**상태 정의**

| 상태 | Snapshot | Contract | Evidence | 설명 |
|------|:--------:|:--------:|:--------:|------|
| SYNC | O | O | O | 완전 동기화 |
| MISSING_DOC | O | X | - | 문서 누락 |
| HALLUCINATION | X | O | - | 코드 없이 문서만 존재 |
| BROKEN_EVIDENCE | O | O | X | Evidence 링크 깨짐 |
| SNAPSHOT_GAP | - | O | O | 자동화 범위 밖 |
| PROCESS_BASED | - | O | - | 프로세스 기반 (v0.5.0) |
| INFRA_BASED | - | O | - | 인프라 기반 (v0.5.0) |

### Contract: DOCOPS_FUNC_COVERAGE_MATRIX

> 커버리지 매트릭스 생성

**Evidence**
- code: `scripts/specctl.ps1::Update-CoverageMatrix`

**출력 형식 (v0.5.0)**

```markdown
## 요약

| 항목 | 값 |
|------|-----|
| **SYNC** | 110 |
| **SNAPSHOT_GAP** | 4 |
| **PROCESS_BASED** | 5 |
| **INFRA_BASED** | 6 |
| **BROKEN_EVIDENCE** | 1 |
| **MISSING_DOC** | 0 |
| **HALLUCINATION** | 0 |
```

<!-- FUNCTIONAL:END -->

---

## verify

문서-코드 검증

```powershell
specctl verify [-Level soft|strict] [-Cache|-Full] [-DebugDump] [-Quiet]
```

**옵션**

| 옵션 | 설명 |
|------|------|
| `-Level soft` | 경고만 기록 (기본값) |
| `-Level strict` | 드리프트 시 실패 |
| `-Cache` | 변경 파일만 증분 검증 |
| `-Full` | 전체 검증 (캐시 무시) |
| `-DebugDump` | CONTRACT_INDEX.md 생성 |
| `-Quiet` | 출력 최소화 |

<!-- DESIGN:BEGIN -->

### Contract: DOCOPS_DESIGN_STATUS_FLOW

> 상태 판정 플로우

```
┌─────────────────────────────────────────┐
│           Contract 처리 시작            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────┐
        │ SPEC_KEY 확인   │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌───────┐   ┌────────┐   ┌────────┐
│ CODE  │   │PROCESS │   │ INFRA  │
│ 기반  │   │ 기반   │   │ 기반   │
└───┬───┘   └───┬────┘   └───┬────┘
    │           │            │
    ▼           ▼            ▼
┌───────┐   ┌────────────┐  ┌───────────┐
│자동   │   │PROCESS_    │  │INFRA_     │
│검증   │   │BASED       │  │BASED      │
└───┬───┘   │(GAP 제외)  │  │(GAP 제외) │
    │       └────────────┘  └───────────┘
    ▼
┌───────────────────┐
│ Evidence 검증     │
├───────────────────┤
│ 파일 존재?        │
│ 심볼 매칭?        │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌───────┐   ┌──────────────┐
│ VALID │   │ BROKEN_      │
│       │   │ EVIDENCE     │
└───┬───┘   └──────────────┘
    │
    ▼
┌───────────────────┐
│ Snapshot 매칭     │
├───────────────────┤
│ 라우트 매칭?      │
│ 컴포넌트 매칭?    │
│ 훅/이벤트 매칭?   │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌───────┐   ┌──────────────┐
│ SYNC  │   │ SNAPSHOT_GAP │
│       │   │ (CODE만 계산)│
└───────┘   └──────────────┘
```

### Contract: DOCOPS_DESIGN_GAP_CALCULATION

> GAP 계산 로직

**CODE 기반 (GAP 포함)**

```
실제 GAP = SNAPSHOT_GAP (CODE 기반 SPEC만)
```

**PROCESS/INFRA 기반 (GAP 제외)**

```
PROCESS_BASED = AI_PROTOCOL Contract 수
INFRA_BASED = INFRA Contract 수
```

**자동화율 계산**

```
자동화율 = SYNC / (SYNC + SNAPSHOT_GAP) × 100%
         = CODE 기반만 계산
```

<!-- DESIGN:END -->

---

## Evidence 검증 로직

### 지원 심볼 패턴

| 패턴 | 예시 | 지원 |
|------|------|:----:|
| 일반 함수 | `function foo()` | O |
| const 선언 | `const foo =` | O |
| export 함수 | `export function foo` | O |
| export default | `export default function foo` | O |
| named export | `export { foo }` | O |
| arrow function | `const foo = () =>` | O |
| CSS 변수 (v0.5.0) | `--primary:` | O |
| cva 변수 (v0.5.0) | `variant` | O |

### 파일 타입별 검증

| Evidence 타입 | 검증 방식 |
|--------------|----------|
| `code:` | 심볼 패턴 매칭 |
| `type:` | 타입/인터페이스 매칭 |
| `ui:` | 컴포넌트 매칭 |
| `test:` | describe/it 블록 매칭 |
| `e2e:` | test 블록 매칭 |
| `css:` (v0.5.0) | CSS 변수 매칭 |

---

## 확장 스캔 함수 (v0.5.0)

### Scan-CSSVariables

CSS 변수 스캔

```powershell
function Scan-CSSVariables {
    # src/app/globals.css에서 --로 시작하는 변수 추출
    # 예: --primary, --background, --foreground
}
```

**스캔 파일**
- `src/app/globals.css`

**추출 패턴**
```css
--변수명: 값;
```

### Scan-SocketFolder

socket 폴더 확장 스캔

```powershell
function Scan-SocketFolder {
    # server/*.ts 내 socket 관련 함수 추출
    # src/features/space/hooks/useSocket.ts 포함
}
```

**스캔 파일**
- `server/socket-server.ts`
- `server/socket-handlers.ts` (존재 시)
- `src/features/space/hooks/useSocket.ts`

---

## 설정 파일

### .docopsrc.json

```json
{
  "version": "2.5.0",
  "contractTypes": {
    "processBasedSpecs": ["AI_PROTOCOL"],
    "infraBasedSpecs": ["INFRA"]
  },
  "specKeyMapping": {
    "patterns": [
      { "match": "/api/auth/*", "specKey": "AUTH" },
      { "match": "/api/space/*", "specKey": "SPACE" }
    ]
  },
  "verify": {
    "defaultLevel": "soft",
    "ignorePaths": ["node_modules/**", "dist/**"]
  }
}
```

---

## 버전 히스토리

| 버전 | 날짜 | 주요 변경 |
|------|------|----------|
| v0.3.0 | 2026-01-20 | 캐시 구현, Evidence 개선 |
| v0.4.0 | 2026-01-20 | 확장 스캔 함수 (컴포넌트, 훅, 이벤트) |
| **v0.5.0** | **2026-01-21** | **Contract 유형 분류, CSS 변수 스캔** |

---

> **갱신**: 2026-01-21 | specctl v0.5.0
