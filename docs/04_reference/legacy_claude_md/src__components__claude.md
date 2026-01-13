# Components 가이드

> **역할**: UI 컴포넌트 개발 가이드
> **상위**: `/CLAUDE.md` (루트 헌법)
>
> ⚠️ **필수**: 이 파일을 읽기 전 `/CLAUDE.md` 섹션 0 (컨텍스트 로딩 프로토콜)을 확인하세요.
> 핵심 금지 사항과 전역 원칙은 루트 헌법에서 정의됩니다.

---

## 1. 이 디렉토리 범위

```
/src/components
├── claude.md        # [현재 파일]
├── /ui              # shadcn/ui + 커스텀 컴포넌트
│   ├── button.tsx
│   ├── card.tsx
│   ├── modal.tsx
│   ├── input.tsx
│   └── index.ts     # 통합 export
│
├── /space           # 📌 공간 관리 컴포넌트 (SSOT)
│   ├── MemberManagement.tsx   # 멤버 관리 통합 컴포넌트
│   ├── MemberList.tsx         # 멤버 목록 (역할별 그룹핑)
│   ├── MemberSearchInput.tsx  # 멤버 검색 (이메일/이름)
│   ├── RoleBadge.tsx          # 역할 뱃지 (OWNER/STAFF/PARTICIPANT)
│   └── index.ts               # 통합 export
│
├── /providers       # 전역 프로바이더
└── UserNav.tsx      # 사용자 네비게이션
```

---

## 2. 컴포넌트 분류

### 2.1 Layout 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `Container` | 최대 너비 래퍼 (max-w-7xl) |
| `Section` | 페이지 섹션 (py-16~24) |
| `Stack` | Flex 레이아웃 (HStack/VStack) |
| `Grid` | 그리드 레이아웃 |
| `Divider` | 구분선 |

### 2.2 Typography 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `Heading` | h1~h6 제목 (variant로 구분) |
| `Text` | 본문 텍스트 |

### 2.3 Interactive 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `Button` | 버튼 (주사용 2종 + 예비 2종) |
| `Input` | 입력 필드 |
| `Badge` | 태그/뱃지 |

### 2.4 Feedback 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `Modal` | 모달 다이얼로그 |
| `Toast` | 알림 메시지 |
| `Alert` | 경고/정보 박스 |

### 2.5 Visual 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `Card` | 카드 컨테이너 |
| `Avatar` | 프로필 이미지 |
| `IconBox` | 아이콘 래퍼 |

---

## 3. 컴포넌트 작성 규칙

### 3.1 파일 구조

```tsx
// button.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// 1. variants 정의 (cva)
const buttonVariants = cva(
  "base-classes...",
  {
    variants: {
      variant: { /* ... */ },
      size: { /* ... */ },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// 2. Props 타입
export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

// 3. 컴포넌트
function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// 4. Export
export { Button, buttonVariants }
```

### 3.2 index.ts 통합 Export

```tsx
// /ui/index.ts
export { Button, buttonVariants } from "./button"
export { Card, CardHeader, CardContent } from "./card"
export { Modal } from "./modal"
// ...
```

---

## 4. Button 상세 (전역 규칙 참조)

> ⚠️ `/CLAUDE.md` 4.2절 버튼 전역 제한 참조

### 4.1 주사용 Variants (기본 사용)

```tsx
variant: {
  // Primary 액션 (CTA) - 기본 사용
  default: "bg-primary text-primary-foreground hover:bg-primary/90 ...",
  // Secondary 액션 - 기본 사용
  outline: "border-2 border-border bg-background hover:bg-muted ...",
}
```

### 4.2 예비 Variants (사용자 요청 시)

```tsx
variant: {
  // 위험 액션 - 사용자 요청 시만
  destructive: "bg-destructive text-white hover:bg-destructive/90 ...",
  // 최소 강조 - 사용자 요청 시만
  ghost: "hover:bg-accent hover:text-accent-foreground",
}
```

### 4.3 Sizes

```tsx
size: {
  sm: "h-8 px-4 text-xs",
  default: "h-10 px-5 text-sm",
  lg: "h-12 px-8 text-base",
  xl: "h-14 px-10 text-lg",
  icon: "size-10",
}
```

### 4.4 Rounded

```tsx
rounded: {
  default: "rounded-lg",
  full: "rounded-full",  // CTA용
}
```

### 4.5 States

모든 버튼은 다음 상태 지원:
- `default` → `hover` → `active` → `disabled`
- `loading` (스피너 표시)

---

## 5. Modal 상세

### 5.1 접근성 필수 요구사항

> ⚠️ `/CLAUDE.md` 4.5절 접근성 참조

- [ ] 열릴 때 포커스가 모달 내부로 이동
- [ ] Tab 키로 모달 내부만 순환 (포커스 트랩)
- [ ] ESC 키로 닫기
- [ ] 닫힐 때 트리거 요소로 포커스 복귀
- [ ] `role="dialog"` + `aria-modal="true"`
- [ ] `aria-labelledby` 또는 `aria-label`

### 5.2 상태도 (State Machine)

```yaml
States: [CLOSED, OPENING, OPEN, CLOSING]

Events:
  - OPEN_MODAL: 모달 열기 요청
  - CLOSE_MODAL: 모달 닫기 요청
  - ANIMATION_END: 애니메이션 완료

Guards:
  - canOpen: "currentState === CLOSED"
  - canClose: "currentState === OPEN"

Transitions:
  CLOSED → OPENING: Event=OPEN_MODAL, Guard=canOpen, Action=startAnimation
  OPENING → OPEN: Event=ANIMATION_END, Action=focusTrap
  OPEN → CLOSING: Event=CLOSE_MODAL, Guard=canClose, Action=startAnimation
  CLOSING → CLOSED: Event=ANIMATION_END, Action=restoreFocus
```

---

## 6. /docs 참조

| 용도 | 위치 |
|-----|------|
| 버튼 체크리스트 | `/docs/checklists/button.md` |
| 모달 체크리스트 | `/docs/checklists/modal.md` |
| 접근성 체크리스트 | `/docs/checklists/a11y.md` |
| 컴포넌트 템플릿 | `/docs/components/_template.md` |
| 새 컴포넌트 프로세스 | `/docs/workflow/new-component.md` |

---

## 7. Space 컴포넌트 (/space)

> 📌 **SSOT**: 공간 관리 UI의 단일 진실 소스

### 7.1 MemberManagement

멤버 관리 통합 컴포넌트 (Admin/Dashboard 공용)

```tsx
interface MemberManagementProps {
  spaceId: string
  isSuperAdmin?: boolean  // SuperAdmin 권한 (OWNER 임명 가능)
  isOwner?: boolean       // OWNER 권한 (STAFF 임명/해제 가능)
  compact?: boolean       // 컴팩트 모드
  readOnly?: boolean      // 읽기 전용
}
```

**사용처**:
- `/admin/spaces/[id]` - SuperAdmin 공간 관리
- `/dashboard/spaces/[id]` - OWNER/STAFF 대시보드

### 7.2 MemberList

멤버 목록 컴포넌트 (역할별 그룹핑)

```tsx
interface MemberListProps {
  spaceId: string
  isSuperAdmin?: boolean
  isOwner?: boolean
  onlinePlayers?: string[]  // 온라인 참가자 ID 목록
  compact?: boolean
  readOnly?: boolean
}
```

### 7.3 MemberSearchInput

멤버 검색 컴포넌트 (이메일/이름 검색)

```tsx
interface MemberSearchInputProps {
  spaceId?: string          // 공간 내 displayName 검색 시
  onSelect: (user) => void  // 선택 콜백
  onCancel?: () => void     // 취소 콜백
  placeholder?: string
  compact?: boolean
}
```

### 7.4 RoleBadge

역할 뱃지 컴포넌트

```tsx
interface RoleBadgeProps {
  role: "OWNER" | "STAFF" | "PARTICIPANT"
  isSuperAdmin?: boolean  // SuperAdmin 표시
}
```

**색상 규칙**:
| 역할 | 색상 | 의미 |
|-----|------|------|
| SuperAdmin | 보라색 | 플랫폼 관리자 |
| OWNER | 파란색 | 공간 소유자 |
| STAFF | 초록색 | 운영 스태프 |
| PARTICIPANT | 회색 | 일반 참가자 |

---

## 8. 새 컴포넌트 추가 절차

> ⚠️ 토큰 효율 원칙: 문서는 요청 시만 작성

```
1. 설계 요약 (3~5줄) 응답
2. `/src/components/ui/{name}.tsx` 구현
3. `/src/components/ui/index.ts`에 export 추가
4. 체크리스트 검증 (/docs/checklists/)
5. (선택) 사용자 요청 시 /docs/components/{name}.md 작성
```

---

## 9. 금지 사항

- ❌ 루트 CLAUDE.md의 버튼 variant 재정의 금지
- ❌ 토큰 하드코딩 금지 (`bg-[#xxx]` 금지)
- ❌ 컴포넌트 내 한글 하드코딩 금지
- ❌ 버튼 variant 추가 확장 금지

---

## 변경 이력

| 날짜 | 변경 내용 | 영향 범위 |
|-----|---------|----------|
| 2025-12-05 | 초기 생성 | - |
| 2025-12-05 | 버튼 규칙 동기화 (주사용/예비 분리) | Button 컴포넌트 |
| 2025-12-05 | 모달 상태도 보강 | Modal 컴포넌트 |
| 2025-12-05 | /docs 참조 섹션 추가, 토큰 효율 원칙 적용 | 절차 전체 |
| 2025-12-15 | /space 컴포넌트 섹션 추가 (MemberManagement, RoleBadge 등) | Space 컴포넌트 |
