# FlowSpace 아키텍처

> **프로젝트**: ZEP-감성 2D 메타버스 MVP
> **기술 스택**: Phaser 3 + Socket.io + LiveKit + Next.js 15

---

## 1. 시스템 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        FlowSpace Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Next.js    │  │  Socket.io   │  │   LiveKit    │          │
│  │   (3000)     │  │   (3001)     │  │   (7880)     │          │
│  │              │  │              │  │              │          │
│  │  • 인증/권한  │  │  • 위치동기화 │  │  • 음성/영상  │          │
│  │  • API 라우트 │  │  • 채팅      │  │  • 화면공유   │          │
│  │  • 대시보드   │  │  • 세션검증  │  │  • WebRTC    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Phaser 3 Game Engine                   │   │
│  │   • 2D 맵 렌더링 • 캐릭터 이동 • 상호작용 오브젝트        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase PostgreSQL + Prisma                 │   │
│  │   • User • Space • Template • GuestSession • EventLog    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 기술 스택

### 2.1 Frontend Layer

| 기술 | 버전 | 역할 |
|-----|------|------|
| Next.js | 15 | App Router, RSC |
| React | 19 | UI 컴포넌트 |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 4 | 스타일링 |
| shadcn/ui | latest | UI 컴포넌트 라이브러리 |

### 2.2 Game Layer

| 기술 | 역할 |
|-----|------|
| Phaser 3 | 2D 게임 엔진, 맵/캐릭터 렌더링 |
| react-resizable-panels | ZEP 스타일 리사이즈 패널 |
| @dnd-kit/core | 드래그 가능 비디오 |

### 2.3 Real-time Layer

| 기술 | 포트 | 역할 |
|-----|------|------|
| Socket.io | 3001 | 위치/채팅 동기화 |
| LiveKit | 7880 | WebRTC 음성/영상 |

### 2.4 Backend Layer

| 기술 | 역할 |
|-----|------|
| Prisma | ORM, 스키마 관리 |
| Supabase | PostgreSQL 호스팅 |
| NextAuth.js | 인증 (OAuth) |

---

## 3. 핵심 데이터 모델

```
User ─────────┬───── Space ─────────── Template
              │         │
              │         ├── SpaceBranding
              │         ├── SpaceAccessPolicy
              │         └── SpaceEventLog
              │
              └───── GuestSession
```

### 주요 엔티티

| 엔티티 | 역할 |
|-------|------|
| User | 인증된 사용자 (OAuth) |
| Space | 메타버스 공간 (월드) |
| Template | 맵 템플릿 (오피스, 강의실, 라운지) |
| GuestSession | 게스트 세션 (임시 사용자) |
| SpaceEventLog | 이벤트 로그 (입장, 퇴장, 상호작용) |

---

## 4. 보안 아키텍처

### 4.1 서버 파생 ID 패턴

```
클라이언트 요청 (playerId, sessionToken)
            ↓
    서버 세션 검증 (/api/guest/verify)
            ↓
    서버 파생 ID 반환 (effectivePlayerId)
            ↓
    이후 모든 이벤트에서 서버 ID 강제 사용
```

### 4.2 ID 흐름

| 레이어 | ID 종류 | 소스 |
|-------|--------|------|
| Socket.io | playerId | 서버 검증 (`socket.data.playerId`) |
| LiveKit | participantId | API 토큰 발급 시 서버에서 결정 |
| 프론트엔드 | effectivePlayerId | 서버에서 받은 ID 사용 |

---

## 5. 컴포넌트 아키텍처

### 5.1 Space 진입 흐름

```
/space/[id]/page.tsx
        ↓
    SpaceLayout
        ├── LiveKitRoomProvider (토큰 페칭 + 컨텍스트)
        └── SpaceLayoutContent
                ├── useSocket() (위치/채팅)
                ├── useLiveKitMedia() (음성/영상)
                │
                ├── SpaceHeader
                ├── PanelGroup
                │   ├── ChatPanel (좌측, 리사이즈)
                │   ├── GameCanvas (중앙)
                │   └── ParticipantPanel (우측, 리사이즈)
                ├── ControlBar (하단)
                └── ScreenShareOverlay (조건부)
```

### 5.2 Phaser-React 통합

```
PhaserGame.tsx
    ├── Phaser.Game 인스턴스 관리
    ├── useEffect 클린업 (game.destroy)
    └── eventBridge
            ├── React → Phaser: PLAYER_MOVE, SET_PLAYERS
            └── Phaser → React: PLAYER_MOVED, OBJECT_INTERACT
```

---

## 6. API 라우트

### 6.1 인증/세션

| 라우트 | 메서드 | 역할 |
|-------|-------|------|
| `/api/auth/[...nextauth]` | * | NextAuth 핸들러 |
| `/api/guest` | POST | 게스트 세션 생성 |
| `/api/guest/verify` | POST | 세션 검증 |
| `/api/guest/exit` | POST | 세션 종료 |

### 6.2 공간 관리

| 라우트 | 메서드 | 역할 |
|-------|-------|------|
| `/api/spaces` | GET/POST | 공간 목록/생성 |
| `/api/spaces/[id]` | GET/PATCH/DELETE | 공간 조회/수정/삭제 |
| `/api/livekit/token` | POST | LiveKit 토큰 발급 |

### 6.3 관리자

| 라우트 | 메서드 | 역할 |
|-------|-------|------|
| `/api/admin/spaces` | GET | 공간 통계 |
| `/api/admin/logs` | GET | 이벤트 로그 |

---

## 7. 실시간 이벤트

### 7.1 Socket.io 이벤트

**클라이언트 → 서버**:
| 이벤트 | 페이로드 |
|-------|---------|
| `join:space` | `{ spaceId, playerId, nickname, avatarColor, sessionToken }` |
| `leave:space` | - |
| `player:move` | `PlayerPosition` |
| `chat:message` | `{ content }` |

**서버 → 클라이언트**:
| 이벤트 | 페이로드 |
|-------|---------|
| `room:joined` | `{ spaceId, players, yourPlayerId }` |
| `player:joined` | `PlayerPosition` |
| `player:left` | `{ id }` |
| `player:moved` | `PlayerPosition` |
| `chat:message` | `ChatMessageData` |

### 7.2 LiveKit 트랙

| 트랙 종류 | 용도 |
|----------|------|
| Camera | 비디오 스트림 |
| Microphone | 오디오 스트림 |
| ScreenShare | 화면 공유 |

---

## 8. 개발 환경

### 8.1 로컬 실행

```bash
npm run dev:all    # Next.js + Socket.io + LiveKit 동시 실행
```

### 8.2 서비스 포트

| 서비스 | 포트 | URL |
|-------|------|-----|
| Next.js | 3000 | http://localhost:3000 |
| Socket.io | 3001 | ws://localhost:3001 |
| LiveKit | 7880 | ws://localhost:7880 |

### 8.3 테스트 URL

```
http://localhost:3000/space/test?dev=true
```

---

## 9. 문서 참조

| 영역 | 문서 위치 |
|-----|----------|
| 전역 원칙 | `/CLAUDE.md` |
| Space 모듈 | `/src/features/space/claude.md` |
| Socket 서버 | `/server/claude.md` |
| PRD | `/docs/PRD.md` |

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2025-12-08 | 초기 생성 - Phase 1-4 완료 상태 반영 |
