# UI_COMPONENT - UI 컴포넌트 스펙

> Button, Modal, Form, Icon 등 공통 UI 컴포넌트 규격

---

## 개요

shadcn/ui 기반 커스텀 UI 컴포넌트 시스템

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: UI_COMPONENT_FUNC_BUTTON

- **What**: 버튼 컴포넌트 (variant: default, outline, destructive, ghost)
- **Evidence**:
  - code: `src/components/ui/button.tsx::Button`
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/components/ui/button.tsx::ButtonProps`

### Contract: UI_COMPONENT_FUNC_MODAL

- **What**: 모달/다이얼로그 컴포넌트 (접근성 완비)
- **Evidence**:
  - code: `src/components/ui/dialog.tsx::Dialog`
  - code: `src/components/ui/dialog.tsx::DialogContent`
  - code: `src/components/ui/dialog.tsx::DialogOverlay`
  - code: `src/components/ui/dialog.tsx::DialogTitle`

### Contract: UI_COMPONENT_FUNC_FORM

- **What**: 폼 컴포넌트 (Input 기반)
- **Evidence**:
  - code: `src/components/ui/input.tsx::Input`

### Contract: UI_COMPONENT_FUNC_ICON

- **What**: 아이콘 시스템 (lucide-react)
- **Evidence**:
  - code: `src/components/ui/dialog.tsx`
  - code: `package.json`

### Contract: UI_COMPONENT_FUNC_MEMBER_MGMT

- **What**: MemberManagement 멤버 관리 통합 컴포넌트
- **Evidence**:
  - code: `src/components/space/MemberManagement.tsx`
  - code: `src/components/space/MemberList.tsx`

### Contract: UI_COMPONENT_FUNC_ROLE_BADGE

- **What**: RoleBadge 역할 뱃지 컴포넌트
- **Rules**:
  | 역할 | 색상 | 의미 |
  |-----|------|------|
  | SuperAdmin | 보라색 | 플랫폼 관리자 |
  | OWNER | 파란색 | 공간 소유자 |
  | STAFF | 초록색 | 운영 스태프 |
  | PARTICIPANT | 회색 | 일반 참가자 |
- **Evidence**:
  - code: `src/components/space/RoleBadge.tsx`

### Contract: UI_COMPONENT_FUNC_MEMBER_SEARCH

- **What**: MemberSearchInput 멤버 검색 컴포넌트
- **Evidence**:
  - code: `src/components/space/MemberSearchInput.tsx`

<!-- FUNCTIONAL:END -->

---

<!-- DESIGN:BEGIN -->

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

<!-- DESIGN:END -->

---

## Button

### Variants

| Variant | 용도 | 사용 빈도 |
|---------|------|----------|
| `default` | 주요 액션 (CTA) | ⭐⭐⭐ |
| `outline` | 보조 액션 | ⭐⭐⭐ |
| `destructive` | 위험 액션 | 요청 시만 |
| `ghost` | 최소 강조 | 요청 시만 |

### Sizes

| Size | Height | 용도 |
|------|--------|------|
| `sm` | h-8 | 작은 버튼 |
| `default` | h-10 | 기본 |
| `lg` | h-12 | CTA |
| `icon` | size-10 | 아이콘 버튼 |

### 상태

| 상태 | 스타일 변화 |
|-----|-----------|
| `hover` | `-translate-y-0.5`, `shadow-lg` |
| `focus-visible` | `ring-2 ring-ring` |
| `disabled` | `opacity-50` |

---

## Modal

### 접근성 요구사항

| 요구사항 | 구현 |
|---------|------|
| 역할 선언 | `role="dialog"` |
| 모달 표시 | `aria-modal="true"` |
| 포커스 트랩 | Tab 키 내부 순환 |
| ESC 닫기 | 키보드 핸들러 |
| 포커스 복귀 | 트리거로 복귀 |

---

## Form

### 필수 속성

| 요소 | 속성 |
|------|------|
| label | `htmlFor={inputId}` |
| input | `aria-invalid`, `aria-describedby` |
| error | `role="alert"` |

---

## 규칙

### 허용

```tsx
✅ <Button>저장</Button>
✅ <Button variant="outline">취소</Button>
✅ <Button size="icon" aria-label="메뉴"><MenuIcon /></Button>
```

### 금지

```tsx
❌ <Button variant="success">  // 존재하지 않는 variant
❌ <Button className="bg-[#xxx]">  // 토큰 우회
❌ <Button size="icon">아이콘</Button>  // aria-label 누락
❌ 새로운 variant 추가  // 확장 금지
```

---

## 참조

- 원본:
  - `docs/components/button.md`
  - `docs/components/modal.md`
  - `docs/components/form.md`
  - `docs/components/icon.md`

---

> **마이그레이션**: 2026-01-21 DocOps 자동 변환
