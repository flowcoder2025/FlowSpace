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
| `chat:message` | `{ content }` | 채팅 전송 |

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

```
leave:space / disconnect 이벤트
           ↓
   logGuestEvent() 호출
           ↓
   POST /api/guest/event
           ↓
   SpaceEventLog 테이블에 EXIT 기록
```

### 10.2 로깅 대상

| 이벤트 | 로깅 여부 | 비고 |
|-------|----------|------|
| ENTER | ✅ | Guest API에서 세션 생성 시 로깅 |
| EXIT | ✅ | Socket 서버에서 퇴장/연결 종료 시 로깅 |
| CHAT | ⏳ | 향후 구현 예정 |

### 10.3 로깅 조건

- 게스트 세션만 로깅 (dev-, auth- 세션 제외)
- 비동기 처리 (로깅 실패해도 퇴장 처리는 계속)

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2025-12-09 | EXIT 이벤트 로깅 추가 - 체류시간 통계 지원 |
| 2025-12-08 | 초기 생성 - 보안 강화 내용 반영 |
