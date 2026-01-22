# CRON - 크론 작업 API 스펙

> 정기 실행 백그라운드 작업 API

---

## 개요

메시지/세션 정리, 메트릭 수집, 사용량 집계 크론 작업

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: CRON_API_CLEANUP_MESSAGES

- **What**: 오래된 채팅 메시지 정리 크론
- **Evidence**:
  - code: `src/app/api/cron/cleanup-messages/route.ts::GET`
  - code: `prisma/schema.prisma::ChatMessage`

### Contract: CRON_API_CLEANUP_SESSIONS

- **What**: 만료된 게스트 세션 정리 크론
- **Evidence**:
  - code: `src/app/api/cron/cleanup-sessions/route.ts::GET`
  - code: `prisma/schema.prisma::GuestSession`

### Contract: CRON_API_COLLECT_METRICS

- **What**: OCI 메트릭 수집 크론
- **Evidence**:
  - code: `src/app/api/cron/collect-metrics/route.ts::GET`

### Contract: CRON_API_AGGREGATE_USAGE

- **What**: 사용량 집계 크론
- **Evidence**:
  - code: `src/app/api/cron/aggregate-usage/route.ts::GET`

<!-- FUNCTIONAL:END -->

---

## 엔드포인트

| Method | Path | 설명 | 주기 |
|--------|------|------|------|
| GET | `/api/cron/cleanup-messages` | 메시지 정리 | 매일 |
| GET | `/api/cron/cleanup-sessions` | 세션 정리 | 매시간 |
| GET | `/api/cron/collect-metrics` | 메트릭 수집 | 5분마다 |
| GET | `/api/cron/aggregate-usage` | 사용량 집계 | 매일 |

---

## Vercel Cron 설정

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/cleanup-messages", "schedule": "0 0 * * *" },
    { "path": "/api/cron/cleanup-sessions", "schedule": "0 * * * *" },
    { "path": "/api/cron/collect-metrics", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/aggregate-usage", "schedule": "0 1 * * *" }
  ]
}
```

---

## 보안

- CRON_SECRET 헤더 검증으로 외부 호출 차단

---

## 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-22 | collect-metrics: 트래픽 델타 시간 기반 정규화 추가 | `b506af6` |
| 2026-01-21 | DocOps Phase 2 초기 작성 | - |
