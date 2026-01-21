# FOUNDATION - 디자인 기반 규칙

> 디자인 토큰, 접근성, 네이밍, i18n 등 전역 기반 규칙 정의

---

## 개요

"Primary Color만 바꾸면 브랜드 완성" - 일관된 디자인 시스템 기반

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: FOUNDATION_FUNC_DESIGN_TOKENS

- **What**: CSS 변수 기반 디자인 토큰 시스템
- **Evidence**:
  - code: `src/app/globals.css::--color-primary`
  - code: `src/app/globals.css::--color-background`
  - code: `src/app/globals.css::--radius`

### Contract: FOUNDATION_FUNC_ACCESSIBILITY

- **What**: WCAG 2.1 Level AA 접근성 규칙
- **Evidence**:
  - code: `src/components/ui/button.tsx::focus-visible:ring-2`
  - code: `src/components/ui/dialog.tsx::DialogContent`
  - code: `src/components/ui/dialog.tsx::sr-only`

### Contract: FOUNDATION_FUNC_I18N

- **What**: 다국어 텍스트 관리 시스템
- **Evidence**:
  - code: `src/lib/text-config.ts::BUTTON_TEXT`
  - code: `src/lib/text-config.ts::STATUS_TEXT`
  - code: `src/lib/text-config.ts::MESSAGE_TEXT`

### Contract: FOUNDATION_FUNC_NAMING

- **What**: ID 네이밍 체계 ({TYPE}.{DOMAIN}.{CONTEXT})
- **Evidence**:
  - code: `src/lib/text-config.ts::DEPLOYMENT_ENV`
  - code: `src/lib/text-config.ts::LABEL_TEXT`

<!-- FUNCTIONAL:END -->

---

<!-- DESIGN:BEGIN -->

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
  - code: `src/components/ui/dialog.tsx::open`
  - code: `src/components/ui/dialog.tsx::onOpenChange`

<!-- DESIGN:END -->

---

## 디자인 토큰

### Color Tokens

```css
/* 이 값만 변경하면 전체 브랜드 변경 */
--primary: hsl(168 64% 50%);
--primary-foreground: hsl(0 0% 100%);
```

| 토큰 | 용도 |
|-----|------|
| `--background` | 배경 |
| `--foreground` | 텍스트 |
| `--muted` | 보조 배경 |
| `--destructive` | 위험/삭제 |
| `--border` | 테두리 |

### Spacing Tokens

| 토큰 | 값 | Tailwind |
|-----|-----|----------|
| space-1 | 4px | `p-1` |
| space-2 | 8px | `p-2` |
| space-4 | 16px | `p-4` |
| space-6 | 24px | `p-6` |

### Radius Tokens

| 토큰 | 값 | 용도 |
|-----|-----|------|
| radius-sm | 4px | 작은 요소 |
| radius-lg | 8px | 버튼, 카드 |
| radius-full | 9999px | CTA, 아바타 |

---

## 접근성 (a11y)

### 기본 원칙

| 원칙 | 기준 |
|-----|------|
| 색상 대비 | 4.5:1 이상 |
| 키보드 접근 | 모든 인터랙션 가능 |
| 포커스 표시 | `focus-visible:ring-2` |

### 컴포넌트별 요구사항

| 컴포넌트 | 필수 속성 |
|---------|----------|
| Button | `aria-label` (아이콘), `aria-busy` (로딩) |
| Modal | `role="dialog"`, `aria-modal`, 포커스 트랩 |
| Form | `aria-invalid`, `aria-describedby` |

---

## 네이밍 체계

```
{TYPE}.{DOMAIN}.{CONTEXT}.{NUMBER}
```

| TYPE | 용도 | 예시 |
|------|------|------|
| SID | Screen ID | `SID.AUTH.LOGIN.001` |
| LID | Label ID | `LID.MODAL.DELETE.001` |
| BTN | Button ID | `BTN.PRIMARY.SUBMIT.001` |

---

## i18n 톤 코드

| 톤 코드 | 용도 | 예시 |
|--------|------|------|
| `Confirm` | 긍정적 확인 | "저장되었습니다" |
| `Destructive` | 파괴적/위험 | "삭제하시겠습니까?" |
| `Soft` | 부드러운 안내 | "입력해 주세요" |
| `Neutral` | 중립적 정보 | "총 3개" |

---

## 규칙

### 허용

```css
✅ bg-primary           /* 토큰 사용 */
✅ text-muted-foreground /* 시맨틱 토큰 */
```

### 금지

```css
❌ bg-[#2DD4BF]         /* 하드코딩 금지 */
❌ text-[#666]          /* 직접 색상 금지 */
```

---

## 참조

- 원본:
  - `docs/foundations/tokens.md`
  - `docs/foundations/accessibility.md`
  - `docs/foundations/i18n.md`
  - `docs/foundations/naming.md`
  - `docs/foundations/semantic.md`

---

> **마이그레이션**: 2026-01-21 DocOps 자동 변환
