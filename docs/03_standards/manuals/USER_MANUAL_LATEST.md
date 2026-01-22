# 사용자 매뉴얼

> 자동 생성: specctl compile (2026-01-22 15:37:37)

---

## 목차

- [ADMIN](#ADMIN)
- [AI_PROTOCOL](#AI_PROTOCOL)
- [ARCH](#ARCH)
- [AUTH](#AUTH)
- [CRON](#CRON)
- [DASHBOARD](#DASHBOARD)
- [DOCOPS](#DOCOPS)
- [FOUNDATION](#FOUNDATION)
- [GAME](#GAME)
- [GUEST](#GUEST)
- [INFRA](#INFRA)
- [LIVEKIT](#LIVEKIT)
- [PAGE](#PAGE)
- [PERMISSION](#PERMISSION)
- [SOCKET](#SOCKET)
- [SPACE](#SPACE)
- [UI_COMPONENT](#UI_COMPONENT)
- [UI_SYSTEM](#UI_SYSTEM)
- [USER](#USER)

---

## ADMIN


---

## AI_PROTOCOL


### Contract: AI_PROTOCOL_DESIGN_TASK_STRUCTURE
- **Tier**: normal
- **What**: TASK.md 문서 구조 템플릿
- **Template**:
  ```markdown
  # TASK: [태스크 제목]

  > **목표**: [한 줄 설명]
  > **시작일**: YYYY-MM-DD

  ## 현재 상태
  | 상태 | 수량 | 설명 |

  ## Phase 1: [단계명]
  - [ ] 체크리스트 항목

  ## 진행 상태
  | Phase | 설명 | 상태 | 완료일 |

  ## 참조
  - HANDOFF: docs/00_ssot/HANDOFF_*.md

  ## 변경 이력
  | 날짜 | 변경 내용 |
  ```
- **Evidence**:
  - code: `TASK.md::TASK`

### Contract: AI_PROTOCOL_DESIGN_HANDOFF_STRUCTURE
- **Tier**: normal
- **What**: HANDOFF 문서 구조 (세션 간 컨텍스트 전달)
- **Template**:
  ```markdown
  # HANDOFF - [작업명]

  > **세션 핸드오프 문서**
  > **작성일**: YYYY-MM-DD
  > **상태**: ⏳ 진행중 | ✅ 완료

  ## 1. 배경
  ## 2. 완료된 작업
  ## 3. 다음 작업
  ## 4. 파일 위치 요약
  ```
- **Evidence**:
  - code: `docs/00_ssot/HANDOFF_2026-01-21_CLAUDE_SLIM.md`


---

## ARCH


---

## AUTH


---

## CRON


---

## DASHBOARD


---

## DOCOPS


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


---

## FOUNDATION


### Contract: FOUNDATION_DESIGN_A11Y_MODAL

- **Tier**: core
- **What**: 모달 접근성 필수 요구사항 상세
- **Requirements**:
  | 요구사항 | 구현 방법 |
  |---------|----------|
  | 열릴 때 포커스 이동 | 모달 내부 첫 번째 포커스 요소로 |
  | 포커스 트랩 | Tab 키로 모달 내부만 순환 |
  | ESC 닫기 | 키보드 핸들러 등록 |
  | 닫힐 때 포커스 복귀 | 트리거 요소로 복귀 |
  | 역할 선언 | `role="dialog"` + `aria-modal="true"` |
  | 레이블 | `aria-labelledby` 또는 `aria-label` 필수 |
- **Evidence**:
  - ui: `src/components/ui/dialog.tsx::DialogContent`
  - code: `src/components/ui/dialog.tsx::Dialog`

### Contract: FOUNDATION_DESIGN_STATE_MACHINE

- **Tier**: normal
- **What**: 모달 상태도 작성 규칙 (State Machine)
- **States**: `[CLOSED, OPENING, OPEN, CLOSING]`
- **Events**:
  | 이벤트 | 설명 |
  |-------|------|
  | OPEN_MODAL | 모달 열기 요청 |
  | CLOSE_MODAL | 모달 닫기 요청 |
  | ANIMATION_END | 애니메이션 완료 |
- **Guards**:
  | Guard | 조건 |
  |-------|------|
  | canOpen | `currentState === CLOSED` |
  | canClose | `currentState === OPEN` |
- **Transitions**:
  ```
  CLOSED → OPENING: Event=OPEN_MODAL, Guard=canOpen
  OPENING → OPEN: Event=ANIMATION_END
  OPEN → CLOSING: Event=CLOSE_MODAL, Guard=canClose
  CLOSING → CLOSED: Event=ANIMATION_END
  ```
- **Evidence**:
  - code: `src/components/ui/dialog.tsx::Dialog`
  - code: `src/components/ui/dialog.tsx::DialogContent`


---

## GAME


---

## GUEST


---

## INFRA


---

## LIVEKIT


---

## PAGE


---

## PERMISSION


---

## SOCKET


---

## SPACE


---

## UI_COMPONENT


### Contract: UI_COMPONENT_DESIGN_BUTTON

- **What**: 버튼 시각 디자인 및 상호작용 상태
- **Evidence**:
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/components/ui/button.tsx::size`

### Contract: UI_COMPONENT_DESIGN_MODAL

- **What**: 모달 오버레이 및 애니메이션
- **Evidence**:
  - code: `src/components/ui/dialog.tsx::DialogOverlay`
  - code: `src/components/ui/dialog.tsx::DialogContent`

### Contract: UI_COMPONENT_DESIGN_BUTTON_HOVER

- **Tier**: core
- **What**: 버튼 Hover 스타일 규칙 (variant별 상호작용)
- **Rules**:
  | Variant | Hover 시 스타일 |
  |---------|----------------|
  | `default` | 배경 어둡게 (primary/90), 그림자 + 상승 효과 |
  | `outline` | **테두리 → primary, 텍스트 → primary, 배경 → 투명 유지** |
  | `destructive` | 배경 어둡게 (destructive/90), 그림자 + 상승 효과 |
  | `ghost` | 배경 accent 적용 |
- **Critical**: outline 버튼 hover 시 **배경색 변경 금지**, 테두리와 텍스트만 primary로 변경
- **Evidence**:
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/app/globals.css`


---

## UI_SYSTEM


---

## USER


---


---

> **자동 생성**: 2026-01-22 15:37:37
