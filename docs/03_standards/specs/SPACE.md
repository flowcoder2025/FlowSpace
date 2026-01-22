# SPACE - 공간 관리 API 스펙

> 메타버스 공간 CRUD 및 관리 API

---

## 개요

공간 생성, 조회, 수정, 삭제 및 멤버/초대 관리 API

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: SPACE_API_CRUD

- **What**: 공간 CRUD API (생성, 조회, 수정, 삭제)
- **Evidence**:
  - code: `src/app/api/spaces/route.ts::POST`
  - code: `src/app/api/spaces/route.ts::GET`
  - code: `src/app/api/spaces/[id]/route.ts::GET`
  - code: `src/app/api/spaces/[id]/route.ts::PATCH`
  - code: `src/app/api/spaces/[id]/route.ts::DELETE`

### Contract: SPACE_API_JOIN

- **What**: 공간 입장 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/join/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceMember`

### Contract: SPACE_API_INVITE

- **What**: 초대 코드 기반 공간 접근 API
- **Evidence**:
  - code: `src/app/api/spaces/invite/[code]/route.ts::GET`
  - code: `prisma/schema.prisma`

### Contract: SPACE_API_VISIT

- **What**: 공간 방문 기록 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/visit/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: SPACE_API_MY_ROLE

- **What**: 현재 사용자의 공간 내 역할 조회 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/my-role/route.ts::GET`
  - code: `src/lib/space-auth.ts::SpaceMemberInfo`

### Contract: SPACE_API_MEMBERS

- **What**: 공간 멤버 관리 API (목록, 추가, 역할 변경)
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/route.ts::GET`
  - code: `src/app/api/spaces/[id]/members/route.ts::POST`

### Contract: SPACE_API_KICK

- **What**: 멤버 강퇴 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/[memberId]/kick/route.ts::POST`
  - code: `src/lib/space-permissions.ts::canManage`

### Contract: SPACE_API_MUTE

- **What**: 멤버 음소거 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/[memberId]/mute/route.ts::POST`
  - code: `src/lib/space-permissions.ts::hasPermission`

### Contract: SPACE_API_STAFF

- **What**: 스태프 관리 API (지정/해제)
- **Evidence**:
  - code: `src/app/api/spaces/[id]/staff/route.ts::POST`
  - code: `src/app/api/spaces/[id]/staff/[userId]/route.ts::DELETE`

### Contract: SPACE_API_OBJECTS

- **What**: 공간 오브젝트 관리 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/objects/route.ts::GET`
  - code: `src/app/api/spaces/[id]/objects/route.ts::POST`

### Contract: SPACE_API_ZONES

- **What**: 파티 존 관리 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/zones/route.ts::GET`
  - code: `src/app/api/spaces/[id]/zones/route.ts::POST`
  - code: `src/app/api/spaces/[id]/zones/[zoneId]/route.ts::PUT`
  - code: `src/app/api/spaces/[id]/zones/[zoneId]/route.ts::DELETE`

### Contract: SPACE_API_SPOTLIGHT

- **What**: 스포트라이트 관리 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/spotlight/route.ts::GET`
  - code: `src/app/api/spaces/[id]/spotlight/activate/route.ts::POST`

### Contract: SPACE_API_MESSAGES

- **What**: 채팅 메시지 API (히스토리 조회, 삭제)
- **Evidence**:
  - code: `src/app/api/spaces/[id]/messages/route.ts::GET`
  - code: `src/app/api/spaces/[id]/messages/[messageId]/route.ts::DELETE`

### Contract: SPACE_API_MY_SPACES

- **What**: 내 참여 공간 목록 API
- **Evidence**:
  - code: `src/app/api/my-spaces/route.ts::GET`

### Contract: SPACE_API_TEMPLATES

- **What**: 공간 템플릿 목록 API
- **Evidence**:
  - code: `src/app/api/templates/route.ts::GET`
  - code: `prisma/schema.prisma::TemplateKey`

### Contract: SPACE_COMP_LAYOUT

- **What**: SpaceLayout 전체 레이아웃 컴포넌트
- **Evidence**:
  - code: `src/features/space/components/SpaceLayout.tsx`
  - code: `src/features/space/components/SpaceHeader.tsx`

### Contract: SPACE_COMP_VIDEO_TILE

- **What**: VideoTile 개별 비디오 타일
- **Evidence**:
  - code: `src/features/space/components/video/VideoTile.tsx`
  - code: `src/features/space/components/video/ParticipantPanel.tsx`
  - code: `src/features/space/components/video/ScreenShare.tsx`

### Contract: SPACE_COMP_CONTROL_BAR

- **What**: ControlBar 하단 미디어 컨트롤
- **Evidence**:
  - code: `src/features/space/components/controls/ControlBar.tsx`

### Contract: SPACE_COMP_CHAT_OVERLAY

- **What**: FloatingChatOverlay 게임 위 플로팅 채팅
- **Evidence**:
  - code: `src/features/space/components/chat/FloatingChatOverlay.tsx`
  - code: `src/features/space/components/chat/ChatTabs.tsx`
  - code: `src/features/space/components/chat/ChatMessageList.tsx`
  - code: `src/features/space/components/chat/ChatInputArea.tsx`

### Contract: SPACE_COMP_MEDIA_SETTINGS

- **What**: MediaSettingsModal 디스코드 스타일 설정
- **Evidence**:
  - code: `src/features/space/components/settings/MediaSettingsModal.tsx`
  - code: `src/features/space/components/settings/AudioSettingsTab.tsx`
  - code: `src/features/space/components/settings/VideoSettingsTab.tsx`
  - code: `src/features/space/components/settings/DeviceSelector.tsx`
  - code: `src/features/space/components/settings/VolumeMeter.tsx`

### Contract: SPACE_HOOK_SOCKET

- **What**: useSocket Socket.io 연결 훅
- **Rules**:
  - 재연결 시 `gameReadyRef`, `pendingPlayersRef` 리셋 필수
  - `handleGameReady`에서 pending 큐 + players Map 양방향 동기화
  - Race Condition 방지: GAME_READY와 room:joined 순서 역전 대응
- **Evidence**:
  - code: `src/features/space/socket/useSocket.ts::handleGameReady`
  - code: `src/features/space/socket/types.ts`

### Contract: SPACE_HOOK_CHAT_MODE

- **What**: useChatMode 채팅 모드 상태 관리
- **Evidence**:
  - code: `src/features/space/hooks/useChatMode.ts`
  - code: `src/features/space/hooks/useChatDrag.ts`
  - code: `src/features/space/hooks/useChatStorage.ts`

### Contract: SPACE_HOOK_PROXIMITY

- **What**: useProximitySubscription 7x7 근접 통신 구독
- **Evidence**:
  - code: `src/features/space/livekit/useProximitySubscription.ts`

### Contract: SPACE_HOOK_PARTY_ZONE

- **What**: usePartyZone 파티 존 감지/관리
- **Evidence**:
  - code: `src/features/space/hooks/usePartyZone.ts`

### Contract: SPACE_UTIL_CHAT_PARSER

- **What**: chatParser 채팅 명령어 파싱
- **Evidence**:
  - code: `src/features/space/utils/chatParser.ts`
  - code: `src/features/space/utils/commandHints.ts`

<!-- FUNCTIONAL:END -->

---

## 엔드포인트 요약

| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/api/spaces` | 공간 목록/생성 |
| GET/PATCH/DELETE | `/api/spaces/[id]` | 공간 상세 |
| POST | `/api/spaces/[id]/join` | 공간 입장 |
| GET | `/api/spaces/invite/[code]` | 초대 코드 조회 |
| GET | `/api/spaces/[id]/my-role` | 내 역할 |
| GET/POST | `/api/spaces/[id]/members` | 멤버 관리 |
| POST | `/api/spaces/[id]/members/[memberId]/kick` | 강퇴 |
| POST | `/api/spaces/[id]/members/[memberId]/mute` | 음소거 |
| POST/DELETE | `/api/spaces/[id]/staff` | 스태프 관리 |
| GET/POST | `/api/spaces/[id]/objects` | 오브젝트 |
| GET/POST | `/api/spaces/[id]/zones` | 파티 존 |
| GET | `/api/spaces/[id]/spotlight` | 스포트라이트 |
| GET | `/api/spaces/[id]/messages` | 메시지 |
| GET | `/api/my-spaces` | 내 공간 목록 |
| GET | `/api/templates` | 템플릿 |

---

## 참조

- 권한: `src/lib/space-auth.ts`, `src/lib/space-permissions.ts`
- Prisma: `prisma/schema.prisma::Space`, `SpaceMember`

---

> **생성일**: 2026-01-21 DocOps Phase 2
