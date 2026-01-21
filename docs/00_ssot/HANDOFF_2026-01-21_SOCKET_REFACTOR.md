# HANDOFF: Socket Server 리팩토링

> **작성일**: 2026-01-21
> **작성자**: Claude (sc:analyze + sc:improve)
> **다음 세션 태스크**: `server/socket-server.ts` 모듈화 리팩토링

---

## 1. 세션 요약

### 수행한 작업

1. **프로젝트 종합 분석 (`/sc:analyze`)**
   - 아키텍처, 코드 품질, 보안, 성능, 문서화 5개 영역 분석
   - 종합 점수: **7.5/10** (프로덕션 준비 근접)

2. **기술 부채 식별**
   - `console.log` 남발 (186회)
   - `any` 타입 사용 (52회)
   - **socket-server.ts 2,838줄** - 핵심 문제

3. **리팩토링 계획 수립 (`/sc:improve`)**
   - 목표 디렉토리 구조 설계
   - 7단계 Phase별 작업 계획

---

## 2. socket-server.ts 분석 결과

### 파일 통계

| 항목 | 값 |
|-----|-----|
| 총 라인 수 | 2,838 |
| 토큰 수 | ~34,050 (컨텍스트 1회 초과) |
| 주요 기능 영역 | 16개 |
| 이벤트 핸들러 | 25개+ |

### 기능 영역별 라인 매핑

```
┌─────────────────────────────────────────────────────────────┐
│  1-89     │ 설정, imports, 상수                              │
│  90-253   │ 로거, Discord 알림                               │
│  254-336  │ 이벤트 로깅 (guest/auth)                         │
│  337-481  │ 세션 검증, 멤버 제한 DB                           │
│  483-607  │ Rate Limiting                                    │
│  609-899  │ HTTP 서버, 상태 관리, 헬퍼                        │
├─────────────────────────────────────────────────────────────┤
│  900-1178 │ join:space (가장 복잡)                           │
│  1180-1263│ leave:space, player:move/jump                    │
│  1265-1596│ chat:message, whisper, party                     │
│  1598-1638│ player:updateProfile                             │
├─────────────────────────────────────────────────────────────┤
│  1640-2211│ admin:mute/unmute/kick/announce/deleteMessage    │
│  2213-2478│ recording, spotlight, proximity                  │
│  2480-2672│ object:place/update/delete                       │
│  2674-2723│ 헬퍼 함수 (findSocket*, extractNickname)         │
│  2725-2838│ disconnect, 서버 시작, graceful shutdown         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 목표 디렉토리 구조

```
server/
├── index.ts              # 진입점
├── config.ts             # PORT, CORS_ORIGINS, IS_DEV 등
├── http-server.ts        # /health, /metrics, /presence
├── socket-server.ts      # io 인스턴스 생성만 (~50줄)
├── state.ts              # rooms, partyRooms, recordingStates 등
│
├── handlers/
│   ├── index.ts          # registerHandlers(io)
│   ├── room.ts           # join:space, leave:space, disconnect
│   ├── player.ts         # player:move, player:jump, updateProfile
│   ├── chat.ts           # chat:message, whisper, party
│   ├── admin.ts          # mute/unmute/kick/announce/deleteMessage
│   ├── media.ts          # recording, spotlight, proximity
│   └── objects.ts        # object:place/update/delete
│
├── middleware/
│   ├── rate-limit.ts     # checkRateLimit, cleanupRateLimitState
│   └── auth.ts           # verifyGuestSession
│
├── services/
│   ├── event-logger.ts   # logGuestEvent, logAuthUserEvent
│   ├── member.ts         # loadMemberRestriction, saveMemberRestriction
│   └── admin-verify.ts   # verifyAdminPermission
│
├── utils/
│   ├── logger.ts         # ErrorCodes, logger, sendDiscordAlert
│   ├── sanitize.ts       # sanitizeMessageContent
│   ├── helpers.ts        # findSocketByNickname, extractNickname
│   └── format.ts         # formatUptime, getStorageMetrics
│
└── types.ts              # 서버 전용 타입 (SocketData 확장 등)
```

---

## 4. 리팩토링 Phase 계획

### Phase 1: 유틸리티 분리 (안전)

의존성 없는 순수 함수부터 분리:

| 파일 | 추출할 코드 | 라인 |
|-----|-----------|-----|
| `utils/sanitize.ts` | `sanitizeMessageContent` | 150-172 |
| `utils/format.ts` | `formatUptime`, `getStorageMetrics` | 616-669 |
| `utils/logger.ts` | `ErrorCodes`, `logger`, `sendDiscordAlert` | 90-253 |
| `config.ts` | 상수, 환경 변수 | 55-88 |

### Phase 2: 서비스 분리

비즈니스 로직 레이어:

| 파일 | 추출할 코드 | 라인 |
|-----|-----------|-----|
| `services/event-logger.ts` | `logGuestEvent`, `logAuthUserEvent` | 254-335 |
| `services/member.ts` | `loadMemberRestriction`, `saveMemberRestriction` | 377-481 |
| `services/admin-verify.ts` | `verifyAdminPermission` | 1644-1708 |

### Phase 3: 미들웨어 분리

| 파일 | 추출할 코드 | 라인 |
|-----|-----------|-----|
| `middleware/rate-limit.ts` | Rate Limit 전체 | 483-607 |
| `middleware/auth.ts` | `verifyGuestSession` | 337-375 |

### Phase 4: 상태 관리 분리

| 파일 | 추출할 코드 |
|-----|-----------|
| `state.ts` | `rooms`, `partyRooms`, `recordingStates`, `spotlightStates`, `proximityStates` + 관련 헬퍼 |

### Phase 5: 핸들러 분리 (가장 복잡)

| 파일 | 이벤트 |
|-----|--------|
| `handlers/room.ts` | `join:space`, `leave:space`, `disconnect` |
| `handlers/player.ts` | `player:move`, `player:jump`, `player:updateProfile` |
| `handlers/chat.ts` | `chat:message`, `whisper:send`, `party:*`, `reaction:toggle` |
| `handlers/admin.ts` | `admin:mute`, `admin:unmute`, `admin:kick`, `admin:deleteMessage`, `admin:announce` |
| `handlers/media.ts` | `recording:*`, `spotlight:*`, `proximity:set` |
| `handlers/objects.ts` | `object:place`, `object:update`, `object:delete` |

### Phase 6: 진입점 통합

- `http-server.ts`: HTTP 엔드포인트만
- `socket-server.ts`: `io` 인스턴스 생성만
- `handlers/index.ts`: 모든 핸들러 등록
- `index.ts`: 서버 시작, graceful shutdown

### Phase 7: 검증

```bash
npm run socket:dev   # 정상 시작 확인
```

테스트 체크리스트:
- [ ] join:space / leave:space
- [ ] chat:message / whisper
- [ ] admin:mute / admin:kick
- [ ] recording:start / recording:stop
- [ ] object:place / object:delete
- [ ] /health, /metrics 엔드포인트

---

## 5. 주의사항

### 순환 의존성 방지

```typescript
// ❌ 안됨: handlers/admin.ts → state.ts → handlers/admin.ts
// ✅ 해결: state.ts는 순수 데이터만, 로직은 services로
```

### Prisma 클라이언트 공유

```typescript
// config.ts 또는 별도 db.ts에서 싱글톤 export
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
```

### Socket 타입 전파

```typescript
// handlers에서 Socket 타입 사용
import type { Socket } from "socket.io"
import type { SocketData } from "../types"

export function handleJoinSpace(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>,
  io: Server,
  data: JoinSpaceData
) { ... }
```

---

## 6. 다음 세션 시작점

### 즉시 실행 가능한 첫 단계

1. `server/utils/` 폴더 생성
2. `sanitize.ts` 분리 (가장 독립적)
3. `format.ts` 분리
4. `logger.ts` 분리
5. 기존 `socket-server.ts`에서 import 변경
6. `npm run socket:dev`로 동작 확인

### 컨텍스트 로딩 순서

```
1. TASK.md 읽기 → 현재 Phase 확인
2. server/socket-server.ts 해당 영역 읽기
3. 분리 작업 수행
4. 테스트
5. TASK.md 체크박스 업데이트
```

---

## 7. 관련 파일

| 파일 | 용도 |
|-----|------|
| `TASK.md` | 리팩토링 태스크 추적 |
| `server/socket-server.ts` | 분리 대상 (2,838줄) |
| `server/claude.md` | Socket 서버 가이드 (이벤트 정의) |
| `src/features/space/socket/types.ts` | 공유 타입 정의 |

---

## 8. 분석 리포트 참조

### 종합 분석 결과 (2026-01-21)

| 영역 | 점수 | 주요 발견 |
|-----|:----:|---------|
| 아키텍처 | 8/10 | features/space 기반 모듈화 우수 |
| 코드 품질 | 7/10 | useMemo/useCallback 164회 사용, any 52회 |
| 보안 | 7.5/10 | 서버 파생 ID 패턴 적용, Rate Limiting 일부 |
| 성능 | 7/10 | 메시지 제한 500개, iOS Safari 호환 |
| 문서화 | 9/10 | CLAUDE.md 계층 구조 매우 우수 |

### 식별된 기술 부채

| 항목 | 발견 수 | 우선순위 |
|-----|:------:|:------:|
| socket-server.ts 단일 파일 | 2,838줄 | **P0** |
| console.log 남발 | 186회 | P1 |
| any 타입 | 52회 | P2 |
| Rate Limiting API | 미구현 | P1 |

---

*다음 세션에서 TASK.md의 Phase 1부터 시작하세요.*
