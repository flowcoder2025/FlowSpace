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
│   ├── /chat              # 📌 플로팅 채팅 시스템
│   │   ├── FloatingChatOverlay.tsx  # 게임 위 플로팅 채팅창
│   │   ├── ChatTabs.tsx             # 전체/귓속말/파티 탭
│   │   ├── ChatMessageList.tsx      # 스크롤 가능 메시지 목록
│   │   ├── ChatInputArea.tsx        # 채팅 입력 영역
│   │   └── index.ts
│   ├── /settings          # 📌 미디어 설정 시스템 (NEW - 2026-01)
│   │   ├── MediaSettingsModal.tsx   # 메인 설정 모달 (탭 네비게이션)
│   │   ├── AudioSettingsTab.tsx     # 음성 설정 탭
│   │   ├── VideoSettingsTab.tsx     # 비디오 설정 탭
│   │   ├── DeviceSelector.tsx       # 장치 선택 드롭다운
│   │   ├── VolumeMeter.tsx          # 실시간 볼륨 미터
│   │   ├── MicrophoneTest.tsx       # 마이크 테스트 (녹음/재생)
│   │   ├── CameraPreview.tsx        # 카메라 미리보기
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
│       └── ControlBar.tsx        # 하단 컨트롤 바 (설정 메뉴 포함)
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
│   ├── useChatMode.ts     # 채팅 모드 상태 관리
│   ├── useChatDrag.ts     # 채팅창 드래그/리사이즈
│   ├── useChatStorage.ts  # 채팅 메시지 영속성
│   ├── useFullscreen.ts   # 전체화면 상태 감지
│   ├── useNotificationSound.ts  # 알림 사운드
│   ├── useMediaDevices.ts # 미디어 장치 관리 (Option C: 지연된 권한 요청)
│   ├── useAudioSettings.ts # 📌 오디오 설정 관리 (NEW - 2026-01)
│   ├── useVideoSettings.ts # 📌 비디오 설정 관리 (NEW - 2026-01)
│   ├── useVolumeMeter.ts  # 📌 실시간 볼륨 측정 (NEW - 2026-01)
│   └── index.ts
│
└── /types
    ├── space.types.ts     # 공간 관련 타입
    └── media-settings.types.ts # 📌 미디어 설정 타입 (NEW - 2026-01)
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
- 🔧 화면 공유 시 `object-contain` 적용 (크롭 방지)

**화면 공유 처리**:
```tsx
// 화면 공유는 object-contain (잘리지 않음), 일반 비디오는 object-cover (꽉 채움)
className={cn(
  "absolute inset-0 size-full z-0",
  isScreenShare ? "object-contain bg-black" : "object-cover",
  ...
)}
```

> ⚠️ **참고**: 본인의 화면 공유는 `ScreenShareOverlay`가 아닌 `VideoTile`에서 렌더링됩니다.
> `SpaceLayout`에서 `activeScreenShare.participantId !== resolvedUserId` 조건으로 타인의 화면만 오버레이로 표시합니다.

### 3.3 ControlBar.tsx

**역할**: 하단 미디어 컨트롤

**버튼**:
| 버튼 | 기능 | 상태 |
|-----|------|------|
| 마이크 | 음성 on/off + 장치 선택 드롭다운 | `isMicOn` |
| 카메라 | 영상 on/off + 장치 선택 드롭다운 | `isCameraOn` |
| 화면공유 | 화면 공유 토글 | `isScreenSharing` |
| 채팅 | 채팅 패널 토글 | `isChatOpen` |
| 참가자 | 참가자 패널 토글 | `isParticipantsOpen` |

**미디어 설정 메뉴** (2026-01 추가):
- 마이크/카메라 드롭다운에 "음성 및 비디오 설정" 메뉴 추가
- 설정 아이콘(⚙️)으로 `MediaSettingsModal` 열기
- 마이크 버튼 → 음성 탭, 카메라 버튼 → 비디오 탭 기본 선택

### 3.6 MediaSettingsModal (NEW - 2026-01)

**역할**: 디스코드 스타일 미디어 설정 모달

**구조**:
```
MediaSettingsModal
├── 탭 네비게이션 (음성/비디오)
├── AudioSettingsTab
│   ├── DeviceSelector (입력/출력 장치)
│   ├── VolumeMeter (실시간 볼륨)
│   ├── 음성 처리 토글 (잡음/에코/게인/음성분리)
│   ├── 입력 감도 슬라이더
│   └── MicrophoneTest (녹음/재생)
├── VideoSettingsTab
│   ├── DeviceSelector (카메라)
│   ├── CameraPreview (미리보기)
│   ├── 해상도 프리셋 (480p/720p/1080p)
│   ├── 프레임레이트 (15/24/30/60fps)
│   └── 미러 모드 토글
└── 하단 버튼 (기본값 복원/완료)

### 3.4 ChatTabs.tsx (NEW - 2025-12-11)

**역할**: 채팅 탭 전환 UI (전체/귓속말/파티)

**탭 종류**:
| 탭 | MessageType | 설명 |
|---|-------------|------|
| 전체 | message | 공개 채팅 |
| 귓속말 | whisper | 1:1 비밀 대화 |
| 파티 | party | 파티원 전용 |

**기능**:
- 읽지 않은 메시지 뱃지 표시
- 탭별 메시지 필터링
- 활성 탭 상태 관리

### 3.5 FloatingChatOverlay.tsx

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

### 4.6 useFullscreen

**역할**: 브라우저 전체화면 상태 감지

```tsx
const { isFullscreen, fullscreenElement } = useFullscreen()
```

**용도**:
- 전체화면 진입/종료 감지
- Portal 렌더링 대상 요소 제공

### 4.7 useChatStorage (NEW - 2025-12-11)

**역할**: 채팅 메시지 영속성 관리

```tsx
const { messages, addMessage, clearMessages } = useChatStorage(spaceId)
```

**기능**:
- localStorage 기반 메시지 저장
- 공간별 메시지 분리 저장
- 세션 간 채팅 기록 유지

### 4.8 useNotificationSound (NEW - 2025-12-11)

**역할**: 채팅 알림 사운드 재생

```tsx
const { playNotification } = useNotificationSound()
```

**용도**:
- 새 메시지 수신 시 사운드 재생
- 귓속말/멘션 시 강조 알림

### 4.9 useMediaDevices (Option C - 2026-01 개선)

**역할**: 미디어 장치 (카메라/마이크) 관리 + 지연된 권한 요청

```tsx
const {
  audioInputDevices,      // 마이크 목록
  audioOutputDevices,     // 스피커 목록
  videoInputDevices,      // 카메라 목록
  selectedAudioInput,     // 선택된 마이크
  selectedVideoInput,     // 선택된 카메라
  selectedAudioOutput,    // 선택된 스피커
  selectAudioInput,       // 마이크 선택 함수
  selectVideoInput,       // 카메라 선택 함수
  selectAudioOutput,      // 스피커 선택 함수
  requestPermission,      // 📌 권한 요청 (설정 열 때 호출)
  hasPermission,          // 📌 권한 획득 여부
  isLoading,
  error,
} = useMediaDevices()
```

**Option C (지연된 권한 요청)**:
- 마운트 시 `getUserMedia` 호출하지 않음 (iOS Safari 호환성)
- 설정 드롭다운 열 때 `requestPermission()` 호출
- 권한 획득 후 장치 label 포함된 목록 갱신

### 4.10 useAudioSettings (NEW - 2026-01)

**역할**: 오디오 설정 관리 + localStorage 영속성

```tsx
const {
  settings,               // AudioSettings 전체
  audioCaptureOptions,    // LiveKit AudioCaptureOptions로 변환
  toggleNoiseSuppression, // 잡음 제거 토글
  toggleEchoCancellation, // 에코 제거 토글
  toggleAutoGainControl,  // 자동 게인 토글
  toggleVoiceIsolation,   // 음성 분리 토글 (실험적)
  setInputVolume,         // 입력 볼륨 (0-100)
  setOutputVolume,        // 출력 볼륨 (0-100)
  setInputSensitivity,    // 입력 감도 임계값
  setInputDevice,         // 입력 장치 선택
  setOutputDevice,        // 출력 장치 선택
  resetToDefaults,        // 기본값 복원
} = useAudioSettings()
```

**설정 항목**:
| 옵션 | 기본값 | LiveKit 옵션 |
|-----|-------|--------------|
| noiseSuppression | true | AudioCaptureOptions.noiseSuppression |
| echoCancellation | true | AudioCaptureOptions.echoCancellation |
| autoGainControl | true | AudioCaptureOptions.autoGainControl |
| voiceIsolation | false | 실험적 기능 |
| inputVolume | 100 | - |
| outputVolume | 100 | - |
| inputSensitivity | 30 | VAD threshold |

### 4.11 useVideoSettings (NEW - 2026-01)

**역할**: 비디오 설정 관리 + localStorage 영속성

```tsx
const {
  settings,              // VideoSettings 전체
  videoCaptureOptions,   // LiveKit VideoCaptureOptions로 변환
  setResolution,         // 해상도 프리셋 (480p/720p/1080p)
  setFrameRate,          // 프레임레이트 (15/24/30/60)
  setFacingMode,         // 카메라 방향 (user/environment)
  toggleMirrorMode,      // 미러 모드 토글
  setVideoDevice,        // 카메라 선택
  resetToDefaults,       // 기본값 복원
} = useVideoSettings()
```

**해상도 프리셋**:
| 프리셋 | 해상도 | 용도 |
|-------|-------|------|
| 480p | 640x480 | 저대역폭 |
| 720p | 1280x720 | 기본 (권장) |
| 1080p | 1920x1080 | 고화질 |

### 4.12 useVolumeMeter (NEW - 2026-01)

**역할**: Web Audio API 기반 실시간 볼륨 측정

```tsx
const {
  volume,    // 현재 볼륨 레벨 (0-100)
  start,     // 측정 시작 (deviceId 또는 MediaStream)
  stop,      // 측정 중지
  isActive,  // 측정 활성화 여부
  error,     // 에러 상태
} = useVolumeMeter()
```

**동작 원리**:
- AnalyserNode로 오디오 레벨 분석
- RMS (Root Mean Square) 계산
- requestAnimationFrame 기반 60fps 업데이트
- 외부 MediaStream 또는 deviceId로 시작 가능

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

### 7.1 화면 공유 크롭 문제 (✅ 해결됨 - 2025-12-16)

**문제**:
- 큰 모니터에서 화면 공유 시 영상이 잘려 보임 (aspect ratio 문제)
- `object-cover`로 인해 비디오가 컨테이너에 맞춰 크롭됨

**해결책 (VideoTile.tsx)**:
```tsx
// 화면 공유는 object-contain (잘리지 않음), 일반 비디오는 object-cover (꽉 채움)
className={cn(
  "absolute inset-0 size-full z-0",
  isScreenShare ? "object-contain bg-black" : "object-cover",
  ...
)}
```

**영향 범위**:
- `VideoTile.tsx` - 화면 공유 렌더링 스타일 변경
- 본인 화면 공유는 VideoTile에서, 타인 화면 공유는 ScreenShareOverlay에서 렌더링

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
| 2025-12-11 | 귓속말/파티 시스템 추가 (ChatTabs, whisper/party 이벤트) |
| 2025-12-11 | 추가 훅 문서화 (useChatStorage, useNotificationSound, useMediaDevices) |
| 2025-12-16 | 화면 공유 크롭 문제 해결 (VideoTile object-contain 적용) |
| 2026-01-06 | 📌 미디어 설정 시스템 추가 (디스코드 스타일 설정 패널) |
| 2026-01-06 | - /components/settings 폴더: MediaSettingsModal, Audio/VideoSettingsTab 등 7개 컴포넌트 |
| 2026-01-06 | - 새 훅: useAudioSettings, useVideoSettings, useVolumeMeter |
| 2026-01-06 | - useMediaDevices Option C 적용 (지연된 권한 요청 - iOS Safari 호환) |
| 2026-01-06 | - LiveKitRoomProvider: audioCaptureDefaults/videoCaptureDefaults 동적 적용 |
| 2026-01-06 | - ControlBar: 마이크/카메라 드롭다운에 설정 메뉴 추가 |
