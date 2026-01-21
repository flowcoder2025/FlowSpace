# ARCH - 시스템 아키텍처

> FlowSpace 플랫폼의 전체 시스템 아키텍처 정의

---

## 개요

Phaser 3 + Socket.io + LiveKit 기반 ZEP-감성 2D 메타버스 플랫폼

---

## 시스템 구성

```
┌─────────────────────────────────────────────────────────────────┐
│                        FlowSpace Platform                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Next.js    │  │  Socket.io   │  │   LiveKit    │          │
│  │   (3000)     │  │   (3001)     │  │   (7880)     │          │
│  │  • 인증/권한  │  │  • 위치동기화 │  │  • 음성/영상  │          │
│  │  • API 라우트 │  │  • 채팅      │  │  • WebRTC    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Phaser 3 Game Engine                   │   │
│  │   • 2D 맵 렌더링 • 캐릭터 이동 • 상호작용 오브젝트        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase PostgreSQL + Prisma                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: ARCH_FUNC_NEXTJS_PLATFORM

- **What**: Next.js 15 App Router 기반 플랫폼 레이어 (인증, API, 대시보드)
- **Evidence**:
  - code: `src/app/layout.tsx::RootLayout`
  - code: `src/lib/auth.ts::auth`
  - code: `src/lib/prisma.ts::prisma`

### Contract: ARCH_FUNC_PHASER_GAME

- **What**: Phaser 3 게임 엔진 통합 (2D 맵 렌더링, 캐릭터 이동)
- **Evidence**:
  - code: `src/features/space/game/PhaserGame.tsx::PhaserGame`
  - code: `src/features/space/game/scenes/MainScene.ts::MainScene`

### Contract: ARCH_FUNC_SOCKET_REALTIME

- **What**: Socket.io 실시간 동기화 (위치, 채팅, 세션)
- **Evidence**:
  - code: `server/socket-server.ts::io`
  - code: `src/features/space/socket/useSocket.ts::useSocket`

### Contract: ARCH_FUNC_LIVEKIT_MEDIA

- **What**: LiveKit WebRTC 음성/영상 통화
- **Evidence**:
  - code: `src/features/space/livekit/LiveKitRoomProvider.tsx::LiveKitRoomProvider`
  - code: `src/features/space/livekit/LiveKitMediaContext.tsx::LiveKitMediaInternalProvider`

### Contract: ARCH_FUNC_PRISMA_DB

- **What**: Prisma ORM 데이터베이스 관리
- **Evidence**:
  - code: `prisma/schema.prisma::User`
  - code: `prisma/schema.prisma::Space`
  - code: `src/lib/prisma.ts::prisma`

<!-- FUNCTIONAL:END -->

---

## 기술 스택

| 영역 | 기술 | 역할 |
|-----|------|------|
| Frontend | Next.js 15 + React 19 | 플랫폼 UI |
| Game | Phaser 3 | 2D 게임 엔진 |
| Real-time | Socket.io | 위치/채팅 동기화 |
| Video | LiveKit | WebRTC 음성/영상 |
| Database | Supabase + Prisma | 데이터 저장 |
| Auth | NextAuth.js | 인증/권한 |
| Deploy | Vercel + Oracle Cloud | 호스팅 |

---

## 데이터 모델

```
User ─────────┬───── Space ─────────── Template
              │         │
              │         ├── SpaceBranding
              │         ├── SpaceAccessPolicy
              │         └── SpaceEventLog
              │
              └───── GuestSession
```

---

## 참조

- 원본: `docs/architecture/flowspace.md`
- PRD: `docs/prd.md`

---

> **마이그레이션**: 2026-01-21 DocOps 자동 변환
