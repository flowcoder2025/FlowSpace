# GUEST - 게스트 세션 API 스펙

> 비인증 사용자 게스트 세션 관리 API

---

## 개요

게스트 입장, 세션 검증, 이벤트 기록, 퇴장 API

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: GUEST_API_CREATE

- **What**: 게스트 세션 생성 API (입장)
- **Evidence**:
  - code: `src/app/api/guest/route.ts::POST`
  - code: `src/app/api/guest/route.ts::generateSecureRandomSuffix`
  - code: `prisma/schema.prisma::GuestSession`

### Contract: GUEST_API_VERIFY

- **What**: 게스트 세션 검증 API
- **Evidence**:
  - code: `src/app/api/guest/verify/route.ts::POST`

### Contract: GUEST_API_EVENT

- **What**: 게스트 이벤트 기록 API
- **Evidence**:
  - code: `src/app/api/guest/event/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: GUEST_API_EXIT

- **What**: 게스트 세션 종료 API (퇴장)
- **Evidence**:
  - code: `src/app/api/guest/exit/route.ts::POST`

<!-- FUNCTIONAL:END -->

---

## 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/guest` | 게스트 세션 생성 |
| POST | `/api/guest/verify` | 세션 검증 |
| POST | `/api/guest/event` | 이벤트 기록 |
| POST | `/api/guest/exit` | 세션 종료 |

---

## 세션 관리

- 세션 토큰: 24시간 유효
- 자동 정리: Cron 작업으로 만료 세션 삭제

---

## 참조

- Prisma: `prisma/schema.prisma::GuestSession`
- Cron: `src/app/api/cron/cleanup-sessions/route.ts`

---

> **생성일**: 2026-01-21 DocOps Phase 2
