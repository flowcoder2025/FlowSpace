# FlowSpace 기능 분석 및 개선 권장사항

> **분석일**: 2025-12-19
> **분석 방법**: 코드베이스 전수 조사 (--ultrathink)
> **분석 범위**: API 31개, 게임 엔진 12개 모듈, 컴포넌트 50+ 개

---

## 목차

1. [현재 구현 상태](#1-현재-구현-상태)
2. [높은 우선순위 개선사항](#2-높은-우선순위-개선사항)
3. [중간 우선순위 개선사항](#3-중간-우선순위-개선사항)
4. [낮은 우선순위 개선사항](#4-낮은-우선순위-개선사항)
5. [코드 품질 개선](#5-코드-품질-개선)
6. [성능 최적화](#6-성능-최적화)
7. [보안 점검](#7-보안-점검)
8. [테스트 전략](#8-테스트-전략)

---

## 1. 현재 구현 상태

### 1.1 API 라우트 현황 (31개)

#### 인증 API
| 엔드포인트 | 메서드 | 상태 | 설명 |
|-----------|-------|------|------|
| `/api/auth/[...nextauth]` | ALL | ✅ 완료 | NextAuth 핸들러 |
| `/api/auth/register` | POST | ✅ 완료 | 회원가입 |

#### 공간 API
| 엔드포인트 | 메서드 | 상태 | 설명 |
|-----------|-------|------|------|
| `/api/spaces` | GET/POST | ✅ 완료 | 공간 목록/생성 |
| `/api/spaces/[id]` | GET/PATCH/DELETE | ✅ 완료 | 공간 CRUD |
| `/api/spaces/[id]/join` | POST | ✅ 완료 | 공간 입장 |
| `/api/spaces/[id]/members` | GET | ✅ 완료 | 멤버 목록 |
| `/api/spaces/[id]/members/[memberId]/kick` | POST | ✅ 완료 | 강퇴 |
| `/api/spaces/[id]/members/[memberId]/mute` | POST | ✅ 완료 | 음소거 |
| `/api/spaces/[id]/staff` | GET/POST | ✅ 완료 | STAFF 관리 |
| `/api/spaces/[id]/staff/[userId]` | DELETE | ✅ 완료 | STAFF 해제 |
| `/api/spaces/[id]/my-role` | GET | ✅ 완료 | 내 역할 조회 |
| `/api/spaces/[id]/messages` | GET | ✅ 완료 | 채팅 페이지네이션 |
| `/api/spaces/[id]/messages/[messageId]` | DELETE | ✅ 완료 | 메시지 삭제 |
| `/api/spaces/[id]/objects` | GET/POST/DELETE | ✅ 완료 | 맵 오브젝트 |
| `/api/spaces/[id]/visit` | POST | ✅ 완료 | 방문 기록 |
| `/api/spaces/invite/[code]` | GET | ✅ 완료 | 초대 코드 검증 |

#### 게스트 API
| 엔드포인트 | 메서드 | 상태 | 설명 |
|-----------|-------|------|------|
| `/api/guest` | POST | ✅ 완료 | 게스트 세션 생성 |
| `/api/guest/verify` | POST | ✅ 완료 | 세션 검증 |
| `/api/guest/exit` | POST | ✅ 완료 | 세션 종료 |
| `/api/guest/event` | POST | ✅ 완료 | 이벤트 기록 |

#### 대시보드 API
| 엔드포인트 | 메서드 | 상태 | 설명 |
|-----------|-------|------|------|
| `/api/dashboard/spaces/[id]/stats` | GET | ✅ 완료 | 공간 통계 |
| `/api/dashboard/spaces/[id]/export` | GET | ❌ 미구현 | CSV 내보내기 |

#### 관리자 API
| 엔드포인트 | 메서드 | 상태 | 설명 |
|-----------|-------|------|------|
| `/api/admin/spaces` | GET | ✅ 완료 | 전체 공간 목록 |
| `/api/admin/logs` | GET | ✅ 완료 | 이벤트 로그 |
| `/api/admin/stats` | GET | ✅ 완료 | 전체 통계 |

#### 기타 API
| 엔드포인트 | 메서드 | 상태 | 설명 |
|-----------|-------|------|------|
| `/api/livekit/token` | POST | ✅ 완료 | LiveKit 토큰 |
| `/api/templates` | GET | ✅ 완료 | 템플릿 목록 |
| `/api/my-spaces` | GET | ✅ 완료 | 내 공간 목록 |
| `/api/users/search` | GET | ✅ 완료 | 사용자 검색 |
| `/api/users/me/nav` | GET | ✅ 완료 | 네비게이션 데이터 |
| `/api/user/consent` | POST | ✅ 완료 | 녹화 동의 |
| `/api/cron/cleanup-messages` | POST | ✅ 완료 | 메시지 정리 |

### 1.2 게임 엔진 모듈 (12개)

| 파일 | 상태 | 설명 |
|-----|------|------|
| `PhaserGame.tsx` | ✅ 완료 | React 래퍼, 이벤트 브릿지 |
| `config.ts` | ✅ 완료 | Phaser 설정 |
| `events.ts` | ✅ 완료 | 이벤트 정의 (19개 이벤트) |
| `MainScene.ts` | ✅ 완료 | 메인 게임 씬 (1305줄) |
| `CharacterSprite.ts` | ✅ 완료 | 캐릭터 애니메이션 |
| `TileSystem.ts` | ✅ 완료 | 타일맵 렌더링 |
| `TilesetGenerator.ts` | ✅ 완료 | 절차적 타일셋 생성 |
| `MapData.ts` | ✅ 완료 | 맵 데이터 구조 |
| `InteractiveObject.ts` | ⚠️ 부분 | 상호작용 오브젝트 (핸들러 미연결) |

### 1.3 권한 시스템

```
SuperAdmin (플랫폼 관리자)
    ↓
OWNER (공간 소유자)
    ↓
STAFF (운영 스탭)
    ↓
PARTICIPANT (일반 참가자)
```

| 권한 | SuperAdmin | OWNER | STAFF | PARTICIPANT |
|-----|:----------:|:-----:|:-----:|:-----------:|
| 공간 삭제 | ✅ | ✅ | ❌ | ❌ |
| 멤버 강퇴 | ✅ | ✅ | ✅ | ❌ |
| 멤버 음소거 | ✅ | ✅ | ✅ | ❌ |
| STAFF 지정 | ✅ | ✅ | ❌ | ❌ |
| 메시지 삭제 | ✅ | ✅ | ✅ | ❌ |
| 공지 발송 | ✅ | ✅ | ✅ | ❌ |
| 통계 조회 | ✅ | ✅ | ❌ | ❌ |
| 맵 편집 | ✅ | ✅ | ❌ | ❌ |

### 1.4 채팅 시스템 (2025-12-19 최적화 완료)

| 기능 | 상태 | 구현 위치 |
|-----|------|----------|
| 공개 채팅 | ✅ | `socket-server.ts:198-300` |
| 귓속말 | ✅ | `type: "whisper"` |
| 파티 채팅 | ✅ | `type: "party"` |
| 시스템 메시지 | ✅ | `type: "system"` |
| 공지사항 | ✅ | `type: "announcement"` |
| Rate Limiting | ✅ | 5msg/5초, 버스트 허용 |
| 메모리 상한 | ✅ | 클라이언트 500개 제한 |
| 페이지네이션 | ✅ | cursor 기반 |
| 리액션 | ✅ | 실시간 카운트 |

---

## 2. 높은 우선순위 개선사항

### 2.1 CSV 내보내기 기능

**현황**: PRD에 명시되어 있으나 API 미구현
**복잡도**: ⭐⭐ (중간)
**예상 작업량**: 4-6시간

#### 구현 계획

**Step 1: API 라우트 생성**
```
파일: src/app/api/dashboard/spaces/[id]/export/route.ts
```

```typescript
// 예상 구현
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. 권한 검증 (OWNER 이상)
  const { user, space } = await verifySpaceAuth(request, params.id, ["OWNER"])

  // 2. 이벤트 로그 조회
  const logs = await prisma.spaceEventLog.findMany({
    where: { spaceId: params.id },
    orderBy: { createdAt: "desc" },
    include: { user: true, guestSession: true }
  })

  // 3. CSV 변환
  const csv = convertToCSV(logs)

  // 4. 파일 응답
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="space-${params.id}-export.csv"`
    }
  })
}
```

**Step 2: CSV 유틸리티**
```
파일: src/lib/utils/csv-export.ts
```

```typescript
interface CSVOptions {
  fields: string[]
  header?: boolean
  delimiter?: string
}

export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: CSVOptions
): string {
  // BOM 추가 (Excel 한글 호환)
  const BOM = "\uFEFF"

  // 헤더
  const header = options.fields.join(options.delimiter || ",")

  // 데이터 행
  const rows = data.map(item =>
    options.fields.map(field => escapeCSV(item[field])).join(options.delimiter || ",")
  )

  return BOM + [header, ...rows].join("\n")
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
```

**Step 3: 대시보드 UI**
```
파일: src/app/dashboard/spaces/[id]/page.tsx
수정 위치: 통계 카드 영역
```

```tsx
<Button
  variant="outline"
  onClick={handleExport}
  disabled={isExporting}
>
  <Download className="w-4 h-4 mr-2" />
  {isExporting ? "내보내는 중..." : "CSV 내보내기"}
</Button>
```

**내보내기 필드 정의**:
| 필드 | 설명 | 예시 |
|-----|------|------|
| timestamp | 이벤트 시간 | 2025-12-19 14:30:00 |
| eventType | 이벤트 종류 | ENTER, EXIT, CHAT |
| userName | 사용자 이름 | 홍길동 |
| userType | 사용자 유형 | USER, GUEST |
| payload | 추가 데이터 | JSON 문자열 |

---

### 2.2 오브젝트 상호작용 연결

**현황**:
- `InteractiveObject.ts`: 5가지 타입 정의됨 (info, portal, npc, item, door)
- `MainScene.ts:342`: `OBJECT_INTERACT` 이벤트 발송됨
- `PhaserGame.tsx:76-82`: `onObjectInteract` 콜백으로 전달됨
- **문제**: 실제 동작 핸들러가 구현되어 있지 않음

**복잡도**: ⭐⭐⭐ (높음)
**예상 작업량**: 8-12시간

#### 현재 구조

```
MainScene.ts
    ↓ eventBridge.emit(OBJECT_INTERACT)
PhaserGame.tsx
    ↓ onObjectInteract 콜백
SpaceLayout.tsx (또는 GameCanvas.tsx)
    ↓ ??? (핸들러 없음)
```

#### 구현 계획

**Step 1: 상호작용 핸들러 컴포넌트**
```
파일: src/features/space/components/ObjectInteractionHandler.tsx
```

```typescript
interface ObjectInteractionHandlerProps {
  onInteract: (data: ObjectInteractionData) => void
}

export function ObjectInteractionHandler({ onInteract }: ObjectInteractionHandlerProps) {
  const [modalState, setModalState] = useState<{
    type: "info" | "npc" | null
    data: Record<string, unknown>
  }>({ type: null, data: {} })

  const handleInteraction = useCallback((data: ObjectInteractionData) => {
    switch (data.type) {
      case "info":
        // 정보 모달 표시
        setModalState({ type: "info", data: data.data })
        break

      case "portal":
        // 포털 이동 (좌표 이동 또는 외부 공간)
        if (data.data.destination === "external") {
          window.open(data.data.url, "_blank")
        } else {
          // 내부 좌표 이동
          eventBridge.emit(GameEvents.TELEPORT_PLAYER, data.data.coordinates)
        }
        break

      case "npc":
        // NPC 대화 모달
        setModalState({ type: "npc", data: data.data })
        break

      case "item":
        // 아이템 획득 (추후 인벤토리 시스템)
        console.log("Item collected:", data.data)
        break

      case "door":
        // 문 열기/닫기 애니메이션
        eventBridge.emit(GameEvents.TOGGLE_DOOR, { id: data.id })
        break
    }
  }, [])

  useEffect(() => {
    // 부모에게 핸들러 전달
    onInteract && onInteract(handleInteraction)
  }, [handleInteraction, onInteract])

  return (
    <>
      {/* 정보 모달 */}
      <InfoModal
        isOpen={modalState.type === "info"}
        data={modalState.data}
        onClose={() => setModalState({ type: null, data: {} })}
      />

      {/* NPC 대화 모달 */}
      <NPCDialogModal
        isOpen={modalState.type === "npc"}
        data={modalState.data}
        onClose={() => setModalState({ type: null, data: {} })}
      />
    </>
  )
}
```

**Step 2: 정보 모달 컴포넌트**
```
파일: src/features/space/components/modals/InfoModal.tsx
```

**Step 3: NPC 대화 모달 컴포넌트**
```
파일: src/features/space/components/modals/NPCDialogModal.tsx
```

**Step 4: SpaceLayout 통합**
```
파일: src/features/space/components/SpaceLayout.tsx
수정 위치: PhaserGame 컴포넌트 주변
```

```tsx
const handleObjectInteract = useCallback((data: ObjectInteractionData) => {
  // ObjectInteractionHandler로 전달
  interactionHandlerRef.current?.handleInteraction(data)
}, [])

// ...

<PhaserGame
  onObjectInteract={handleObjectInteract}
  // ...
/>
<ObjectInteractionHandler ref={interactionHandlerRef} />
```

#### 상호작용 타입별 동작 정의

| 타입 | 동작 | UI | 데이터 구조 |
|-----|------|-----|------------|
| info | 정보 표시 | 모달 | `{ message: string, title?: string }` |
| portal | 위치 이동 | 페이드 전환 | `{ destination: string, coordinates?: {x,y} }` |
| npc | 대화 시작 | 대화 모달 | `{ name: string, dialogue: string[] }` |
| item | 아이템 획득 | 토스트 | `{ itemId: string, itemName: string }` |
| door | 문 토글 | 애니메이션 | `{ isOpen: boolean }` |

---

### 2.3 반응형 디자인 (모바일 뷰어)

**현황**: 데스크톱 UI 중심, 모바일에서 사용 불가
**복잡도**: ⭐⭐⭐⭐ (매우 높음)
**예상 작업량**: 16-24시간

#### 주요 수정 파일

| 파일 | 수정 내용 | 우선순위 |
|-----|----------|---------|
| `SpaceLayout.tsx` | 패널 레이아웃 모바일 대응 | 높음 |
| `ControlBar.tsx` | 버튼 레이아웃 반응형 | 높음 |
| `ChatMessageList.tsx` | 터치 스크롤 최적화 | 중간 |
| `FloatingChatOverlay.tsx` | 모바일 전체화면 모드 | 중간 |
| `ParticipantPanel.tsx` | 비디오 그리드 반응형 | 중간 |
| `MainScene.ts` | 터치 인터랙션 | 낮음 |

#### 구현 전략

**Phase 1: CSS 브레이크포인트 적용**
```css
/* globals.css */
@layer utilities {
  .mobile-only { @apply block sm:hidden; }
  .desktop-only { @apply hidden sm:block; }
  .touch-scroll { @apply overflow-y-auto overscroll-contain; }
}
```

**Phase 2: 모바일 레이아웃**
```
[데스크톱]                    [모바일]
┌────┬────────┬────┐         ┌─────────────┐
│Chat│ Game   │Vid │   →     │   Game      │
│    │        │    │         ├─────────────┤
└────┴────────┴────┘         │   Control   │
```

**Phase 3: 터치 조작 (Phaser)**
```typescript
// 가상 조이스틱 플러그인
import VirtualJoystickPlugin from "phaser3-rex-plugins/plugins/virtualjoystick-plugin.js"

// 또는 간단한 터치 영역
this.input.on("pointerdown", (pointer) => {
  const { x, y } = pointer
  // 화면 영역별 이동 방향 결정
})
```

---

## 3. 중간 우선순위 개선사항

### 3.1 템플릿 맵 에셋 완성

**현황**:
- DB에 3종 템플릿 정의됨 (OFFICE, CLASSROOM, LOUNGE)
- `public/assets/game/maps/*.json` 없음
- `TileMapSystem`이 절차적으로 기본 맵 생성

**복잡도**: ⭐⭐ (중간) - 디자인 작업 필요
**예상 작업량**: 12-20시간 (에셋 제작 포함)

#### 필요 에셋

| 템플릿 | 맵 크기 | 특징 |
|-------|--------|------|
| OFFICE | 50x40 | 책상, 회의실, 휴게공간 |
| CLASSROOM | 40x30 | 강단, 좌석, 화이트보드 |
| LOUNGE | 60x50 | 소파, 바, 게임존 |

#### 에셋 구조
```
public/assets/game/
├── maps/
│   ├── office.json      # Tiled 맵 데이터
│   ├── classroom.json
│   └── lounge.json
├── tilesets/
│   ├── office-tiles.png
│   ├── classroom-tiles.png
│   └── lounge-tiles.png
└── objects/
    ├── furniture/
    ├── decorations/
    └── interactive/
```

---

### 3.2 에러 바운더리 강화

**현황**:
- `src/components/ErrorBoundary*.tsx` 없음
- Phaser 크래시 시 전체 페이지 다운
- Socket 연결 끊김 시 UX 없음

**복잡도**: ⭐⭐ (중간)
**예상 작업량**: 6-8시간

#### 구현 계획

**Step 1: 전역 에러 바운더리**
```
파일: src/components/ErrorBoundary.tsx
```

```typescript
"use client"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo)
    // Sentry 등 에러 리포팅
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

**Step 2: 게임 전용 에러 바운더리**
```
파일: src/features/space/components/GameErrorBoundary.tsx
```

**Step 3: Socket 재연결 UX**
```
파일: src/features/space/components/ConnectionStatus.tsx
```

---

### 3.3 구독 플랜 UI

**현황**:
- `Subscription` 모델 존재 (FREE/PRO/PREMIUM)
- 가격 페이지, 결제 연동 없음

**복잡도**: ⭐⭐⭐ (높음)
**예상 작업량**: 20-30시간

#### 구현 계획

| 단계 | 작업 | 파일 |
|-----|------|------|
| 1 | 가격 페이지 UI | `src/app/pricing/page.tsx` |
| 2 | 플랜 비교 컴포넌트 | `src/components/PricingTable.tsx` |
| 3 | Stripe 연동 API | `src/app/api/stripe/route.ts` |
| 4 | Webhook 처리 | `src/app/api/stripe/webhook/route.ts` |
| 5 | 구독 상태 UI | `src/components/SubscriptionBadge.tsx` |

---

## 4. 낮은 우선순위 개선사항

### 4.1 AI 도우미 연동

**구현 방향**:
- 온보딩 NPC로 Claude API 연동
- 공간 내 질문/답변 지원
- 자연어 명령 (예: "회의실로 이동해줘")

### 4.2 SSO 지원

**구현 방향**:
- SAML 2.0 / OIDC 프로바이더
- 기업 고객용 설정 페이지
- 도메인 기반 자동 라우팅

---

## 5. 코드 품질 개선

### 5.1 타입 안전성

| 파일 | 현황 | 권장 |
|-----|------|------|
| `socket-server.ts` | `any` 10+ 개 | 엄격한 타입 |
| `MainScene.ts` | `unknown` 캐스팅 | 타입 가드 |
| API 라우트 | 런타임 검증 없음 | Zod 스키마 |

**권장 패턴**:
```typescript
// Zod 스키마 예시
const MessageSchema = z.object({
  content: z.string().max(2000),
  type: z.enum(["message", "whisper", "party"]),
  targetId: z.string().optional(),
})

// 타입 가드 예시
function isPlayerPosition(data: unknown): data is PlayerPosition {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "x" in data &&
    "y" in data
  )
}
```

### 5.2 에러 처리 통합

**현재 패턴** (혼재):
```typescript
// 패턴 A
try { ... } catch (e) { console.error(e) }

// 패턴 B
if (!result) { return NextResponse.json({ error: "..." }, { status: 400 }) }

// 패턴 C
throw new Error("...")
```

**권장 패턴**:
```typescript
// 통합 에러 핸들러
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message)
  }
}

// API 래퍼
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (e) {
      if (e instanceof AppError) {
        return NextResponse.json(
          { error: e.message, code: e.code },
          { status: e.statusCode }
        )
      }
      console.error("[API Error]", e)
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      )
    }
  }
}
```

### 5.3 로깅 구조화

**현재**: `console.log`, `console.error` 혼재

**권장**: 구조화된 로깅
```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: "info", message, ...meta, timestamp: new Date().toISOString() }))
  },
  error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: "error",
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta,
      timestamp: new Date().toISOString()
    }))
  },
}
```

---

## 6. 성능 최적화

### 6.1 번들 사이즈

| 항목 | 현재 | 목표 | 방법 |
|-----|------|------|------|
| Phaser | ~1.2MB | ~600KB | 코드 스플리팅 |
| 초기 로드 | ~2MB | ~800KB | lazy loading |
| 이미지 | PNG | WebP | 변환 |

**코드 스플리팅 예시**:
```typescript
const PhaserGame = dynamic(
  () => import("@/features/space/game/PhaserGame"),
  { ssr: false, loading: () => <GameSkeleton /> }
)
```

### 6.2 API 캐싱

| 엔드포인트 | 현재 | 권장 |
|-----------|------|------|
| `/api/templates` | 매번 조회 | 1시간 캐시 |
| `/api/spaces/[id]` | 매번 조회 | SWR (stale-while-revalidate) |
| `/api/users/me/nav` | 매번 조회 | 5분 캐시 |

**SWR 패턴**:
```typescript
const { data: space } = useSWR(`/api/spaces/${spaceId}`, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1분
})
```

### 6.3 이미지 최적화

```bash
# WebP 변환 스크립트
for file in public/assets/game/**/*.png; do
  cwebp -q 80 "$file" -o "${file%.png}.webp"
done
```

---

## 7. 보안 점검

### 7.1 완료된 항목

- [x] Rate Limiting (채팅 5msg/5초)
- [x] 권한 미들웨어 (`space-auth.ts`)
- [x] 환경 변수 분리 (`.env.local`)
- [x] HTTPS 강제 (Vercel)
- [x] 세션 토큰 검증 (Socket.io)

### 7.2 미완료 항목

- [ ] CSRF 토큰 검증 강화
- [ ] API 응답 데이터 최소화 (select 명시)
- [ ] 파일 업로드 검증 (향후)
- [ ] SQL Injection 방지 (Prisma는 기본 방어)
- [ ] XSS 방지 (React는 기본 방어, dangerouslySetInnerHTML 주의)

### 7.3 권장 보안 헤더

```typescript
// next.config.js
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
]
```

---

## 8. 테스트 전략

### 8.1 현재 상태

- 수동 테스트 위주
- E2E 테스트 없음
- 유닛 테스트 없음

### 8.2 권장 테스트 구조

```
tests/
├── unit/              # 유닛 테스트
│   ├── utils/
│   └── hooks/
├── integration/       # 통합 테스트
│   └── api/
├── e2e/               # E2E 테스트 (Playwright)
│   ├── auth.spec.ts
│   ├── space.spec.ts
│   └── chat.spec.ts
└── fixtures/          # 테스트 데이터
```

### 8.3 E2E 시나리오 (Playwright)

| 시나리오 | 설명 |
|---------|------|
| 로그인 플로우 | 소셜 로그인 → 대시보드 |
| 게스트 입장 | 닉네임 입력 → 공간 입장 → 이동 |
| 채팅 기능 | 메시지 전송 → 수신 확인 → 귓속말 |
| 권한 테스트 | OWNER → STAFF 지정 → 강퇴 |
| 화상 통화 | 마이크/카메라 토글 → 화면 공유 |

---

## 9. 전체 완성도 평가

| 영역 | 완성도 | 상태 | 비고 |
|-----|--------|------|------|
| 인증 | 95% | ✅ | SSO 미구현 |
| 공간 관리 | 90% | ✅ | CSV 내보내기 미구현 |
| 멀티플레이어 | 95% | ✅ | Redis Adapter 미적용 |
| 음성/영상 | 95% | ✅ | - |
| 채팅 | 95% | ✅ | 2025-12-19 최적화 완료 |
| 권한 | 90% | ✅ | - |
| 대시보드 | 75% | ⚠️ | CSV 내보내기, 고급 필터 |
| 게임 엔진 | 85% | ✅ | 오브젝트 상호작용 미연결 |
| 반응형 | 30% | ❌ | 모바일 미지원 |
| 테스트 | 10% | ❌ | 수동 테스트만 |

**전체 MVP 완성도: ~85%**

---

## 10. 아키텍처 강점

1. **깔끔한 권한 분리**: SuperAdmin/OWNER/STAFF/PARTICIPANT 4단계
2. **유연한 채팅 타입**: MESSAGE/WHISPER/PARTY/SYSTEM/ANNOUNCEMENT
3. **맵 에디터 기반**: MapObject + 포탈 페어링으로 확장성 확보
4. **세션 보안**: 서버 파생 ID로 클라이언트 조작 방지
5. **최적화 완료**: Rate Limiting, 메모리 상한, 렌더 최적화

---

## 참고 자료

### 관련 문서
- PRD: `/docs/prd.md`
- DB 스키마: `/prisma/schema.prisma`
- 공간 모듈 가이드: `/src/features/space/claude.md`
- 서버 가이드: `/server/claude.md`

### 최근 변경 이력
| 날짜 | 작업 | 파일 |
|-----|------|------|
| 2025-12-19 | 채팅 최적화 Phase 1-4 | `usePastMessages.ts`, `socket-server.ts` |
| 2025-12-18 | 맵 에디터 시스템 | `MainScene.ts`, `/api/spaces/[id]/objects` |
| 2025-12-16 | 화면 공유 크롭 수정 | `VideoTile.tsx` |

---

*이 문서는 코드베이스 전수 조사(--ultrathink) 기반으로 작성되었습니다.*
*PRD 업데이트 후 동기화 필요.*
