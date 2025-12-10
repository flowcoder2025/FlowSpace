# Space 모듈 가이드 (핵심 모듈)

> **역할**: 2D 메타버스 공간 기능 - 게임 캔버스, 비디오/음성, 채팅, 실시간 동기화
> **상위**: `/src/features/claude.md` → `/CLAUDE.md`
>
> ⚠️ **핵심 모듈**: FlowSpace의 메인 기능을 담당하는 가장 중요한 모듈입니다.

---

## 1. 디렉토리 구조

```
/src/features/space
├── claude.md              # [현재 파일]
├── index.ts               # 통합 export
│
├── /components            # 📌 공간 전용 컴포넌트
│   ├── SpaceLayout.tsx    # 전체 레이아웃 (react-resizable-panels)
│   ├── SpaceHeader.tsx    # 상단 헤더
│   ├── /chat              # 📌 플로팅 채팅 시스템 (NEW)
│   │   ├── FloatingChatOverlay.tsx  # 게임 위 플로팅 채팅창
│   │   ├── ChatMessageList.tsx      # 스크롤 가능 메시지 목록
│   │   ├── ChatInputArea.tsx        # 채팅 입력 영역
│   │   └── index.ts
│   ├── /sidebar
│   │   └── ChatPanel.tsx  # 좌측 채팅 패널 (레거시, 미사용)
│   ├── /video
│   │   ├── ParticipantPanel.tsx  # 우측 참가자 비디오 그리드
│   │   ├── VideoTile.tsx         # 개별 비디오 타일 (z-index 수정)
│   │   ├── ScreenShare.tsx       # 화면 공유 오버레이 (z-index 수정)
│   │   └── index.ts
│   ├── /game
│   │   └── GameCanvas.tsx        # Phaser 캔버스 래퍼
│   └── /controls
│       └── ControlBar.tsx        # 하단 컨트롤 바
│
├── /game                  # 📌 Phaser 게임 엔진
│   ├── PhaserGame.tsx     # Phaser 인스턴스 React 래퍼
│   ├── config.ts          # Phaser 설정
│   ├── events.ts          # 게임-React 이벤트 브릿지
│   ├── /scenes
│   │   └── MainScene.ts   # 메인 게임 씬
│   ├── /sprites
│   │   └── CharacterSprite.ts  # 캐릭터 스프라이트
│   ├── /tiles
│   │   └── TileSystem.ts       # 타일맵 렌더링
│   ├── /objects
│   │   └── InteractiveObject.ts # 상호작용 오브젝트
│   └── index.ts
│
├── /livekit               # 📌 LiveKit 연동 (음성/영상)
│   ├── LiveKitRoomProvider.tsx  # 토큰 페칭 + 컨텍스트
│   ├── LiveKitMediaContext.tsx  # 미디어 상태 컨텍스트
│   ├── useLiveKit.ts            # 레거시 훅 (하위 호환)
│   ├── useLiveKitMedia.ts       # 컨텍스트 기반 훅
│   ├── types.ts
│   └── index.ts
│
├── /socket                # 📌 Socket.io 연동 (실시간 동기화)
│   ├── useSocket.ts       # Socket.io 훅
│   ├── types.ts           # 이벤트 타입 정의
│   └── index.ts
│
├── /hooks                 # 📌 공간 관련 훅
│   ├── useChatMode.ts     # 채팅 모드 상태 관리 (NEW)
│   ├── useChatDrag.ts     # 채팅창 드래그/리사이즈 (NEW)
│   ├── useFullscreen.ts   # 전체화면 상태 감지 (NEW)
│   └── index.ts
│
└── /types
    └── space.types.ts     # 공간 관련 타입
```

---

## 2. 아키텍처 개요

### 2.1 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                      SpaceLayout                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              LiveKitRoomProvider                      │   │
│  │  (토큰 페칭 → LiveKitRoom 컨텍스트 제공)              │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │           SpaceLayoutContent                    │  │   │
│  │  │  ├── useSocket (위치/채팅 동기화)               │  │   │
│  │  │  ├── useLiveKitMedia (음성/영상 제어)           │  │   │
│  │  │  └── 컴포넌트들 렌더링                          │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 실시간 통신 레이어

| 레이어 | 기술 | 역할 | 포트 |
|-------|------|------|------|
| 위치/채팅 | Socket.io | 플레이어 위치 동기화, 채팅 | 3001 |
| 음성/영상 | LiveKit | WebRTC 미디어 스트림 | 7880 |

### 2.3 🔒 보안 아키텍처

```
클라이언트 요청 → 서버 세션 검증 → 서버 파생 ID 반환
                       ↓
              클라이언트는 서버 ID 사용
```

**핵심 원칙**:
- 클라이언트가 보낸 `playerId`/`participantId`를 신뢰하지 않음
- 서버에서 세션 검증 후 파생된 ID를 사용
- `effectivePlayerId` / `effectiveParticipantId`로 통합

---

## 3. 주요 컴포넌트 상세

### 3.1 SpaceLayout.tsx

**역할**: 전체 레이아웃 컨테이너 + 상태 통합

**Props**:
```tsx
interface SpaceLayoutProps {
  spaceId: string
  spaceName: string
  spaceLogoUrl?: string | null
  spacePrimaryColor?: string | null
  userNickname: string
  userId: string
  userAvatarColor?: AvatarColor
  sessionToken?: string  // 🔒 게스트 세션 토큰
  onExit: () => void
}
```

**구조**:
```
SpaceLayout
├── LiveKitRoomProvider (컨텍스트)
└── SpaceLayoutContent
    ├── SpaceHeader
    ├── PanelGroup
    │   ├── ChatPanel (좌측, 리사이즈)
    │   ├── GameCanvas (중앙)
    │   └── ParticipantPanel (우측, 리사이즈)
    ├── ControlBar
    └── ScreenShareOverlay (조건부)
```

### 3.2 VideoTile.tsx

**역할**: 개별 참가자 비디오 렌더링

**기능**:
- 비디오/오디오 트랙 렌더링
- 음소거 상태 표시
- 발화 중 표시 (isSpeaking)
- 풀스크린/PIP 모드

### 3.3 ControlBar.tsx

**역할**: 하단 미디어 컨트롤

**버튼**:
| 버튼 | 기능 | 상태 |
|-----|------|------|
| 마이크 | 음성 on/off | `isMicOn` |
| 카메라 | 영상 on/off | `isCameraOn` |
| 화면공유 | 화면 공유 토글 | `isScreenSharing` |
| 채팅 | 채팅 패널 토글 | `isChatOpen` |
| 참가자 | 참가자 패널 토글 | `isParticipantsOpen` |

### 3.4 FloatingChatOverlay.tsx (NEW - 2025-12-10)

**역할**: 게임 캔버스 위 플로팅 채팅 시스템

**특징**:
- 반투명 배경의 드래그 가능한 채팅창
- Enter 키로 채팅 모드 활성화/비활성화
- 전체화면 모드에서도 Portal을 통해 표시
- 리사이즈 가능 (우하단 핸들)

**구조**:
```
FloatingChatOverlay
├── 헤더 바 (드래그 핸들, 조건부 표시)
├── ChatMessageList (스크롤 가능)
│   ├── 시스템 안내 메시지 (조작 가이드)
│   └── 채팅 메시지들
├── ChatInputArea (활성화 시만 표시)
└── 리사이즈 핸들
```

**채팅 모드 상태**:
| 상태 | 게임 입력 | 채팅 입력 | 헤더 표시 |
|-----|----------|----------|----------|
| INACTIVE | ✅ 활성 | ❌ 비활성 | 5초 후 숨김 |
| ACTIVE | ❌ 차단 | ✅ 활성 | ✅ 표시 |

**시스템 안내 메시지**:
```
"WASD 또는 방향키로 이동 · Space로 점프 · E로 상호작용"
```

**전체화면 모드 처리**:
- `useFullscreen` 훅으로 전체화면 상태 감지
- 전체화면 시 `position: absolute` 사용 (fixed는 fullscreen 컨텍스트에서 제한)
- React Portal로 전체화면 요소 내부에 렌더링

---

## 4. 훅(Hooks) 상세

### 4.1 useSocket

**역할**: Socket.io 연결 및 이벤트 관리

```tsx
const {
  isConnected,      // 연결 상태
  players,          // Map<playerId, PlayerPosition>
  socketError,      // 에러 상태
  effectivePlayerId, // 🔒 서버 파생 ID
  sendMessage,      // 채팅 메시지 전송
  updatePosition,   // 위치 업데이트
} = useSocket({
  spaceId,
  playerId,
  nickname,
  avatarColor,
  sessionToken,     // 🔒 세션 검증용
  onChatMessage,
  onSystemMessage,
})
```

### 4.2 useLiveKitMedia (권장)

**역할**: @livekit/components-react 기반 미디어 제어

```tsx
const {
  mediaState,           // { isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled }
  mediaError,           // 에러 상태
  participantTracks,    // Map<participantId, ParticipantTrack>
  localParticipantId,   // 로컬 참가자 ID
  toggleCamera,
  toggleMicrophone,
  toggleScreenShare,
} = useLiveKitMedia()
```

### 4.3 useLiveKit (레거시)

**역할**: 하위 호환용 레거시 훅

> ⚠️ 새 코드에서는 `useLiveKitMedia` 사용 권장

### 4.4 useChatMode (NEW - 2025-12-10)

**역할**: 채팅 모드 상태 관리 + Phaser 이벤트 연동

```tsx
const { isActive, toggleMode, activate, deactivate } = useChatMode()
```

**동작**:
- `isActive`: 채팅 입력 활성화 여부
- `toggleMode`: Enter 키로 모드 전환
- `deactivate`: ESC 또는 메시지 전송 후 비활성화
- 상태 변경 시 `eventBridge.emit(CHAT_FOCUS_CHANGED)` 자동 호출

### 4.5 useChatDrag (NEW - 2025-12-10)

**역할**: 채팅창 드래그 이동 + 리사이즈 + localStorage 저장

```tsx
const { position, size, isDragging, isResizing, handleMoveStart, handleResizeStart } = useChatDrag()
```

**기능**:
- 마우스 드래그로 위치 이동
- 우하단 핸들로 크기 조절
- localStorage에 위치/크기 저장 (새로고침 후에도 유지)

### 4.6 useFullscreen (NEW - 2025-12-10)

**역할**: 브라우저 전체화면 상태 감지

```tsx
const { isFullscreen, fullscreenElement } = useFullscreen()
```

**용도**:
- 전체화면 진입/종료 감지
- Portal 렌더링 대상 요소 제공

---

## 5. 게임 엔진 (Phaser 3)

### 5.1 PhaserGame.tsx

**역할**: Phaser 인스턴스를 React 컴포넌트로 래핑

**주의사항**:
- `useEffect` 클린업에서 `game.destroy()` 필수
- React Strict Mode 대응 (이중 마운트 처리)

### 5.2 MainScene.ts

**역할**: 메인 게임 씬

**기능**:
- 타일맵 로드 및 렌더링
- 캐릭터 생성 및 이동
- 카메라 추적
- 상호작용 오브젝트 관리

### 5.3 eventBridge

**역할**: Phaser ↔ React 이벤트 통신

```tsx
// React에서 게임으로 이벤트 전달
eventBridge.emit(GameEvents.PLAYER_MOVE, position)

// React에서 게임 이벤트 수신
eventBridge.on(GameEvents.PLAYER_MOVED, callback)
```

---

## 6. 관련 API 라우트

| 라우트 | 메서드 | 역할 |
|-------|-------|------|
| `/api/livekit/token` | POST | LiveKit 토큰 발급 (🔒 세션 검증) |
| `/api/guest/verify` | POST | 게스트 세션 검증 |
| `/api/guest` | POST | 게스트 세션 생성 |
| `/api/guest/exit` | POST | 게스트 세션 종료 |
| `/api/spaces/[id]` | GET | 공간 정보 조회 |

---

## 7. 알려진 이슈

### 7.1 비디오 기능 문제 (⚠️ 분석 필요)
- **증상**: [사용자가 보고한 구체적 증상 파악 필요]
- **영향 범위**: LiveKit 연동, VideoTile
- **상태**: 분석 예정

### 7.2 아바타 색상 검증 (✅ 해결됨 - 2025-12-09)

**문제**:
- Google 로그인 사용자의 `avatarColor`가 프로필 이미지 URL로 설정됨
- Phaser에서 `character-https://...` 텍스처 키를 찾지 못해 "Missing Texture" 발생

**근본 원인**:
```tsx
// ❌ 잘못된 코드 - authSession.user.image는 Google 프로필 URL
avatar: authSession.user.image || "default"
```

**해결책 (page.tsx)**:
```tsx
// ✅ 아바타 색상 유효성 검사 헬퍼
const VALID_AVATAR_COLORS = ["default", "red", "green", "purple", "orange", "pink"] as const
type LocalAvatarColor = typeof VALID_AVATAR_COLORS[number]

function isValidAvatarColor(value: unknown): value is LocalAvatarColor {
  return typeof value === "string" && VALID_AVATAR_COLORS.includes(value as LocalAvatarColor)
}

function getSafeAvatarColor(value: unknown): LocalAvatarColor {
  return isValidAvatarColor(value) ? value : "default"
}

// ✅ 사용 예시
const safeAvatar = getSafeAvatarColor(authSession.user.image)  // "default" 반환
```

**영향 범위**:
- `/src/app/space/[id]/page.tsx` - 진입점 수정
- 로그인 사용자 및 게스트 모두 적용

---

## 8. 개발 가이드

### 8.1 로컬 개발

```bash
npm run dev:all    # Next.js + Socket.io + LiveKit 동시 실행
```

**필요한 서비스**:
- Next.js (포트 3000)
- Socket.io (포트 3001)
- LiveKit 개발 서버 (포트 7880)

### 8.2 테스트 URL

```
http://localhost:3000/space/test?dev=true
```

### 8.3 디버깅

**Socket.io 디버깅**:
```bash
DEBUG=socket.io* npm run socket:dev
```

**LiveKit 로그**:
```tsx
// useLiveKit.ts에서 IS_DEV=true일 때 자동으로 콘솔 로그 출력
```

---

## 9. 금지 사항

- ❌ 클라이언트 ID를 서버에서 검증 없이 신뢰 금지
- ❌ 게임 상태를 직접 조작 금지 (eventBridge 사용)
- ❌ LiveKit Room 직접 생성 금지 (LiveKitRoomProvider 사용)
- ❌ Socket.io 이벤트 타입 정의 없이 사용 금지

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2025-12-08 | 초기 생성 - 현재 구현 상태 반영 |
| 2025-12-09 | 아바타 색상 검증 이슈 해결 문서화 (7.2절 추가) |
| 2025-12-10 | 플로팅 채팅 시스템 추가 (FloatingChatOverlay, useChatMode, useChatDrag, useFullscreen) |
| 2025-12-10 | 전체화면 모드 채팅 오버레이 지원 (Portal, z-index 수정) |
| 2025-12-10 | 시스템 안내 메시지 추가 (조작 가이드: WASD, Space, E키) |
