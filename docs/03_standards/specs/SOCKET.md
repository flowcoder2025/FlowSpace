# SOCKET - Socket.io 서버 스펙

> 실시간 위치/채팅 동기화를 위한 Socket.io 서버 규격

---

## 개요

독립 Socket.io 서버 (포트 3001) - 플레이어 위치, 채팅, 파티, 근접 통신 동기화

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: SOCKET_FUNC_EVENTS

- **What**: Socket.io 이벤트 정의 (32개)
- **Rules**:
  | 방향 | 이벤트 | 페이로드 | 설명 |
  |------|--------|----------|------|
  | C→S | `join:space` | `{ spaceId, playerId, nickname, avatarColor, sessionToken }` | 공간 입장 |
  | C→S | `leave:space` | - | 공간 퇴장 + EXIT 로깅 |
  | C→S | `player:move` | `PlayerPosition` | 위치 업데이트 |
  | C→S | `player:jump` | `PlayerJumpData` | 점프 이벤트 |
  | C→S | `chat:message` | `{ content, type? }` | 채팅 전송 |
  | C→S | `whisper:send` | `{ targetId, content }` | 귓속말 전송 |
  | C→S | `party:create` | `{ name }` | 파티 생성 |
  | C→S | `party:invite` | `{ partyId, targetId }` | 파티 초대 |
  | C→S | `party:accept` | `{ partyId }` | 파티 수락 |
  | C→S | `party:decline` | `{ partyId }` | 파티 거절 |
  | C→S | `party:leave` | `{ partyId }` | 파티 탈퇴 |
  | C→S | `party:message` | `{ partyId, content }` | 파티 채팅 |
  | C→S | `proximity:set` | `{ enabled: boolean }` | 근접 모드 설정 (OWNER/STAFF) |
  | C→S | `joinParty` | `{ partyId, partyName }` | 파티 존 입장 |
  | C→S | `leaveParty` | - | 파티 존 퇴장 |
  | S→C | `room:joined` | `{ spaceId, players, yourPlayerId }` | 입장 완료 |
  | S→C | `player:joined` | `PlayerPosition` | 타 플레이어 입장 |
  | S→C | `player:left` | `{ id }` | 플레이어 퇴장 |
  | S→C | `player:moved` | `PlayerPosition` | 위치 동기화 |
  | S→C | `player:jumped` | `PlayerJumpData` | 점프 동기화 |
  | S→C | `chat:message` | `ChatMessageData` | 채팅 수신 |
  | S→C | `chat:system` | `ChatMessageData` | 시스템 메시지 |
  | S→C | `whisper:received` | `{ senderId, senderName, content }` | 귓속말 수신 |
  | S→C | `party:invited` | `{ partyId, partyName, inviterId }` | 파티 초대 수신 |
  | S→C | `party:joined` | `{ partyId, members }` | 파티 입장 완료 |
  | S→C | `party:message` | `{ partyId, senderId, senderName, content }` | 파티 채팅 수신 |
  | S→C | `party:member_left` | `{ partyId, memberId }` | 파티원 퇴장 |
  | S→C | `proximity:changed` | `{ spaceId, enabled }` | 근접 모드 변경 브로드캐스트 |
  | S→C | `proximity:error` | `{ message }` | 근접 설정 에러 |
  | S→C | `error` | `{ message }` | 일반 에러 |
- **Evidence**:
  - code: `src/features/space/socket/types.ts::ClientToServerEvents`
  - code: `src/features/space/socket/types.ts::ServerToClientEvents`
  - code: `server/handlers/index.ts::registerHandlers`

### Contract: SOCKET_FUNC_SESSION_VERIFY

- **What**: 세션 검증 + 서버 파생 ID 강제
- **Rules**:
  - 클라이언트 ID 직접 신뢰 금지 (`position.id` 사용 금지)
  - 서버 검증 ID 사용 필수 (`socket.data.playerId`)
  - 운영환경: 검증 실패 시 연결 거부
  - 개발환경: 경고 후 진행 허용
  - `dev-*` 세션: 검증 스킵
- **Evidence**:
  - code: `server/handlers/room.ts`

### Contract: SOCKET_FUNC_ROOM_STATE

- **What**: 방 상태 관리
- **Rules**:
  ```typescript
  // spaceId → Map<playerId, PlayerPosition>
  const rooms = new Map<string, Map<string, PlayerPosition>>()

  interface SocketData {
    spaceId: string
    playerId: string       // 서버 검증 ID
    nickname: string
    avatarColor: AvatarColor
    sessionToken?: string
  }
  ```
- **Evidence**:
  - code: `server/state.ts`

### Contract: SOCKET_FUNC_METRICS

- **What**: /metrics 엔드포인트 (v2.0.0)
- **Rules**:
  - `GET http://[OCI_IP]:3001/metrics`
  - 응답: `{ server, version, timestamp, uptime, connections, parties, process, storage }`
  - storage: `{ totalGB, usedGB, availableGB, usedPercent, mountPoint }`
- **Evidence**:
  - code: `server/index.ts`

### Contract: SOCKET_FUNC_LOGGING

- **What**: JSON 구조화 로깅 + 에러 코드 체계
- **Rules**:
  | 코드 | 분류 | 설명 |
  |-----|------|------|
  | E1xxx | 인증 | 세션 검증 실패, 권한 없음 |
  | E2xxx | 연결 | Socket 연결 에러 |
  | E3xxx | 이벤트 | 이벤트 처리 실패 |
  | E4xxx | 외부 API | API 호출 실패 |

  | 레벨 | 용도 |
  |-----|------|
  | `error` | 에러 (Discord 알림) |
  | `warn` | 경고 |
  | `info` | 정보 |
  | `debug` | 개발 모드만 |
- **Evidence**:
  - code: `server/utils/logger.ts::logger`
  - code: `server/config.ts::ErrorCode`

### Contract: SOCKET_FUNC_DISCORD

- **What**: Discord Webhook 에러 알림
- **Rules**:
  - 환경변수: `DISCORD_ERROR_WEBHOOK_URL`
  - 알림 대상: 서버 에러 (심각), 연결 에러
  - 메시지: embed 형식 (title, description, color, fields)
- **Evidence**:
  - code: `server/utils/logger.ts`

### Contract: SOCKET_FUNC_PROXIMITY

- **What**: 근접 통신 이벤트
- **Rules**:
  - `proximity:set`: OWNER/STAFF만 설정 가능
  - `proximity:changed`: 전체 브로드캐스트
  - `proximity:error`: 권한 없음 등 에러
- **Evidence**:
  - code: `server/handlers/media.ts`

### Contract: SOCKET_FUNC_PARTY

- **What**: 파티/파티존 이벤트
- **Rules**:
  - `joinParty` / `leaveParty`: 파티 존 입/퇴장
  - `party:*` 이벤트: 파티 생성, 초대, 수락, 거절, 탈퇴, 메시지
- **Evidence**:
  - code: `server/handlers/party.ts`

### Contract: SOCKET_FUNC_EVENT_LOGGING

- **What**: 이벤트 로깅 (ENTER/EXIT)
- **Rules**:
  | 세션 패턴 | 처리 | 설명 |
  |----------|------|------|
  | `dev-*` | 스킵 | 개발 모드 |
  | `guest-*` | logGuestEvent | Guest API 로깅 |
  | `auth-*` | logAuthUserEvent | Visit API 로깅 |
- **Evidence**:
  - code: `server/services/event-logger.ts`

<!-- FUNCTIONAL:END -->

---

## 보안 규칙

### 필수

```typescript
// 서버 검증 ID 사용
socket.on("player:move", (position) => {
  const playerId = socket.data.playerId  // 서버 검증 ID
})
```

### 금지

```typescript
// 클라이언트 ID 신뢰 금지
socket.on("player:move", (position) => {
  const playerId = position.id  // 사용 금지
})
```

---

## 환경별 동작

| 환경 | 세션 검증 | 미인증 처리 |
|-----|----------|------------|
| production | 필수 | 연결 거부 |
| development | 선택적 | 경고 후 진행 |
| dev-* 세션 | 스킵 | 클라이언트 ID 사용 |

---

## CORS 설정

```typescript
cors: {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  methods: ["GET", "POST"],
  credentials: true,
}
```

---

## 배포 환경

| 환경 | URL | IP |
|------|-----|-----|
| Production | `https://space-socket.flow-coder.com` | OCI 144.24.72.143 |
| Development | `http://localhost:3001` | - |

> 상세 OCI 배포 가이드: `docs/infrastructure/OCI.md`

---

## 참조

- 서버 진입점: `server/index.ts`
- 핸들러: `server/handlers/`
- 서비스: `server/services/`
- 상태 관리: `server/state.ts`
- 설정: `server/config.ts`
- 유틸리티: `server/utils/`
- 클라이언트: `src/features/space/socket/useSocket.ts`
- 타입: `src/features/space/socket/types.ts`
- 인프라: `docs/03_standards/specs/INFRA.md`

---

## 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-22 | 모듈화 리팩토링 (단일 파일 → 23개 모듈) | f226bcb |
| 2026-01-21 | DocOps SPEC 통합 | - |
