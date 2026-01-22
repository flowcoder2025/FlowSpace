# ADMIN - 관리자 API 스펙

> SuperAdmin 전용 플랫폼 관리 API

---

## 개요

플랫폼 전체 공간 관리, 로그 조회, 통계, 사용량 분석 API

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: ADMIN_API_SPACES

- **What**: 전체 공간 목록 조회 API (SuperAdmin 전용)
- **Evidence**:
  - code: `src/app/api/admin/spaces/route.ts::GET`
  - code: `src/lib/space-auth.ts::isSuperAdmin`

### Contract: ADMIN_API_LOGS

- **What**: 플랫폼 이벤트 로그 조회 API
- **Evidence**:
  - code: `src/app/api/admin/logs/route.ts::GET`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: ADMIN_API_STATS

- **What**: 플랫폼 통계 API
- **Evidence**:
  - code: `src/app/api/admin/stats/route.ts::GET`

### Contract: ADMIN_API_USAGE_ANALYSIS

- **What**: 사용량 분석 API
- **Evidence**:
  - code: `src/app/api/admin/usage/analysis/route.ts::GET`

### Contract: ADMIN_API_USAGE_RESET

- **What**: 사용량 데이터 초기화 API
- **Evidence**:
  - code: `src/app/api/admin/usage/reset/route.ts::POST`

### Contract: ADMIN_API_USAGE_DEBUG

- **What**: 사용량 디버그 API
- **Evidence**:
  - code: `src/app/api/admin/usage/debug/route.ts::GET`

### Contract: ADMIN_API_OCI_METRICS

- **What**: Oracle Cloud 메트릭 조회 API
- **Evidence**:
  - code: `src/app/api/admin/oci-metrics/route.ts::GET`

<!-- FUNCTIONAL:END -->

---

## 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/admin/spaces` | 전체 공간 목록 |
| GET | `/api/admin/logs` | 이벤트 로그 |
| GET | `/api/admin/stats` | 플랫폼 통계 |
| GET | `/api/admin/usage/analysis` | 사용량 분석 |
| POST | `/api/admin/usage/reset` | 사용량 초기화 |
| GET | `/api/admin/usage/debug` | 사용량 디버그 |
| GET | `/api/admin/oci-metrics` | OCI 메트릭 |

---

## 권한

모든 API는 **SuperAdmin 권한** 필요
- `src/lib/space-auth.ts::isSuperAdmin` 검증

---

## 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-22 | 사용량 분석 API: 상관계수 계산 period별 hoursPerRecord 적용 | `b506af6` |
| 2026-01-22 | 사용량 분석 UI: 비정상 값 경고 배지 추가 | `b506af6` |
| 2026-01-21 | DocOps Phase 2 초기 작성 | - |
