# TASK: Socket Server 리팩토링

> **목표**: `server/socket-server.ts` 2,838줄 → 모듈화된 구조 (~150-300줄 × 15개 파일)
> **시작일**: 2026-01-21
> **근거**: 프로젝트 종합 분석 결과, 유지보수성 및 테스트 용이성 개선 필요

---

## 배경

### 종합 분석 결과 요약 (2026-01-21)

| 영역 | 점수 | 평가 |
|-----|:----:|------|
| 아키텍처 | 8/10 | 모듈화 우수, 확장성 고려됨 |
| 코드 품질 | 7/10 | TypeScript 활용 좋음, 일부 any/console 정리 필요 |
| 보안 | 7.5/10 | 핵심 보안 패턴 적용, Rate Limiting 추가 필요 |
| 성능 | 7/10 | React 최적화 적용, 번들/DB 최적화 여지 |
| 문서화 | 9/10 | CLAUDE.md 계층 구조 매우 우수 |

**종합: 7.5/10** - 프로덕션 준비 상태에 근접

### 식별된 기술 부채

| 항목 | 발견 수 | 영향도 |
|-----|:------:|:------:|
| `console.log/error/warn` | 186회 | Medium |
| `any` 타입 사용 | 52회 | Medium |
| socket-server.ts 단일 파일 | 2,838줄 | **High** |

---

## 현재 상태: socket-server.ts

### 파일 분석 (2,838줄)

| 라인 범위 | 기능 영역 | 분리 대상 |
|----------|---------|----------|
| 1-89 | 설정, imports, 상수 | `config.ts` |
| 90-253 | 로거, Discord 알림 | `utils/logger.ts` |
| 254-336 | 이벤트 로깅 | `services/event-logger.ts` |
| 337-481 | 세션 검증, 멤버 제한 | `services/auth.ts` |
| 483-607 | Rate Limiting | `middleware/rate-limit.ts` |
| 609-899 | 유틸리티, HTTP 서버, 상태 관리 | `utils/`, `state.ts` |
| 900-1178 | `join:space` 핸들러 | `handlers/room.ts` |
| 1180-1263 | `leave:space`, `player:move/jump` | `handlers/player.ts` |
| 1265-1596 | 채팅, 귓속말, 파티 | `handlers/chat.ts` |
| 1598-1638 | 프로필 업데이트 | `handlers/player.ts` |
| 1640-2211 | 관리자 액션 | `handlers/admin.ts` |
| 2213-2478 | 녹화, 스포트라이트, 근접 통신 | `handlers/media.ts` |
| 2480-2672 | 맵 오브젝트 | `handlers/objects.ts` |
| 2674-2723 | 헬퍼 함수들 | `utils/socket-helpers.ts` |
| 2725-2838 | disconnect, 서버 시작 | `index.ts` |

---

## 리팩토링 계획

### 목표 디렉토리 구조

```
server/
├── index.ts              # 진입점 (서버 시작)
├── config.ts             # 환경 변수, 상수
├── http-server.ts        # HTTP 서버 (/health, /metrics, /presence)
├── socket-server.ts      # Socket.io 인스턴스 생성 (축소)
├── state.ts              # 공유 상태 (rooms, partyRooms 등)
│
├── handlers/
│   ├── index.ts          # 핸들러 등록
│   ├── room.ts           # join:space, leave:space, disconnect
│   ├── player.ts         # player:move, player:jump, updateProfile
│   ├── chat.ts           # chat:message, whisper, party
│   ├── admin.ts          # mute/unmute/kick/announce/deleteMessage
│   ├── media.ts          # recording, spotlight, proximity
│   └── objects.ts        # object:place/update/delete
│
├── middleware/
│   ├── rate-limit.ts     # Rate Limiting 로직
│   └── auth.ts           # 세션 검증 미들웨어
│
├── services/
│   ├── event-logger.ts   # logGuestEvent, logAuthUserEvent
│   ├── member.ts         # loadMemberRestriction, saveMemberRestriction
│   └── admin-verify.ts   # verifyAdminPermission
│
├── utils/
│   ├── logger.ts         # 구조화된 로거 + Discord 알림
│   ├── sanitize.ts       # sanitizeMessageContent
│   ├── helpers.ts        # findSocketByNickname, extractNickname 등
│   └── format.ts         # formatUptime, getStorageMetrics
│
└── types.ts              # 추가 타입 정의
```

---

## Phase 1: 유틸리티 분리 (안전한 순서)

> 의존성이 적은 독립적인 모듈부터 분리

- [ ] `server/config.ts` - 환경 변수, 상수
- [ ] `server/utils/logger.ts` - 로거, Discord 알림
- [ ] `server/utils/sanitize.ts` - XSS 방지 함수
- [ ] `server/utils/format.ts` - formatUptime, getStorageMetrics
- [ ] `server/utils/helpers.ts` - 소켓 헬퍼 함수

---

## Phase 2: 서비스 분리

> 비즈니스 로직 레이어

- [ ] `server/services/event-logger.ts` - 이벤트 로깅
- [ ] `server/services/member.ts` - 멤버 제한 관리
- [ ] `server/services/admin-verify.ts` - 관리 권한 검증

---

## Phase 3: 미들웨어 분리

- [ ] `server/middleware/rate-limit.ts` - Rate Limiting
- [ ] `server/middleware/auth.ts` - 세션 검증

---

## Phase 4: 상태 관리 분리

- [ ] `server/state.ts` - 공유 상태 (rooms, partyRooms, recordingStates 등)

---

## Phase 5: 핸들러 분리

> 가장 복잡한 부분, 의존성 주입 패턴 적용

- [ ] `server/handlers/room.ts` - join/leave/disconnect
- [ ] `server/handlers/player.ts` - move/jump/profile
- [ ] `server/handlers/chat.ts` - message/whisper/party
- [ ] `server/handlers/admin.ts` - mute/unmute/kick/announce
- [ ] `server/handlers/media.ts` - recording/spotlight/proximity
- [ ] `server/handlers/objects.ts` - place/update/delete

---

## Phase 6: 진입점 통합

- [ ] `server/http-server.ts` - HTTP 엔드포인트 분리
- [ ] `server/socket-server.ts` - Socket.io 인스턴스만
- [ ] `server/handlers/index.ts` - 핸들러 등록 통합
- [ ] `server/index.ts` - 최종 진입점

---

## Phase 7: 검증

- [ ] `npm run socket:dev` 정상 동작 확인
- [ ] 주요 기능 테스트:
  - join:space / leave:space
  - chat:message / whisper
  - admin:mute / admin:kick
  - recording:start / recording:stop
  - object:place / object:delete
- [ ] /health, /metrics 엔드포인트 확인

---

## 예상 효과

| 항목 | Before | After |
|-----|--------|-------|
| 파일 크기 | 2,838줄 (1개) | ~150-300줄 × 15개 |
| 단위 테스트 | 불가 | 모듈별 가능 |
| 코드 탐색 | 스크롤 지옥 | 기능별 빠른 접근 |
| 협업 | 머지 충돌 빈번 | 독립적 수정 가능 |
| 유지보수 | 전체 영향 | 관심사 분리로 안전 |

---

## 참조

- 분석 핸드오프: `docs/00_ssot/HANDOFF_2026-01-21_SOCKET_REFACTOR.md`
- Socket 서버 가이드: `server/claude.md`
- 이전 TASK: DocOps MISSING_DOC 처리 (완료)

---

## 변경 이력

| 날짜 | 변경 내용 |
|-----|----------|
| 2026-01-21 | TASK.md 초기화 - Socket Server 리팩토링 태스크 시작 |
