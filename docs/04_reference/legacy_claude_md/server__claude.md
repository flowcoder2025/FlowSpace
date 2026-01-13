# Server 가이드 (Socket.io 서버)

> **역할**: 실시간 위치/채팅 동기화를 위한 독립 Socket.io 서버
> **상위**: `/CLAUDE.md` (루트 헌법)
> **포트**: 3001 (기본값)

---

## 1. 디렉토리 구조

```
/server
├── claude.md           # [현재 파일]
└── socket-server.ts    # Socket.io 서버 메인 파일
```

---

## 2. 실행 방법

```bash
# 단독 실행
npm run socket:dev

# 또는 전체 개발 서버와 함께
npm run dev:all
```

---

## 3. 아키텍처

### 3.1 보안 모델

```
클라이언트 → join:space (sessionToken 포함)
                ↓
         서버 세션 검증 (/api/guest/verify)
                ↓
         서버 파생 playerId 반환
                ↓
         이후 모든 이벤트에서 서버 ID 강제 사용
```

### 3.2 환경별 동작

| 환경 | 세션 검증 | 미인증 처리 |
|-----|----------|------------|
| production | 필수 | 연결 거부 |
| development | 선택적 | 경고 후 진행 |
| dev-* 세션 | 스킵 | 클라이언트 ID 사용 |

---

## 4. 이벤트 정의

### 4.1 클라이언트 → 서버

| 이벤트 | 페이로드 | 설명 |
|-------|---------|------|
| `join:space` | `{ spaceId, playerId, nickname, avatarColor, sessionToken }` | 공간 입장 |
| `leave:space` | - | 공간 퇴장 + 📊 EXIT 로그 기록 |
| `player:move` | `PlayerPosition` | 위치 업데이트 |
| `player:jump` | `PlayerJumpData` | 점프 이벤트 |
| `chat:message` | `{ content, type? }` | 채팅 전송 (type: message/whisper/party) |
| `whisper:send` | `{ targetId, content }` | 귓속말 전송 |
| `party:create` | `{ name }` | 파티 생성 |
| `party:invite` | `{ partyId, targetId }` | 파티 초대 |
| `party:accept` | `{ partyId }` | 파티 초대 수락 |
| `party:decline` | `{ partyId }` | 파티 초대 거절 |
| `party:leave` | `{ partyId }` | 파티 탈퇴 |
| `party:message` | `{ partyId, content }` | 파티 채팅 전송 |
| `proximity:set` | `{ enabled: boolean }` | 📌 근접 통신 모드 설정 (OWNER/STAFF만) |
| `joinParty` | `{ partyId, partyName }` | 📌 파티 존 입장 |
| `leaveParty` | - | 📌 파티 존 퇴장 |

### 4.2 서버 → 클라이언트

| 이벤트 | 페이로드 | 설명 |
|-------|---------|------|
| `room:joined` | `{ spaceId, players, yourPlayerId }` | 입장 완료 (🔒 서버 ID 포함) |
| `player:joined` | `PlayerPosition` | 다른 플레이어 입장 |
| `player:left` | `{ id }` | 플레이어 퇴장 |
| `player:moved` | `PlayerPosition` | 위치 동기화 |
| `player:jumped` | `PlayerJumpData` | 점프 동기화 |
| `chat:message` | `ChatMessageData` | 채팅 수신 |
| `chat:system` | `ChatMessageData` | 시스템 메시지 |
| `whisper:received` | `{ senderId, senderName, content }` | 귓속말 수신 |
| `party:invited` | `{ partyId, partyName, inviterId }` | 파티 초대 수신 |
| `party:joined` | `{ partyId, members }` | 파티 입장 완료 |
| `party:message` | `{ partyId, senderId, senderName, content }` | 파티 채팅 수신 |
| `party:member_left` | `{ partyId, memberId }` | 파티원 퇴장 |
| `proximity:changed` | `{ spaceId, enabled }` | 📌 근접 모드 변경 알림 (전체 브로드캐스트) |
| `proximity:error` | `{ message }` | 📌 근접 설정 에러 (권한 없음 등) |
| `error` | `{ message }` | 에러 알림 |

---

## 5. 🔒 보안 규칙

### 5.1 서버 파생 ID 강제

```typescript
// ❌ 클라이언트 ID 신뢰 금지
socket.on("player:move", (position) => {
  const playerId = position.id  // 🚫 사용 금지
})

// ✅ 서버 검증 ID 사용
socket.on("player:move", (position) => {
  const playerId = socket.data.playerId  // ✅ 서버에서 검증한 ID
})
```

### 5.2 세션 검증 흐름

```typescript
// join:space 핸들러 내부
const verification = await verifyGuestSession(sessionToken, spaceId)
if (!verification.valid) {
  // 운영환경: 연결 거부
  // 개발환경: 경고 후 진행
}
// 🔒 검증된 값으로 덮어쓰기
socket.data.playerId = verification.participantId
```

---

## 6. 상태 관리

### 6.1 Room State

```typescript
// spaceId → Map<playerId, PlayerPosition>
const rooms = new Map<string, Map<string, PlayerPosition>>()
```

### 6.2 Socket Data

```typescript
interface SocketData {
  spaceId: string
  playerId: string       // 🔒 서버 검증 ID
  nickname: string
  avatarColor: AvatarColor
  sessionToken?: string  // 중복 접속 방지용
}
```

---

## 7. CORS 설정

```typescript
cors: {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  methods: ["GET", "POST"],
  credentials: true,
}
```

> ⚠️ 운영 배포 시 origin 수정 필요

---

## 8. 확장 계획

### 8.1 Redis Adapter (향후)

```typescript
import { createAdapter } from "@socket.io/redis-adapter"
// 수평 확장을 위한 Redis Adapter
```

### 8.2 인증 미들웨어 강화 (향후)

```typescript
io.use(async (socket, next) => {
  // 연결 시점에 세션 검증
})
```

---

## 9. 금지 사항

- ❌ 클라이언트가 보낸 ID 직접 사용 금지
- ❌ NODE_ENV 외 환경 변수로 보안 우회 금지
- ❌ 운영환경에서 세션 검증 스킵 금지

---

## 10. 📊 이벤트 로깅

### 10.1 로깅 흐름

**게스트 사용자 (guest-* 세션)**:
```
leave:space / disconnect 이벤트
           ↓
   logGuestEvent() 호출
           ↓
   POST /api/guest/event
           ↓
   SpaceEventLog 테이블에 EXIT 기록 (guestSessionId 포함)
```

**인증 사용자 (auth-* 세션)**:
```
leave:space / disconnect 이벤트
           ↓
   logGuestEvent() → auth- 세션 감지
           ↓
   logAuthUserEvent() 호출
           ↓
   DELETE /api/spaces/[id]/visit
           ↓
   SpaceEventLog 테이블에 EXIT 기록 (userId 포함)
```

### 10.2 로깅 대상

| 이벤트 | 게스트 | 인증 사용자 | 비고 |
|-------|--------|------------|------|
| ENTER | ✅ Guest API | ✅ Visit API | 세션/페이지 입장 시 |
| EXIT | ✅ Socket 서버 | ✅ Socket 서버 | 퇴장/연결 종료 시 |
| CHAT | ⏳ 향후 | ⏳ 향후 | 향후 구현 예정 |

### 10.3 세션 유형별 처리

| 세션 패턴 | 처리 | 설명 |
|----------|------|------|
| `dev-*` | 스킵 | 개발 모드 세션, 로깅 안함 |
| `guest-*` | logGuestEvent | 게스트 세션, Guest API로 로깅 |
| `auth-*` | logAuthUserEvent | 인증 사용자, Visit API로 로깅 |

### 10.4 로깅 조건

- 비동기 처리 (로깅 실패해도 퇴장 처리는 계속)
- 체류시간 계산은 ENTER/EXIT 시간 차이로 계산
- 24시간 이상 체류는 통계에서 제외

---

## 11. /metrics 엔드포인트 (v2.0.0)

### 11.1 개요

```
GET http://[OCI_IP]:3001/metrics

용도: Admin 대시보드 OCI 모니터링용 서버 상태 정보 제공
```

### 11.2 응답 형식

```json
{
  "server": "socket.io",
  "version": "2.0.0",
  "timestamp": 1736400000000,
  "uptime": {
    "seconds": 86400,
    "formatted": "1d 0h 0m 0s",
    "startTime": "2026-01-08T00:00:00.000Z"
  },
  "connections": {
    "total": 5,
    "rooms": [{ "spaceId": "xxx", "connections": 3 }],
    "roomCount": 2
  },
  "parties": { "count": 1 },
  "process": {
    "memory": { "rssMB": 64, "heapUsedMB": 32 }
  },
  "storage": {
    "totalGB": 44.96,
    "usedGB": 4.61,
    "availableGB": 40.33,
    "usedPercent": 10,
    "mountPoint": "/"
  }
}
```

### 11.3 storage 필드 (v2.0.0 추가)

| 필드 | 타입 | 설명 |
|-----|------|------|
| `totalGB` | number | 마운트 포인트 총 용량 (GB) |
| `usedGB` | number | 사용 중인 용량 (GB) |
| `availableGB` | number | 사용 가능한 용량 (GB) |
| `usedPercent` | number | 사용률 (%) |
| `mountPoint` | string | 측정 대상 경로 (/) |

> **데이터 소스**: `df -B1 /` 명령어 기반 (Linux)

### 11.4 사용처

```
Admin 대시보드 (/admin/dashboard)
    ↓
GET /api/admin/oci-metrics
    ↓
fetchSocketMetrics() → http://[OCI_IP]:3001/metrics
```

---

## 12. 📌 Discord Webhook 통합 (NEW - 2026-01-10)

### 12.1 개요

```typescript
// 환경 변수로 Webhook URL 설정
DISCORD_ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
```

### 12.2 알림 대상

| 이벤트 | 알림 | 설명 |
|-------|:----:|------|
| 서버 에러 (심각) | ✅ | 복구 불가능한 오류 |
| 연결 에러 | ✅ | Socket 연결 실패 |
| 인증 실패 | ⚠️ | 다수 발생 시만 |

### 12.3 메시지 형식

```json
{
  "embeds": [{
    "title": "🚨 Socket Server Error",
    "description": "에러 메시지",
    "color": 15158332,
    "fields": [
      { "name": "Error Code", "value": "E1001" },
      { "name": "Timestamp", "value": "2026-01-10T00:00:00Z" }
    ]
  }]
}
```

---

## 13. 📌 JSON 구조화 로깅 (NEW - 2026-01-10)

### 13.1 로그 형식

```json
{
  "timestamp": "2026-01-10T00:00:00.000Z",
  "level": "error",
  "code": "E1001",
  "message": "Authentication failed",
  "context": {
    "socketId": "xxx",
    "spaceId": "yyy",
    "playerId": "zzz"
  }
}
```

### 13.2 에러 코드 체계

| 코드 | 분류 | 설명 |
|-----|------|------|
| E1xxx | 인증 | 세션 검증 실패, 권한 없음 |
| E2xxx | 연결 | Socket 연결 에러 |
| E3xxx | 이벤트 | 이벤트 처리 실패 |
| E4xxx | 외부 API | API 호출 실패 |

### 13.3 로그 레벨

| 레벨 | 용도 |
|-----|------|
| `error` | 에러 (Discord 알림 포함) |
| `warn` | 경고 (잠재적 문제) |
| `info` | 정보 (입장/퇴장 등) |
| `debug` | 디버그 (개발 모드만) |

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2026-01-10 | 📌 근접 통신 이벤트 추가 (proximity:set/changed/error, joinParty/leaveParty) |
| 2026-01-10 | 📌 Discord Webhook 통합 - 서버 에러 알림 |
| 2026-01-10 | 📌 JSON 구조화 로깅 + 에러 코드 체계 |
| 2026-01-09 | /metrics 엔드포인트 v2.0.0 - storage 필드 추가 |
| 2025-12-15 | 인증 사용자 EXIT 로깅 추가 - auth-* 세션도 Visit API로 로깅 |
| 2025-12-11 | whisper/party 이벤트 추가 - 귓속말 및 파티 채팅 시스템 지원 |
| 2025-12-09 | EXIT 이벤트 로깅 추가 - 체류시간 통계 지원 |
| 2025-12-08 | 초기 생성 - 보안 강화 내용 반영 |
